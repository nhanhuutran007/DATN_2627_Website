import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, LessThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { RefundRequest, RefundRequestStatus } from "../finance/entities/refund-request.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CHARGE_RETRY_DAYS,
  DonationsService,
  PAYMENT_REMINDER_DAYS_LEFT,
  PAYMENT_WINDOW_DAYS,
} from "./donations.service";
import { Donation, DonationStatus } from "./entities/donation.entity";
import { ExclusiveJob, JOB_LEASE } from "../../common/scheduler/exclusive-job.decorator";

/** Số khoản tối đa mỗi loại xử lý mỗi lần chạy, tránh một lần quét quá dài. */
const BATCH_SIZE = 100;
const DAY_MS = 86_400_000;

/** Lý do của yêu cầu hoàn do hệ thống tự tạo (khoản trả ngay của chiến dịch thất bại). */
export const AUTO_REFUND_REASON = "Tự động: chiến dịch kết thúc không đạt mục tiêu hoặc bị hủy.";

/** Chiến dịch chắc chắn không đạt (không tính `ended`: xét theo số tiền, xem `outcomeOf`). */
const FAILED_STATUSES = [CampaignStatus.FAILED, CampaignStatus.CANCELLED, CampaignStatus.REJECTED];

export type SettlementResult = {
  charged: number;
  chargeFailed: number;
  /** Cam kết trả sau vừa được gửi yêu cầu thanh toán (QR SePay). */
  paymentRequested: number;
  paymentReminded: number;
  /** Quá hạn thanh toán → hủy cam kết. */
  paymentExpired: number;
  released: number;
  expiredFailures: number;
  refundRequests: number;
};

/**
 * Tất toán gây quỹ "tất cả hoặc không" sau khi chiến dịch chốt kết quả (job
 * `CampaignExpiryService` hoặc admin đổi trạng thái):
 * 1. Đạt mục tiêu → trừ tiền mọi cam kết `pledged`.
 * 2. Không đạt/bị hủy → giải phóng cam kết (không trừ đồng nào).
 * 3. Trừ tiền thất bại quá `CHARGE_RETRY_DAYS` ngày chưa đổi thẻ → hủy cam kết.
 * 4. Khoản đã thu ngay (SePay) của chiến dịch không đạt → tự tạo yêu cầu hoàn cho admin.
 * Mọi bước có điều kiện trên trạng thái nên chạy lại (hoặc chạy chồng) không xử lý trùng.
 */
@Injectable()
export class PledgeSettlementService {
  private readonly logger = new Logger(PledgeSettlementService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(RefundRequest)
    private readonly refundRepo: Repository<RefundRequest>,
    private readonly donationsService: DonationsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Lượt trước chưa xong thì bỏ qua lượt này (chạy 2 phút/lần, tránh hai lượt chồng nhau). */
  private running = false;

  @Cron("0 */2 * * * *")
  @ExclusiveJob("pledge.settlement", JOB_LEASE.EVERY_2_MINUTES)
  async handleSettlement(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.settle();
      if (Object.values(result).some((n) => n > 0)) {
        this.logger.log(`Pledge settlement: ${JSON.stringify(result)}`);
      }
    } finally {
      this.running = false;
    }
  }

  async settle(now: Date = new Date()): Promise<SettlementResult> {
    const result: SettlementResult = {
      charged: 0,
      chargeFailed: 0,
      paymentRequested: 0,
      paymentReminded: 0,
      paymentExpired: 0,
      released: 0,
      expiredFailures: 0,
      refundRequests: 0,
    };
    await this.settlePledges(result, now);
    await this.followUpUnpaid(result, now);
    await this.expireChargeFailures(result, now);
    await this.createAutoRefundRequests(result);
    return result;
  }

  /**
   * Kết quả của chiến dịch đã khép lại. `ended` (admin đóng) xét theo tiến độ hiện tại
   * — gồm cả cam kết chưa trừ — giống tiêu chí job hết hạn dùng để chốt success/failed.
   */
  private outcomeOf(campaign: Campaign): "reached" | "missed" | "open" {
    if (campaign.status === CampaignStatus.SUCCESS) return "reached";
    if (FAILED_STATUSES.includes(campaign.status)) return "missed";
    if (campaign.status === CampaignStatus.ENDED) {
      return Number(campaign.currentAmount) >= Number(campaign.goalAmount) ? "reached" : "missed";
    }
    return "open";
  }

  private async settlePledges(result: SettlementResult, now: Date): Promise<void> {
    const pledges = await this.donationRepo.find({
      where: {
        status: DonationStatus.PLEDGED,
        campaign: { status: In([CampaignStatus.SUCCESS, CampaignStatus.ENDED, ...FAILED_STATUSES]) },
      },
      relations: { campaign: true },
      order: { createdAt: "ASC" },
      take: BATCH_SIZE,
    });
    for (const pledge of pledges) {
      const outcome = this.outcomeOf(pledge.campaign);
      try {
        if (outcome === "reached") {
          const charged = await this.donationsService.chargePledge(pledge.id, now);
          if (charged.status === DonationStatus.COMPLETED) result.charged += 1;
          else if (charged.status === DonationStatus.CHARGE_FAILED) result.chargeFailed += 1;
          else if (charged.status === DonationStatus.AWAITING_PAYMENT) result.paymentRequested += 1;
        } else if (outcome === "missed") {
          const cancelReason = pledge.campaign.status === CampaignStatus.CANCELLED ? (pledge.campaign.cancelReason ?? "") || null : null;
          if (await this.donationsService.releasePledge(pledge, pledge.campaign.title, cancelReason)) result.released += 1;
        }
      } catch (error) {
        // Lỗi mạng tới cổng thẻ: để nguyên `pledged`, lần chạy sau thử lại cùng khóa idempotency.
        this.logger.error(`Không tất toán được cam kết ${pledge.id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Cam kết đang chờ thanh toán: nhắc một lần khi còn `PAYMENT_REMINDER_DAYS_LEFT` ngày,
   * quá `PAYMENT_WINDOW_DAYS` ngày chưa trả thì hủy (bỏ khỏi tiến độ, trả suất quà).
   */
  private async followUpUnpaid(result: SettlementResult, now: Date): Promise<void> {
    const expireBefore = new Date(now.getTime() - PAYMENT_WINDOW_DAYS * DAY_MS);
    const remindBefore = new Date(now.getTime() - (PAYMENT_WINDOW_DAYS - PAYMENT_REMINDER_DAYS_LEFT) * DAY_MS);
    const overdue = await this.donationRepo.find({
      where: { status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: LessThan(expireBefore) },
      relations: { campaign: true },
      order: { paymentRequestedAt: "ASC" },
      take: BATCH_SIZE,
    });
    for (const donation of overdue) {
      if (await this.donationsService.expireUnpaid(donation, donation.campaign?.title ?? "")) result.paymentExpired += 1;
    }
    const due = await this.donationRepo.find({
      where: {
        status: DonationStatus.AWAITING_PAYMENT,
        paymentRequestedAt: Between(expireBefore, remindBefore),
        paymentRemindedAt: IsNull(),
      },
      take: BATCH_SIZE,
    });
    for (const donation of due) {
      if (await this.donationsService.remindPayment(donation, now)) result.paymentReminded += 1;
    }
  }

  private async expireChargeFailures(result: SettlementResult, now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - CHARGE_RETRY_DAYS * DAY_MS);
    const stale = await this.donationRepo.find({
      where: { status: DonationStatus.CHARGE_FAILED, chargeFailedAt: LessThan(cutoff) },
      relations: { campaign: true },
      take: BATCH_SIZE,
    });
    for (const donation of stale) {
      if (await this.donationsService.expireChargeFailure(donation, donation.campaign?.title ?? "")) {
        result.expiredFailures += 1;
      }
    }
  }

  /**
   * Khoản đã thu ngay (SePay, hoặc khoản ví demo cũ trước khi có cam kết) của chiến dịch
   * thất bại/bị hủy: tạo sẵn yêu cầu hoàn để người ủng hộ không phải tự gửi. Khoản SePay
   * cần tài khoản nhận hoàn → người ủng hộ được báo để bổ sung. Không tạo lại nếu khoản
   * đã từng có yêu cầu (kể cả bị từ chối). `ended` không tự tạo (khó biết chắc kết quả
   * sau khi đã trừ tiền); người ủng hộ vẫn tự yêu cầu được như trước.
   */
  private async createAutoRefundRequests(result: SettlementResult): Promise<void> {
    const candidates = await this.donationRepo
      .createQueryBuilder("d")
      .innerJoinAndSelect("d.campaign", "c")
      .leftJoin(RefundRequest, "r", "r.donation_id = d.id")
      .where("d.status = :status", { status: DonationStatus.COMPLETED })
      .andWhere("c.status IN (:...failed)", { failed: FAILED_STATUSES })
      .andWhere("r.id IS NULL")
      .orderBy("d.created_at", "ASC")
      .take(BATCH_SIZE)
      .getMany();

    for (const donation of candidates) {
      const saved = await this.refundRepo.save(
        this.refundRepo.create({
          donationId: donation.id,
          userId: donation.userId,
          reason: AUTO_REFUND_REASON,
          status: RefundRequestStatus.PENDING,
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
        }),
      );
      result.refundRequests += 1;
      await this.auditService.record({
        action: "refund.auto-request",
        entity: "refund_request",
        entityId: saved.id,
        newValues: { donationId: donation.id, amount: Number(donation.amount), campaignId: donation.campaignId },
      });
      const needsBank = donation.paymentMethod === "sepay";
      await this.notificationsService
        .notify({
          userId: donation.userId,
          type: NotificationType.SYSTEM,
          title: needsBank ? "Bổ sung tài khoản để nhận hoàn tiền" : "Khoản ủng hộ sẽ được hoàn",
          message: needsBank
            ? `Chiến dịch "${donation.campaign.title}" không đạt mục tiêu. Hệ thống đã tạo yêu cầu hoàn ${Number(donation.amount).toLocaleString("vi-VN")} ₫ cho bạn — vui lòng bổ sung tài khoản ngân hàng nhận hoàn ở biên nhận.`
            : `Chiến dịch "${donation.campaign.title}" không đạt mục tiêu. Hệ thống đã tạo yêu cầu hoàn ${Number(donation.amount).toLocaleString("vi-VN")} ₫ cho bạn, quản trị viên sẽ xử lý sớm.`,
          link: `/bien-nhan/${donation.id}`,
          relatedId: saved.id,
          email: true,
          emailCategory: "pledge_settlement",
        })
        .catch(() => undefined);
    }
  }
}
