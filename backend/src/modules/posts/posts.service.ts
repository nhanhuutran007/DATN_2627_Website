import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { COMMENTABLE_STATUSES, sanitizeCommentContent } from "../comments/comments.service";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { COUNTED_DONATION_STATUSES, Donation } from "../donations/entities/donation.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { OrgPermission } from "../organizations/entities/organization-member.entity";
import { OrganizationAccessService } from "../organizations/organization-access.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreatePostDto,
  PostLikeState,
  PostListQueryDto,
  PostPage,
  PostView,
  UpdatePostDto,
} from "./dto/post.dto";
import { CampaignPostLike } from "./entities/campaign-post-like.entity";
import { CampaignPost, PostVisibility } from "./entities/campaign-post.entity";

const DEFAULT_LIMIT = 10;

/** Quyền xem của một người với một chiến dịch, tính một lần cho cả trang bài. */
type Viewer = { user: User | null; canManage: boolean; isBacker: boolean };

/**
 * Bài cập nhật dự án (kiểu "Updates" của Kickstarter). Chỉ chủ dự án (hoặc admin)
 * đăng/sửa/xóa; bài "chỉ người ủng hộ" vẫn hiện tiêu đề cho mọi người nhưng ẩn nội
 * dung với người chưa ủng hộ. Đăng bài thì báo cho người ủng hộ (và người theo dõi
 * nếu bài công khai).
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(CampaignPost)
    private readonly postRepo: Repository<CampaignPost>,
    @InjectRepository(CampaignPostLike)
    private readonly likeRepo: Repository<CampaignPostLike>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    // Kiểu `X | null` làm metadata thành Object: phải chỉ rõ token, nếu không Nest âm thầm inject null.
    @Inject(OrganizationAccessService)
    private readonly access: OrganizationAccessService | null = null,
  ) {}

  async listForCampaign(campaignId: string, query: PostListQueryDto, user: User | null): Promise<PostPage> {
    const campaign = await this.getCampaign(campaignId);
    const viewer = await this.viewerFor(campaign, user);
    this.assertVisible(campaign, viewer);
    const offset = query.offset ?? 0;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [posts, total] = await this.postRepo.findAndCount({
      where: { campaignId },
      order: { number: "DESC" },
      skip: offset,
      take: limit,
    });
    const liked = await this.likedIds(posts, user);
    return { items: posts.map((post) => this.toView(post, viewer, liked)), total, offset, limit };
  }

  async findOne(id: string, user: User | null): Promise<PostView> {
    const post = await this.getPost(id);
    const campaign = await this.getCampaign(post.campaignId);
    const viewer = await this.viewerFor(campaign, user);
    this.assertVisible(campaign, viewer);
    return this.toView(post, viewer, await this.likedIds([post], user));
  }

  async create(campaignId: string, dto: CreatePostDto, user: User): Promise<PostView> {
    const campaign = await this.getCampaign(campaignId);
    await this.assertCanManage(campaign, user);
    if (!COMMENTABLE_STATUSES.includes(campaign.status)) {
      throw new ConflictException("Chỉ đăng bài cập nhật cho chiến dịch đã được công khai.");
    }
    const visibility = dto.visibility ?? PostVisibility.PUBLIC;
    const saved = await this.insertNumbered(campaign.id, {
      campaignId: campaign.id,
      authorId: user.id,
      title: dto.title.trim(),
      content: sanitizeCommentContent(dto.content),
      imageUrl: dto.imageUrl || null,
      visibility,
      likeCount: 0,
    });
    await this.auditService.record({
      userId: user.id,
      action: "campaign_post.create",
      entity: "campaign_post",
      entityId: saved.id,
      newValues: { campaignId, number: saved.number, title: saved.title, visibility, content: truncateForAudit(saved.content) },
    });
    await this.announce(campaign, saved);
    return this.toView(saved, { user, canManage: true, isBacker: false }, new Set());
  }

  async update(id: string, dto: UpdatePostDto, user: User): Promise<PostView> {
    const post = await this.getPost(id);
    const campaign = await this.getCampaign(post.campaignId);
    await this.assertCanManage(campaign, user);
    const before = { title: post.title, visibility: post.visibility, imageUrl: post.imageUrl ?? null, content: truncateForAudit(post.content) };
    if (dto.title !== undefined) post.title = dto.title.trim();
    if (dto.content !== undefined) post.content = sanitizeCommentContent(dto.content);
    if (dto.imageUrl !== undefined) post.imageUrl = dto.imageUrl || null;
    if (dto.visibility !== undefined) post.visibility = dto.visibility;
    post.editedAt = new Date();
    const saved = await this.postRepo.save(post);
    await this.auditService.record({
      userId: user.id,
      action: "campaign_post.update",
      entity: "campaign_post",
      entityId: saved.id,
      oldValues: before,
      newValues: { title: saved.title, visibility: saved.visibility, imageUrl: saved.imageUrl ?? null, content: truncateForAudit(saved.content) },
    });
    return this.toView(saved, { user, canManage: true, isBacker: false }, await this.likedIds([saved], user));
  }

  async remove(id: string, user: User): Promise<void> {
    const post = await this.getPost(id);
    const campaign = await this.getCampaign(post.campaignId);
    await this.assertCanManage(campaign, user);
    await this.postRepo.delete({ id: post.id });
    await this.auditService.record({
      userId: user.id,
      action: "campaign_post.delete",
      entity: "campaign_post",
      entityId: post.id,
      oldValues: { campaignId: post.campaignId, number: post.number, title: post.title, content: truncateForAudit(post.content) },
    });
  }

  async like(id: string, user: User): Promise<PostLikeState> {
    const post = await this.getPost(id);
    const campaign = await this.getCampaign(post.campaignId);
    const viewer = await this.viewerFor(campaign, user);
    this.assertVisible(campaign, viewer);
    if (this.isLocked(post, viewer)) {
      throw new ForbiddenException("Bài này chỉ dành cho người ủng hộ.");
    }
    await this.likeRepo
      .createQueryBuilder()
      .insert()
      .into(CampaignPostLike)
      .values({ postId: post.id, userId: user.id })
      .orIgnore()
      .execute();
    return { liked: true, likeCount: await this.syncLikeCount(post.id) };
  }

  async unlike(id: string, user: User): Promise<PostLikeState> {
    const post = await this.getPost(id);
    await this.likeRepo.delete({ postId: post.id, userId: user.id });
    return { liked: false, likeCount: await this.syncLikeCount(post.id) };
  }

  /**
   * Gán số "Cập nhật #N" kế tiếp. Hai bài đăng cùng lúc có thể lấy trùng số → ràng
   * buộc UNIQUE(campaign, number) chặn, thử lại với số mới.
   */
  private async insertNumbered(campaignId: string, data: Partial<CampaignPost>): Promise<CampaignPost> {
    for (let attempt = 0; ; attempt += 1) {
      const max = await this.postRepo.maximum("number", { campaignId });
      try {
        return await this.postRepo.save(this.postRepo.create({ ...data, number: (max ?? 0) + 1 }));
      } catch (error) {
        const duplicate = error instanceof QueryFailedError && /Duplicate|ER_DUP_ENTRY/i.test(error.message);
        if (!duplicate || attempt >= 2) throw error;
      }
    }
  }

  private async announce(campaign: Campaign, post: CampaignPost): Promise<void> {
    const base = {
      type: NotificationType.PROGRESS_UPDATE,
      title: `Cập nhật #${post.number}: ${post.title}`,
      message: `Chiến dịch "${campaign.title}" vừa đăng bài cập nhật mới${post.visibility === PostVisibility.BACKERS ? " dành riêng cho người ủng hộ" : ""}.`,
      link: `/du-an/${campaign.id}#cap-nhat`,
      relatedId: post.id,
    };
    if (post.visibility === PostVisibility.PUBLIC) {
      await this.notificationsService.notifyCampaignBackers(campaign.id, base, [campaign.ownerId]);
      return;
    }
    // Bài riêng: người theo dõi chưa ủng hộ không đọc được nên chỉ báo người ủng hộ.
    const backers = await this.donationRepo
      .createQueryBuilder("d")
      .select("DISTINCT d.user_id", "userId")
      .where("d.campaign_id = :campaignId", { campaignId: campaign.id })
      .andWhere("d.status IN (:...statuses)", { statuses: COUNTED_DONATION_STATUSES })
      .getRawMany<{ userId: string }>();
    const userIds = backers.map((row) => row.userId).filter((id) => id && id !== campaign.ownerId);
    if (userIds.length > 0) {
      await this.notificationsService.notify(userIds.map((userId) => ({ ...base, userId })));
    }
  }

  private async syncLikeCount(postId: string): Promise<number> {
    const count = await this.likeRepo.count({ where: { postId } });
    await this.postRepo.update({ id: postId }, { likeCount: count });
    return count;
  }

  private async likedIds(posts: CampaignPost[], user: User | null): Promise<Set<string>> {
    if (!user || posts.length === 0) return new Set();
    const likes = await this.likeRepo.find({
      select: { postId: true },
      where: { userId: user.id, postId: In(posts.map((post) => post.id)) },
    });
    return new Set(likes.map((like) => like.postId));
  }

  private async viewerFor(campaign: Campaign, user: User | null): Promise<Viewer> {
    if (!user) return { user: null, canManage: false, isBacker: false };
    const canManage = await this.canManage(campaign, user);
    const isBacker =
      !canManage &&
      (await this.donationRepo.exists({
        where: { campaignId: campaign.id, userId: user.id, status: In([...COUNTED_DONATION_STATUSES]) },
      }));
    return { user, canManage, isBacker };
  }

  private isLocked(post: CampaignPost, viewer: Viewer): boolean {
    return post.visibility === PostVisibility.BACKERS && !viewer.canManage && !viewer.isBacker;
  }

  private toView(post: CampaignPost, viewer: Viewer, liked: Set<string>): PostView {
    const locked = this.isLocked(post, viewer);
    return {
      id: post.id,
      campaignId: post.campaignId,
      number: post.number,
      title: post.title,
      content: locked ? null : post.content,
      imageUrl: locked ? null : (post.imageUrl ?? null),
      visibility: post.visibility,
      locked,
      likeCount: post.likeCount,
      liked: liked.has(post.id),
      createdAt: post.createdAt,
      editedAt: post.editedAt ?? null,
    };
  }

  /** Chiến dịch chưa công khai (nháp, chờ duyệt…) chỉ chủ dự án/admin xem được bài. */
  private assertVisible(campaign: Campaign, viewer: Viewer): void {
    if (!viewer.canManage && !COMMENTABLE_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }
  }

  /** Chủ dự án, admin, hoặc đội ngũ tổ chức có quyền "Đăng bài cập nhật". */
  private canManage(campaign: Campaign, user: User): Promise<boolean> {
    if (this.access) return this.access.canOnCampaign(campaign, user, OrgPermission.POST_UPDATES);
    return Promise.resolve(campaign.ownerId === user.id || user.role === UserRole.ADMIN);
  }

  private async assertCanManage(campaign: Campaign, user: User): Promise<void> {
    if (!(await this.canManage(campaign, user))) {
      throw new ForbiddenException("Bạn không có quyền quản lý bài cập nhật của chiến dịch này.");
    }
  }

  private async getCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  private async getPost(id: string): Promise<CampaignPost> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException("Không tìm thấy bài cập nhật.");
    return post;
  }
}
