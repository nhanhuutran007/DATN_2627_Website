import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

export type ExpiryRunResult = {
  succeeded: number;
  failed: number;
};

/**
 * Tự động chốt kết quả chiến dịch đã quá hạn: `active` + `endDate` <= hiện tại
 * → `success` nếu đạt mục tiêu (`currentAmount >= goalAmount`), ngược lại
 * `failed`. Chạy mỗi giờ; cũng gọi được trực tiếp `expireCampaigns()` (test,
 * hoặc kích hoạt thủ công) mà không cần chờ lịch cron.
 */
@Injectable()
export class CampaignExpiryService {
  private readonly logger = new Logger(CampaignExpiryService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredCampaigns(): Promise<void> {
    const result = await this.expireCampaigns();
    if (result.succeeded > 0 || result.failed > 0) {
      this.logger.log(
        `Campaign expiry job: ${result.succeeded} success, ${result.failed} failed`,
      );
    }
  }

  async expireCampaigns(now: Date = new Date()): Promise<ExpiryRunResult> {
    const expired = await this.campaignRepo.find({
      where: { status: CampaignStatus.ACTIVE, endDate: LessThanOrEqual(now) },
    });

    let succeeded = 0;
    let failed = 0;

    for (const campaign of expired) {
      const reachedGoal =
        Number(campaign.currentAmount) >= Number(campaign.goalAmount);
      const nextStatus = reachedGoal
        ? CampaignStatus.SUCCESS
        : CampaignStatus.FAILED;

      // Update có điều kiện: chỉ chốt nếu campaign vẫn còn `active` tại thời
      // điểm ghi, tránh đua với một lần moderate/pause xảy ra đồng thời.
      const result = await this.campaignRepo.update(
        { id: campaign.id, status: CampaignStatus.ACTIVE },
        { status: nextStatus },
      );
      if (!result.affected) {
        continue;
      }

      reachedGoal ? succeeded++ : failed++;
      await this.auditService.record({
        action: "campaign.expire",
        entity: "campaign",
        entityId: campaign.id,
        oldValues: { status: CampaignStatus.ACTIVE, endDate: campaign.endDate },
        newValues: {
          status: nextStatus,
          currentAmount: campaign.currentAmount,
          goalAmount: campaign.goalAmount,
        },
      });
    }

    return { succeeded, failed };
  }
}
