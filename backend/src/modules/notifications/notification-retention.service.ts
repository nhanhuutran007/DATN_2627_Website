import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";

import { Notification } from "./entities/notification.entity";
import { ExclusiveJob, JOB_LEASE } from "../../common/scheduler/exclusive-job.decorator";

/** Thông báo trong web chỉ giữ chừng này ngày (đã đọc hay chưa); giao dịch, nhật ký kiểm toán lưu riêng. */
export const NOTIFICATION_RETENTION_DAYS = 90;

/** Xóa thông báo quá hạn lưu để bảng không phình mãi. */
@Injectable()
export class NotificationRetentionService {
  private readonly logger = new Logger(NotificationRetentionService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  @ExclusiveJob("notification.retention", JOB_LEASE.EVERY_DAY)
  async handleRetention(): Promise<void> {
    const removed = await this.purgeExpired();
    if (removed > 0) {
      this.logger.log(`Notification retention job: removed ${removed} notification(s) older than ${NOTIFICATION_RETENTION_DAYS} days`);
    }
  }

  async purgeExpired(now: Date = new Date(), days = NOTIFICATION_RETENTION_DAYS): Promise<number> {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60_000);
    const result = await this.notificationRepo.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
