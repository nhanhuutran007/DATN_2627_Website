import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import {
  PaymentGateway,
} from "../../integrations/payment/payment.gateway";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { User } from "../users/entities/user.entity";
import { CreateDonationDto, WebhookDonationDto } from "./dto/donation.dto";
import { Donation, DonationStatus } from "./entities/donation.entity";

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly dataSource: DataSource,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async create(dto: CreateDonationDto, user: User): Promise<Donation> {
    const existing = await this.donationRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const campaign = await this.campaignRepo.findOne({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ConflictException("Campaign is not accepting donations");
    }

    const endDate = new Date(campaign.endDate);
    if (endDate.getTime() <= Date.now()) {
      throw new ConflictException("Campaign has ended");
    }

    const paymentResult = await this.paymentGateway.createTransaction({
      amount: dto.amount,
      currency: "VND",
      metadata: { campaignId: dto.campaignId, userId: user.id },
    });

    const donation = this.donationRepo.create({
      userId: user.id,
      campaignId: dto.campaignId,
      amount: dto.amount,
      currency: "VND",
      status: DonationStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      transactionId: paymentResult.transactionId,
      idempotencyKey: dto.idempotencyKey,
      message: dto.message,
      isAnonymous: dto.isAnonymous ?? false,
    });

    return this.donationRepo.save(donation);
  }

  async handleWebhook(dto: WebhookDonationDto): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id: dto.donationId },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.PENDING) {
      return donation;
    }

    if (!this.paymentGateway.verifyWebhookSignature({}, "")) {
      throw new ConflictException("Invalid webhook signature");
    }

    return this.dataSource.transaction(async (manager) => {
      donation.status =
        dto.status === "completed"
          ? DonationStatus.COMPLETED
          : DonationStatus.FAILED;
      if (dto.transactionId) {
        donation.transactionId = dto.transactionId;
      }
      if (dto.status === "completed") {
        donation.completedAt = new Date();
      }
      await manager.save(donation);

      if (dto.status === "completed") {
        await manager.increment(
          Campaign,
          { id: donation.campaignId },
          "currentAmount",
          donation.amount,
        );
        await manager.increment(
          Campaign,
          { id: donation.campaignId },
          "backerCount",
          1,
        );
      }

      return donation;
    });
  }

  async findById(id: string): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id },
      relations: { user: true, campaign: true },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    return donation;
  }

  async findMine(userId: string): Promise<Donation[]> {
    return this.donationRepo.find({
      where: { userId },
      relations: { campaign: true },
      order: { createdAt: "DESC" },
    });
  }
}
