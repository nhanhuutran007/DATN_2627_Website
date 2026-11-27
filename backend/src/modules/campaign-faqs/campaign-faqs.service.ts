import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { OrgPermission } from "../organizations/entities/organization-member.entity";
import { OrganizationAccessService } from "../organizations/organization-access.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CampaignFaqView,
  CreateCampaignFaqDto,
  MAX_FAQS_PER_CAMPAIGN,
  UpdateCampaignFaqDto,
} from "./dto/campaign-faq.dto";
import { CampaignFaq } from "./entities/campaign-faq.entity";

/** Dự án đã công khai: ai cũng xem được FAQ. */
const PUBLIC_STATUSES = [
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

/** Đã kết thúc hoặc bị hủy: không thêm/sửa FAQ nữa (FAQ cũ vẫn hiển thị). */
const CLOSED_STATUSES = [CampaignStatus.SUCCESS, CampaignStatus.FAILED, CampaignStatus.CANCELLED, CampaignStatus.ENDED];

export function toFaqView(faq: CampaignFaq): CampaignFaqView {
  return {
    id: faq.id,
    campaignId: faq.campaignId,
    question: faq.question,
    answer: faq.answer,
    sortOrder: faq.sortOrder,
    updatedAt: faq.updatedAt,
  };
}

/**
 * Câu hỏi thường gặp của từng dự án (như Kickstarter): chủ dự án (hoặc cộng tác viên có quyền đăng
 * cập nhật) tự nhập từng câu hỏi – câu trả lời, sửa/bổ sung bất kỳ lúc nào khi dự án chưa kết thúc.
 */
@Injectable()
export class CampaignFaqsService {
  constructor(
    @InjectRepository(CampaignFaq)
    private readonly faqRepo: Repository<CampaignFaq>,
    private readonly campaignsService: CampaignsService,
    private readonly auditService: AuditService,
    @Optional()
    // Kiểu `X | null` làm metadata thành Object: phải chỉ rõ token, nếu không Nest âm thầm inject null.
    @Inject(OrganizationAccessService)
    private readonly access: OrganizationAccessService | null = null,
  ) {}

  /** Công khai: FAQ của dự án đã công khai. */
  async listPublic(campaignId: string): Promise<CampaignFaqView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    if (!PUBLIC_STATUSES.includes(campaign.status)) throw new NotFoundException("Campaign not found");
    return this.list(campaignId);
  }

  /** Chủ dự án/cộng tác viên/admin: FAQ ở mọi trạng thái (kể cả bản nháp). */
  async listForManage(campaignId: string, user: User): Promise<CampaignFaqView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    await this.assertCanManage(campaign, user);
    return this.list(campaignId);
  }

  async create(campaignId: string, dto: CreateCampaignFaqDto, user: User): Promise<CampaignFaqView> {
    const campaign = await this.campaignsService.findById(campaignId);
    await this.assertCanManage(campaign, user);
    this.assertOpen(campaign);
    const count = await this.faqRepo.count({ where: { campaignId } });
    if (count >= MAX_FAQS_PER_CAMPAIGN) {
      throw new BadRequestException(`Tối đa ${MAX_FAQS_PER_CAMPAIGN} câu hỏi mỗi dự án.`);
    }
    const saved = await this.faqRepo.save(
      this.faqRepo.create({ campaignId, question: dto.question, answer: dto.answer, sortOrder: dto.sortOrder ?? count }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "campaign_faq.create",
      entity: "campaign_faq",
      entityId: saved.id,
      newValues: { campaignId, question: saved.question },
    });
    return toFaqView(saved);
  }

  async update(id: string, dto: UpdateCampaignFaqDto, user: User): Promise<CampaignFaqView> {
    const faq = await this.getFaq(id);
    const campaign = await this.campaignsService.findById(faq.campaignId);
    await this.assertCanManage(campaign, user);
    this.assertOpen(campaign);
    const before = faq.question;
    if (dto.question !== undefined) faq.question = dto.question;
    if (dto.answer !== undefined) faq.answer = dto.answer;
    if (dto.sortOrder !== undefined) faq.sortOrder = dto.sortOrder;
    const saved = await this.faqRepo.save(faq);
    await this.auditService.record({
      userId: user.id,
      action: "campaign_faq.update",
      entity: "campaign_faq",
      entityId: id,
      oldValues: { question: before },
      newValues: { question: saved.question },
    });
    return toFaqView(saved);
  }

  async remove(id: string, user: User): Promise<void> {
    const faq = await this.getFaq(id);
    const campaign = await this.campaignsService.findById(faq.campaignId);
    await this.assertCanManage(campaign, user);
    this.assertOpen(campaign);
    await this.faqRepo.delete({ id });
    await this.auditService.record({
      userId: user.id,
      action: "campaign_faq.delete",
      entity: "campaign_faq",
      entityId: id,
      oldValues: { campaignId: faq.campaignId, question: faq.question },
    });
  }

  private async list(campaignId: string): Promise<CampaignFaqView[]> {
    const rows = await this.faqRepo.find({ where: { campaignId }, order: { sortOrder: "ASC", createdAt: "ASC" } });
    return rows.map(toFaqView);
  }

  private assertOpen(campaign: Campaign): void {
    if (CLOSED_STATUSES.includes(campaign.status)) {
      throw new ConflictException("Dự án đã kết thúc, không thêm hoặc sửa câu hỏi thường gặp được.");
    }
  }

  private async assertCanManage(campaign: Campaign, user: User): Promise<void> {
    const message = "Bạn không có quyền quản lý câu hỏi thường gặp của dự án này.";
    if (this.access) {
      await this.access.assertCanOnCampaign(campaign, user, OrgPermission.POST_UPDATES, message);
      return;
    }
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) throw new ForbiddenException(message);
  }

  private async getFaq(id: string): Promise<CampaignFaq> {
    const faq = await this.faqRepo.findOne({ where: { id } });
    if (!faq) throw new NotFoundException("FAQ not found");
    return faq;
  }
}
