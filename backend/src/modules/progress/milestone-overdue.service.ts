import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThan, LessThanOrEqual, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { Milestone } from "./entities/milestone.entity";

/** Nhắc lại tối đa mỗi 7 ngày cho cùng một mốc còn quá hạn. */
export const OVERDUE_REMIND_INTERVAL_MS = 7 * 86_400_000;

/** Chỉ nhắc khi chiến dịch đã phát hành và còn nghĩa vụ báo cáo tiến độ. */
const TRACKED_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

export type OverdueRunResult = { reminded: number };

/**
 * Phát hiện mốc quá hạn mà chưa hoàn thành → nhắc chủ dự án giải trình (đăng
 * cập nhật hoặc đổi hạn kèm lý do). Chỉ nhắc, không tự đổi trạng thái chiến
 * dịch hay xử phạt — quyết định thuộc về con người. Chạy mỗi giờ; gọi trực
 * tiếp `remindOverdueMilestones()` được (test, kích hoạt thủ công).
 */
@Injectable()
export class MilestoneOverdueService {
  private readonly logger = new Logger(MilestoneOverdueService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueMilestones(): Promise<void> {
    const result = await this.remindOverdueMilestones();
    if (result.reminded > 0) {
      this.logger.log(`Milestone overdue job: reminded ${result.reminded} milestone(s)`);
    }
  }

  async remindOverdueMilestones(now: Date = new Date()): Promise<OverdueRunResult> {
    const cutoff = new Date(now.getTime() - OVERDUE_REMIND_INTERVAL_MS);
    const due = await this.milestoneRepo.find({
      where: [
        { isCompleted: false, targetDate: LessThan(now), overdueNotifiedAt: IsNull() },
        { isCompleted: false, targetDate: LessThan(now), overdueNotifiedAt: LessThanOrEqual(cutoff) },
      ],
      take: 500,
    });
    if (due.length === 0) return { reminded: 0 };

    const campaigns = await this.campaignRepo.find({
      where: { id: In([...new Set(due.map((milestone) => milestone.campaignId))]), status: In(TRACKED_STATUSES) },
    });
    const byId = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

    let reminded = 0;
    for (const milestone of due) {
      const campaign = byId.get(milestone.campaignId);
      if (!campaign) continue;

      // Update có điều kiện: hai instance chạy job cùng lúc chỉ một bên gửi nhắc.
      const claimed = await this.milestoneRepo.update(
        milestone.overdueNotifiedAt
          ? { id: milestone.id, overdueNotifiedAt: LessThanOrEqual(cutoff) }
          : { id: milestone.id, overdueNotifiedAt: IsNull() },
        { overdueNotifiedAt: now },
      );
      if (!claimed.affected) continue;
      reminded++;

      const days = Math.max(1, Math.floor((now.getTime() - new Date(milestone.targetDate as Date).getTime()) / 86_400_000));
      await this.notificationsService.notify({
        userId: campaign.ownerId,
        type: NotificationType.MILESTONE_OVERDUE,
        title: "Mốc công việc đã quá hạn",
        message:
          `Mốc "${milestone.title}" của chiến dịch "${campaign.title}" đã quá hạn ${days} ngày. ` +
          "Hãy đăng cập nhật giải trình hoặc đổi hạn kèm lý do — trang dự án đang hiển thị \"Chậm tiến độ\".",
        link: "/dashboard",
        relatedId: milestone.id,
      });
      await this.auditService.record({
        action: "milestone.overdue_reminder",
        entity: "milestone",
        entityId: milestone.id,
        newValues: { campaignId: campaign.id, targetDate: milestone.targetDate, overdueDays: days },
      });
    }
    return { reminded };
  }
}
