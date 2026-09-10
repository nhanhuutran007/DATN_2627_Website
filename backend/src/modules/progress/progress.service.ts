import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreateMilestoneDto,
  CreateMilestoneUpdateDto,
  MilestoneQueryDto,
  UpdateMilestoneDto,
} from "./dto/progress.dto";
import { Milestone } from "./entities/milestone.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";

const LOCKED_STATUSES = [
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.CANCELLED,
  CampaignStatus.ENDED,
];

export type CampaignProgressResult = {
  totalMilestones: number;
  completedMilestones: number;
  totalBudget: number;
  totalExpense: number;
  totalRaised: number;
  backerCount: number;
};

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(MilestoneUpdate)
    private readonly milestoneUpdateRepo: Repository<MilestoneUpdate>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
  ) {}

  async findCampaignMilestones(
    campaignId: string,
    query: MilestoneQueryDto = {},
  ): Promise<{ items: Milestone[]; total: number }> {
    const [items, total] = await Promise.all([
      this.milestoneRepo.find({
        where: { campaignId },
        order: { sortOrder: "ASC", createdAt: "ASC" },
        skip: query.offset ?? 0,
        take: query.limit ?? 100,
      }),
      this.milestoneRepo.count({ where: { campaignId } }),
    ]);
    return { items, total };
  }

  async createMilestone(
    campaignId: string,
    dto: CreateMilestoneDto,
    user: User,
  ): Promise<Milestone> {
    const campaign = await this.getCampaign(campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(campaignId));
    const milestone = this.milestoneRepo.create({
      campaignId,
      title: dto.title,
      description: dto.description,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      budget: dto.budget,
      sortOrder,
      isCompleted: false,
    });
    return this.milestoneRepo.save(milestone);
  }

  async updateMilestone(
    id: string,
    dto: UpdateMilestoneDto,
    user: User,
  ): Promise<Milestone> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    Object.assign(milestone, {
      ...dto,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : milestone.targetDate,
    });
    return this.milestoneRepo.save(milestone);
  }

  async removeMilestone(id: string, user: User): Promise<void> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    await this.milestoneRepo.remove(milestone);
  }

  async completeMilestone(id: string, user: User): Promise<Milestone> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    milestone.isCompleted = true;
    milestone.completedAt = new Date();
    return this.milestoneRepo.save(milestone);
  }

  async addMilestoneUpdate(
    milestoneId: string,
    dto: CreateMilestoneUpdateDto,
    user: User,
  ): Promise<MilestoneUpdate> {
    const milestone = await this.getMilestone(milestoneId);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    const update = this.milestoneUpdateRepo.create({
      milestoneId,
      content: dto.content,
      imageUrl: dto.imageUrl,
      expenseAmount: dto.expenseAmount,
    });
    return this.milestoneUpdateRepo.save(update);
  }

  async listMilestoneUpdates(milestoneId: string): Promise<MilestoneUpdate[]> {
    return this.milestoneUpdateRepo.find({
      where: { milestoneId },
      order: { createdAt: "DESC" },
    });
  }

  async getCampaignProgress(campaignId: string): Promise<CampaignProgressResult> {
    const campaign = await this.getCampaign(campaignId);
    const [totalMilestones, completedMilestones, milestones, raised] =
      await Promise.all([
        this.milestoneRepo.count({ where: { campaignId } }),
        this.milestoneRepo.count({ where: { campaignId, isCompleted: true } }),
        this.milestoneRepo.find({ where: { campaignId } }),
        this.donationRepo.sum("amount", {
          campaignId,
          status: DonationStatus.COMPLETED,
        }),
      ]);

    const totalBudget = milestones.reduce(
      (total, milestone) => total + Number(milestone.budget ?? 0),
      0,
    );

    const updates =
      milestones.length > 0
        ? await this.milestoneUpdateRepo.find({
            where: milestones.map((milestone) => ({
              milestoneId: milestone.id,
            })),
          })
        : [];
    const totalExpense = updates.reduce(
      (total, update) => total + Number(update.expenseAmount ?? 0),
      0,
    );

    return {
      totalMilestones,
      completedMilestones,
      totalBudget,
      totalExpense,
      totalRaised: Number(raised ?? 0),
      backerCount: campaign.backerCount,
    };
  }

  private async getCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  private async getMilestone(id: string): Promise<Milestone> {
    const milestone = await this.milestoneRepo.findOne({ where: { id } });
    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }
    return milestone;
  }

  private async nextSortOrder(campaignId: string): Promise<number> {
    const max = await this.milestoneRepo.maximum("sortOrder", { campaignId });
    return (max ?? 0) + 1;
  }

  private assertCanManage(campaign: Campaign, user: User): void {
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "You can only manage milestones of your own campaigns",
      );
    }
  }

  private assertEditable(campaign: Campaign): void {
    if (LOCKED_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        "Milestones cannot be modified after a campaign is closed",
      );
    }
  }
}