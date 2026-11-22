import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { FinanceService } from "./finance.service";

/**
 * Mỗi 10 phút quét yêu cầu hoàn đang chờ (gồm yêu cầu hệ thống tạo khi chiến dịch thất bại) và tự hoàn
 * khoản đủ điều kiện theo cấu hình của admin. Khoản SePay hoặc vượt hạn mức vẫn chờ admin duyệt tay.
 */
@Injectable()
export class AutoRefundService {
  private readonly logger = new Logger(AutoRefundService.name);
  private running = false;

  constructor(private readonly financeService: FinanceService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const refunded = await this.financeService.processPendingAutoRefunds();
      if (refunded > 0) this.logger.log(`Đã tự hoàn ${refunded} yêu cầu.`);
    } catch (error) {
      this.logger.error(`Quét hoàn tiền tự động lỗi: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
