import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, In, IsNull, Like, Not, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService, type NotifyInput } from "../notifications/notifications.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  AdminCommentQueryDto,
  CommentListQueryDto,
  CommentThreadPage,
  CommentView,
  CreateCommentDto,
} from "./dto/comment.dto";
import { CampaignComment, CommentKind, CommentStatus } from "./entities/campaign-comment.entity";
import { Report, ReportStatus } from "../moderation/entities/report.entity";

/** Bình luận được trên chiến dịch đã công khai (người dùng nhìn thấy được). */
export const COMMENTABLE_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

const EXCERPT = 120;

/** Bỏ ký tự điều khiển (trừ xuống dòng/tab), gộp nhiều dòng trống liên tiếp. */
export function sanitizeCommentContent(content: string): string {
  return content
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function excerpt(content: string): string {
  return content.length > EXCERPT ? `${content.slice(0, EXCERPT)}…` : content;
}

const OPEN_REPORT_STATUSES = [ReportStatus.PENDING, ReportStatus.REVIEWING];

/** Ngữ cảnh kiểm duyệt gắn thêm vào bình luận (giữ nguyên instance entity để serializer vẫn ẩn trường nhạy cảm của User). */
export type AdminCommentView = CampaignComment & {
  /** Số báo cáo vi phạm chưa xử lý nhắm vào bình luận này. */
  openReportCount: number;
  /** Bình luận gốc mà câu trả lời này đáp lại. */
  parent: { id: string; content: string; authorName: string | null } | null;
  /** Chỉ với câu hỏi gốc: chủ dự án đã trả lời (còn hiển thị) hay chưa. */
  ownerReplied: boolean | null;
};

export type AdminCommentList = {
  items: AdminCommentView[];
  total: number;
  offset: number;
  limit: number;
};

/**
 * Bình luận / hỏi đáp trên trang chiến dịch. Người dùng chỉ xóa (mềm) bình
 * luận của mình; admin ẩn/hiện kèm lý do và audit. Hệ thống không tự ẩn theo
 * số báo cáo (human-in-the-loop).
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CampaignComment)
    private readonly commentRepo: Repository<CampaignComment>,
    private readonly campaignsService: CampaignsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {}

  private async getPublicCampaign(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignsService.findById(campaignId);
    if (!COMMENTABLE_STATUSES.includes(campaign.status)) {
      // Không tiết lộ chiến dịch chưa công khai.
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  private toView(comment: CampaignComment, ownerId: string, replies: CommentView[] = []): CommentView {
    return {
      id: comment.id,
      kind: comment.kind,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.userId,
        name: comment.user?.name ?? "Người dùng",
        avatar: comment.user?.avatar ?? null,
      },
      isOwner: comment.userId === ownerId,
      replies,
    };
  }

  /** Luồng bình luận công khai: bình luận gốc mới nhất trước, trả lời theo thứ tự thời gian. */
  async listForCampaign(campaignId: string, query: CommentListQueryDto): Promise<CommentThreadPage> {
    const campaign = await this.getPublicCampaign(campaignId);
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const [roots, total] = await this.commentRepo.findAndCount({
      where: { campaignId, parentId: IsNull(), status: CommentStatus.VISIBLE },
      relations: { user: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    const replies = roots.length
      ? await this.commentRepo.find({
          where: { parentId: In(roots.map((r) => r.id)), status: CommentStatus.VISIBLE },
          relations: { user: true },
          order: { createdAt: "ASC" },
        })
      : [];
    const byParent = new Map<string, CommentView[]>();
    for (const reply of replies) {
      const list = byParent.get(reply.parentId as string) ?? [];
      list.push(this.toView(reply, campaign.ownerId));
      byParent.set(reply.parentId as string, list);
    }
    return {
      items: roots.map((root) => this.toView(root, campaign.ownerId, byParent.get(root.id) ?? [])),
      total,
      offset,
      limit,
    };
  }

  async create(campaignId: string, dto: CreateCommentDto, user: User): Promise<CommentView> {
    const campaign = await this.getPublicCampaign(campaignId);
    const content = sanitizeCommentContent(dto.content);
    if (content.length < 2) {
      throw new BadRequestException("Nội dung cần ít nhất 2 ký tự.");
    }

    let parent: CampaignComment | null = null;
    if (dto.parentId) {
      parent = await this.commentRepo.findOne({ where: { id: dto.parentId } });
      if (!parent || parent.campaignId !== campaignId || parent.status !== CommentStatus.VISIBLE) {
        throw new NotFoundException("Comment not found");
      }
      if (parent.parentId) {
        throw new BadRequestException("Chỉ trả lời được bình luận gốc.");
      }
    }

    const saved = await this.commentRepo.save(
      this.commentRepo.create({
        campaignId,
        userId: user.id,
        parentId: parent?.id ?? null,
        kind: parent ? CommentKind.COMMENT : (dto.kind ?? CommentKind.COMMENT),
        content,
        status: CommentStatus.VISIBLE,
      }),
    );
    saved.user = user;

    await this.notifyNewComment(campaign, saved, parent, user);
    return this.toView(saved, campaign.ownerId);
  }

  private async notifyNewComment(
    campaign: Campaign,
    comment: CampaignComment,
    parent: CampaignComment | null,
    author: User,
  ): Promise<void> {
    const link = `/du-an/${campaign.id}#hoi-dap`;
    const notices: NotifyInput[] = [];
    if (parent && parent.userId !== author.id) {
      notices.push({
        userId: parent.userId,
        type: NotificationType.COMMENT_REPLY,
        title: comment.userId === campaign.ownerId ? "Chủ dự án đã trả lời bạn" : "Có người trả lời bình luận của bạn",
        message: `${author.name} trả lời trong chiến dịch "${campaign.title}": ${excerpt(comment.content)}`,
        link,
        relatedId: comment.id,
      });
    }
    if (campaign.ownerId !== author.id && campaign.ownerId !== parent?.userId) {
      const isQuestion = comment.kind === CommentKind.QUESTION;
      notices.push({
        userId: campaign.ownerId,
        type: NotificationType.COMMENT_NEW,
        title: isQuestion ? "Có câu hỏi mới về chiến dịch" : "Có bình luận mới về chiến dịch",
        message: `${author.name} trong chiến dịch "${campaign.title}": ${excerpt(comment.content)}`,
        link,
        relatedId: comment.id,
      });
    }
    await this.notificationsService.notify(notices);
  }

  /** Xóa mềm: tác giả xóa bình luận của mình, admin xóa bất kỳ (có audit). */
  async remove(id: string, user: User): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    const isAdmin = user.role === UserRole.ADMIN;
    if (comment.userId !== user.id && !isAdmin) {
      throw new ForbiddenException("Bạn chỉ xóa được bình luận của mình.");
    }
    await this.commentRepo.softDelete({ id });
    await this.auditService.record({
      userId: user.id,
      action: "comment.delete",
      entity: "campaign_comment",
      entityId: id,
      oldValues: { content: truncateForAudit(comment.content), authorId: comment.userId },
      newValues: { byAdmin: isAdmin && comment.userId !== user.id },
    });
  }

  /** Tìm bình luận của một chiến dịch (cho báo cáo vi phạm). */
  async findForReport(commentId: string, campaignId: string): Promise<CampaignComment> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment || comment.campaignId !== campaignId || comment.status !== CommentStatus.VISIBLE) {
      throw new NotFoundException("Comment not found");
    }
    return comment;
  }

  async adminList(query: AdminCommentQueryDto): Promise<AdminCommentList> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    let reportedIds: string[] | undefined;
    if (query.reported) {
      const open = await this.reportRepo.find({
        where: { commentId: Not(IsNull()), status: In(OPEN_REPORT_STATUSES) },
        select: { commentId: true },
      });
      reportedIds = [...new Set(open.map((report) => report.commentId as string))];
      if (reportedIds.length === 0) return { items: [], total: 0, offset, limit };
    }
    const base: FindOptionsWhere<CampaignComment> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.level ? { parentId: query.level === "reply" ? Not(IsNull()) : IsNull() } : {}),
      ...(reportedIds ? { id: In(reportedIds) } : {}),
    };
    const like = query.q ? Like(`%${query.q}%`) : undefined;
    const where: FindOptionsWhere<CampaignComment> | FindOptionsWhere<CampaignComment>[] = like
      ? [
          { ...base, content: like },
          { ...base, user: { name: like } },
          { ...base, user: { email: like } },
          { ...base, campaign: { title: like } },
        ]
      : base;
    const [items, total] = await this.commentRepo.findAndCount({
      where,
      relations: { user: true, campaign: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items: await this.withModerationContext(items), total, offset, limit };
  }

  /** Gắn số báo cáo đang mở, bình luận gốc (với câu trả lời) và trạng thái đã trả lời (với câu hỏi). */
  private async withModerationContext(items: CampaignComment[]): Promise<AdminCommentView[]> {
    if (items.length === 0) return [];
    const ids = items.map((comment) => comment.id);
    const parentIds = [...new Set(items.map((comment) => comment.parentId).filter((id): id is string => Boolean(id)))];
    const questionIds = items
      .filter((comment) => comment.kind === CommentKind.QUESTION && !comment.parentId)
      .map((comment) => comment.id);

    const [reports, parents, replies] = await Promise.all([
      this.reportRepo.find({
        where: { commentId: In(ids), status: In(OPEN_REPORT_STATUSES) },
        select: { commentId: true },
      }),
      parentIds.length > 0
        ? this.commentRepo.find({ where: { id: In(parentIds) }, relations: { user: true } })
        : Promise.resolve([]),
      questionIds.length > 0
        ? this.commentRepo.find({
            where: { parentId: In(questionIds), status: CommentStatus.VISIBLE },
            select: { parentId: true, userId: true },
          })
        : Promise.resolve([]),
    ]);

    const reportCount = new Map<string, number>();
    for (const report of reports) {
      if (report.commentId) reportCount.set(report.commentId, (reportCount.get(report.commentId) ?? 0) + 1);
    }
    const parentById = new Map(parents.map((parent) => [parent.id, parent]));

    return items.map((comment) => {
      const parent = comment.parentId ? parentById.get(comment.parentId) : undefined;
      const isQuestion = questionIds.includes(comment.id);
      const ownerId = comment.campaign?.ownerId;
      return Object.assign(comment, {
        openReportCount: reportCount.get(comment.id) ?? 0,
        parent: parent
          ? { id: parent.id, content: excerpt(parent.content), authorName: parent.user?.name ?? null }
          : null,
        ownerReplied: isQuestion
          ? replies.some((reply) => reply.parentId === comment.id && reply.userId === ownerId)
          : null,
      });
    });
  }

  async hide(id: string, reason: string, admin: User): Promise<CampaignComment> {
    const comment = await this.commentRepo.findOne({ where: { id }, relations: { campaign: true } });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    if (comment.status === CommentStatus.HIDDEN) {
      throw new ConflictException("Bình luận đã bị ẩn.");
    }
    comment.status = CommentStatus.HIDDEN;
    comment.hiddenReason = reason;
    comment.hiddenBy = admin.id;
    comment.hiddenAt = new Date();
    const saved = await this.commentRepo.save(comment);
    await this.auditService.record({
      userId: admin.id,
      action: "comment.hide",
      entity: "campaign_comment",
      entityId: id,
      oldValues: { status: CommentStatus.VISIBLE },
      newValues: { status: CommentStatus.HIDDEN, reason, content: truncateForAudit(comment.content) },
    });
    await this.notificationsService.notify({
      userId: comment.userId,
      type: NotificationType.COMMENT_HIDDEN,
      title: "Bình luận của bạn đã bị ẩn",
      message: `Bình luận trong chiến dịch "${comment.campaign?.title ?? ""}" đã bị quản trị viên ẩn. Lý do: ${reason}`,
      link: `/du-an/${comment.campaignId}`,
      relatedId: id,
    });
    return saved;
  }

  async unhide(id: string, admin: User): Promise<CampaignComment> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    if (comment.status === CommentStatus.VISIBLE) {
      throw new ConflictException("Bình luận đang hiển thị.");
    }
    const previousReason = comment.hiddenReason ?? null;
    comment.status = CommentStatus.VISIBLE;
    comment.hiddenReason = null;
    comment.hiddenBy = null;
    comment.hiddenAt = null;
    const saved = await this.commentRepo.save(comment);
    await this.auditService.record({
      userId: admin.id,
      action: "comment.unhide",
      entity: "campaign_comment",
      entityId: id,
      oldValues: { status: CommentStatus.HIDDEN, reason: previousReason },
      newValues: { status: CommentStatus.VISIBLE },
    });
    return saved;
  }
}
