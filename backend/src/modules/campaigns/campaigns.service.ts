import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  Like,
  Repository,
} from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

const PUBLIC_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

const OWNER_EDITABLE_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.REJECTED,
  CampaignStatus.NEEDS_INFO,
];

const SUBMITTABLE_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.REJECTED,
  CampaignStatus.NEEDS_INFO,
];

/**
 * Ma trận chuyển trạng thái cho phép khi admin duyệt (`moderate`), theo vòng đời
 * README: draft → pending ⇄ needs_info → approved → active → (paused ⇄ active)
 * → success | failed → ended; từ pending có thể rejected. Chuyển ngoài bảng này
 * bị từ chối, kể cả khi status đích hợp lệ theo DTO.
 */
const MODERATE_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [],
  [CampaignStatus.PENDING]: [
    CampaignStatus.APPROVED,
    CampaignStatus.REJECTED,
    CampaignStatus.NEEDS_INFO,
  ],
  [CampaignStatus.APPROVED]: [CampaignStatus.ACTIVE],
  [CampaignStatus.REJECTED]: [],
  [CampaignStatus.NEEDS_INFO]: [],
  [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.ENDED],
  [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE],
  [CampaignStatus.SUCCESS]: [CampaignStatus.ENDED],
  [CampaignStatus.FAILED]: [CampaignStatus.ENDED],
  [CampaignStatus.CANCELLED]: [],
  [CampaignStatus.ENDED]: [],
};

export type CampaignListResult = {
  items: Campaign[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: CampaignQueryDto,
    ownerId?: string,
  ): Promise<CampaignListResult> {
    const limit = query.limit ?? 9;
    const offset = query.offset ?? 0;

    const base: FindOptionsWhere<Campaign> = ownerId
      ? { ownerId, ...(query.status ? { status: query.status } : {}) }
      : {
          status: In(query.status ? [query.status] : PUBLIC_STATUSES),
          ...(query.category ? { category: query.category } : {}),
        };

    const q = query.q?.trim();
    let where: FindOptionsWhere<Campaign> | FindOptionsWhere<Campaign>[];
    if (q) {
      const like = `%${q}%`;
      where = [
        { ...base, title: Like(like) },
        { ...base, description: Like(like) },
        { ...base, location: Like(like) },
      ];
    } else {
      where = base;
    }

    const order = this.getOrder(query.sort);
    const [items, total] = await Promise.all([
      this.campaignRepo.find({
        where,
        relations: { owner: true, milestones: true },
        order,
        skip: offset,
        take: limit,
      }),
      this.campaignRepo.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: { owner: true, milestones: true },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  async create(dto: CreateCampaignDto, owner: User): Promise<Campaign> {
    const campaign = this.campaignRepo.create({
      title: dto.title,
      description: dto.description,
      category: dto.category,
      ownerId: owner.id,
      goalAmount: dto.goalAmount,
      currentAmount: 0,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: new Date(dto.endDate),
      status: CampaignStatus.DRAFT,
      imageUrl: dto.imageUrl,
      location: dto.location,
      backerCount: 0,
      viewCount: 0,
    });
    return this.campaignRepo.save(campaign);
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
    currentUser: User,
  ): Promise<Campaign> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);

    if (!OWNER_EDITABLE_STATUSES.includes(campaign.status)) {
      throw new ForbiddenException(
        "Only draft, rejected or needs-info campaigns can be edited before approval",
      );
    }

    const current = campaign as unknown as Record<string, unknown>;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(dto)) {
      oldValues[field] = truncateForAudit(current[field]);
      newValues[field] = truncateForAudit(value);
    }

    Object.assign(campaign, dto);
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.update",
      entity: "campaign",
      entityId: saved.id,
      oldValues,
      newValues,
    });
    return saved;
  }

  async submitForReview(id: string, currentUser: User): Promise<Campaign> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);

    if (!SUBMITTABLE_STATUSES.includes(campaign.status)) {
      throw new ForbiddenException(
        "Only draft, rejected or needs-info campaigns can be submitted for review",
      );
    }

    const previousStatus = campaign.status;
    campaign.status = CampaignStatus.PENDING;
    campaign.rejectionReason = undefined;
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.submit",
      entity: "campaign",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status },
    });
    return saved;
  }

  async moderate(
    id: string,
    dto: ModerateCampaignDto,
    currentUser: User,
  ): Promise<Campaign> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can moderate campaigns");
    }

    const campaign = await this.findById(id);

    if (!MODERATE_TRANSITIONS[campaign.status].includes(dto.status)) {
      throw new ConflictException(
        `Cannot move campaign from "${campaign.status}" to "${dto.status}"`,
      );
    }

    const needsReason = [
      CampaignStatus.REJECTED,
      CampaignStatus.NEEDS_INFO,
      CampaignStatus.PAUSED,
    ].includes(dto.status);

    if (needsReason && !dto.reason?.trim()) {
      throw new BadRequestException(
        "A reason is required for rejected, needs-info or paused campaigns",
      );
    }

    const previous = {
      status: campaign.status,
      rejectionReason: campaign.rejectionReason ?? null,
    };
    campaign.status = dto.status;
    campaign.rejectionReason = needsReason ? dto.reason : undefined;
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.moderate",
      entity: "campaign",
      entityId: saved.id,
      oldValues: previous,
      newValues: {
        status: saved.status,
        rejectionReason: saved.rejectionReason ?? null,
      },
    });
    return saved;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);
    const snapshot = {
      title: campaign.title,
      status: campaign.status,
      ownerId: campaign.ownerId,
      goalAmount: campaign.goalAmount,
    };
    const campaignId = campaign.id;
    await this.campaignRepo.remove(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.delete",
      entity: "campaign",
      entityId: campaignId,
      oldValues: snapshot,
    });
  }

  private assertCanManage(campaign: Campaign, user: User): void {
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only manage your own campaigns");
    }
  }

  private getOrder(sort?: string): FindOptionsOrder<Campaign> {
    switch (sort) {
      case "ending":
        return { endDate: "ASC" };
      case "progress":
        return { currentAmount: "DESC" };
      case "newest":
      case "latest":
        return { createdAt: "DESC" };
      case "popular":
      default:
        return { backerCount: "DESC" };
    }
  }
}