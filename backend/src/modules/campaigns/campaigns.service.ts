import {
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
];

const EDITABLE_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.PENDING,
  CampaignStatus.REJECTED,
];

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

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ForbiddenException(
        "Only draft campaigns can be edited while waiting for approval",
      );
    }

    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async submitForReview(id: string, currentUser: User): Promise<Campaign> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);

    if (!EDITABLE_STATUSES.includes(campaign.status)) {
      throw new ForbiddenException(
        "Only draft or rejected campaigns can be submitted for review",
      );
    }

    campaign.status = CampaignStatus.PENDING;
    campaign.rejectionReason = undefined;
    return this.campaignRepo.save(campaign);
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
    campaign.status = dto.status;
    campaign.rejectionReason =
      dto.status === CampaignStatus.REJECTED ? dto.reason : undefined;
    return this.campaignRepo.save(campaign);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);
    await this.campaignRepo.remove(campaign);
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