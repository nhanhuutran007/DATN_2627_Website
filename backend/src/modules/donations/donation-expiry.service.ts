import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Donation, DonationStatus } from "./entities/donation.entity";

/** Thời gian chờ thanh toán mặc định trước khi đơn `pending` bị coi là hết hạn. */
export const DEFAULT_PENDING_TTL_MINUTES = 30;
/** Số đơn tối đa xử lý mỗi lần chạy, tránh một lần quét quá dài. */
const BATCH_SIZE = 200;

export function pendingTtlMinutes(raw = process.env.DONATION_PENDING_TTL_MINUTES): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 1 ? value : DEFAULT_PENDING_TTL_MINUTES;
}

/**
 * Chuyển đơn tài trợ `pending` quá hạn thanh toán sang `expired`. Không đụng tới
 * số liệu quỹ (đơn chưa thu tiền). Nếu sau đó cổng thanh toán vẫn báo thành công
 * thì `DonationsService` ghi nhận muộn (xem `transitionSources`).
 */
@Injectable()
export class DonationExpiryService {
  private readonly logger = new Logger(DonationExpiryService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredDonations(): Promise<void> {
    const expired = await this.expirePendingDonations();
    if (expired > 0) {
      this.logger.log(`Donation expiry job: ${expired} pending donation(s) expired`);
    }
  }

  async expirePendingDonations(now: Date = new Date(), ttlMinutes = pendingTtlMinutes()): Promise<number> {
    const cutoff = new Date(now.getTime() - ttlMinutes * 60_000);
    const stale = await this.donationRepo.find({
      where: { status: DonationStatus.PENDING, createdAt: LessThan(cutoff) },
      order: { createdAt: "ASC" },
      take: BATCH_SIZE,
    });

    let expired = 0;
    for (const donation of stale) {
      // Có điều kiện: webhook/xác nhận ví demo/hủy đến cùng lúc thì bên đó thắng.
      const result = await this.donationRepo.update(
        { id: donation.id, status: DonationStatus.PENDING },
        { status: DonationStatus.EXPIRED },
      );
      if (!result.affected) continue;
      expired += 1;
      await this.auditService.record({
        action: "donation.expire",
        entity: "donation",
        entityId: donation.id,
        oldValues: { status: DonationStatus.PENDING, createdAt: donation.createdAt },
        newValues: { status: DonationStatus.EXPIRED, ttlMinutes },
      });
    }
    return expired;
  }
}
