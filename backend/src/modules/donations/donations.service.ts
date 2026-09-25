import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import {
  PaymentGateway,
  WEBHOOK_MAX_SKEW_MS,
} from "../../integrations/payment/payment.gateway";
import { AuditService } from "../../common/audit/audit.service";
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
    @Inject("PaymentGateway") private readonly paymentGateway: PaymentGateway,
    private readonly auditService: AuditService,
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

  /**
   * Webhook từ cổng thanh toán. Chữ ký được kiểm tra TRƯỚC mọi truy vấn để không
   * lộ việc khoản tài trợ có tồn tại hay không; chữ ký sai bị ghi audit.
   * `timestamp` nằm trong nội dung được ký nên cũng chống được replay: một
   * webhook hợp lệ nhưng quá cũ bị từ chối dù chữ ký khớp.
   */
  async handleWebhook(
    dto: WebhookDonationDto,
    signature: string | undefined,
  ): Promise<Donation> {
    const valid = this.paymentGateway.verifyWebhookSignature(
      {
        donationId: dto.donationId,
        status: dto.status,
        transactionId: dto.transactionId,
        timestamp: dto.timestamp,
      },
      signature ?? "",
    );
    if (!valid) {
      await this.auditService.record({
        action: "donation.webhook.rejected",
        entity: "donation",
        entityId: dto.donationId,
        newValues: { reason: "invalid-signature", claimedStatus: dto.status },
      });
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (Math.abs(Date.now() - dto.timestamp) > WEBHOOK_MAX_SKEW_MS) {
      await this.auditService.record({
        action: "donation.webhook.rejected",
        entity: "donation",
        entityId: dto.donationId,
        newValues: { reason: "stale-timestamp", claimedStatus: dto.status },
      });
      throw new UnauthorizedException("Webhook timestamp is too old");
    }

    return this.applyPaymentResult(dto, "payment-webhook");
  }

  /**
   * Mô phỏng cổng sandbox gọi lại cho ví demo. Chỉ chủ khoản tài trợ đã đăng nhập
   * mới xác nhận được, và chỉ khi cổng đang ở chế độ demo (không dùng với cổng thật).
   */
  async confirmDemoPayment(
    donationId: string,
    status: "completed" | "failed",
    user: User,
  ): Promise<Donation> {
    if (this.paymentGateway.mode !== "demo") {
      throw new ForbiddenException(
        "Client-side confirmation is only available with the demo wallet",
      );
    }
    const donation = await this.donationRepo.findOne({
      where: { id: donationId },
    });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    return this.applyPaymentResult(
      {
        donationId,
        status,
        transactionId: donation.transactionId,
        timestamp: Date.now(),
      },
      "demo-wallet",
      user.id,
    );
  }

  private async applyPaymentResult(
    dto: WebhookDonationDto,
    source: "payment-webhook" | "demo-wallet",
    actorId?: string,
  ): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id: dto.donationId },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.PENDING) {
      return donation;
    }

    const nextStatus =
      dto.status === "completed"
        ? DonationStatus.COMPLETED
        : DonationStatus.FAILED;
    const nextTransactionId = dto.transactionId ?? donation.transactionId;
    const completedAt =
      nextStatus === DonationStatus.COMPLETED
        ? new Date()
        : donation.completedAt;

    const outcome = await this.dataSource.transaction(async (manager) => {
      // Update có điều kiện trên chính cột `status`: chỉ ghi khi donation vẫn
      // còn PENDING tại thời điểm này. Guard `status !== PENDING` ở trên đọc
      // ngoài transaction nên không đủ để chống race — nếu update vô điều kiện
      // như trước, hai webhook (hoặc webhook đua với xác nhận ví demo) cùng đọc
      // PENDING rồi cùng ghi sẽ cùng cộng tiền/backer trùng lặp cho một donation.
      const updateResult = await manager.update(
        Donation,
        { id: donation.id, status: DonationStatus.PENDING },
        { status: nextStatus, transactionId: nextTransactionId, completedAt },
      );

      if (!updateResult.affected) {
        // Một request khác đã xử lý donation này trước — trả lại bản ghi hiện
        // tại, không cộng tiền/backer lần nữa, không ghi audit trùng.
        const current = await manager.findOne(Donation, {
          where: { id: donation.id },
        });
        return { applied: false as const, donation: current ?? donation };
      }

      if (nextStatus === DonationStatus.COMPLETED) {
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

      return {
        applied: true as const,
        donation: {
          ...donation,
          status: nextStatus,
          transactionId: nextTransactionId,
          completedAt,
        } as Donation,
      };
    });

    if (!outcome.applied) {
      return outcome.donation;
    }

    const result = outcome.donation;
    await this.auditService.record({
      userId: actorId,
      action: `donation.payment.${result.status}`,
      entity: "donation",
      entityId: result.id,
      oldValues: { status: DonationStatus.PENDING },
      newValues: {
        status: result.status,
        amount: result.amount,
        campaignId: result.campaignId,
        transactionId: result.transactionId ?? null,
        source,
      },
    });
    return result;
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
