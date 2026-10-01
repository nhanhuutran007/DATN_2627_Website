import { NotificationType } from "../notifications/entities/notification.entity";
import type { NotifyInput } from "../notifications/notifications.service";
import { CampaignStatus } from "./entities/campaign.entity";

type CampaignRef = { id: string; title: string; ownerId: string };

export type CampaignStatusNotifications = {
  owner?: NotifyInput;
  /** Thông báo chung gửi mọi người đã ủng hộ (không kèm userId). */
  backers?: Omit<NotifyInput, "userId">;
};

/** Nội dung thông báo khi chiến dịch đổi trạng thái (do admin hoặc job hết hạn). */
export function campaignStatusNotifications(
  campaign: CampaignRef,
  previous: CampaignStatus,
  next: CampaignStatus,
  reason?: string | null,
): CampaignStatusNotifications {
  const name = `"${campaign.title}"`;
  const owner = (type: NotificationType, title: string, message: string, email = true): NotifyInput => ({
    userId: campaign.ownerId,
    type,
    title,
    message,
    link: "/dashboard",
    relatedId: campaign.id,
    email,
  });
  const publicLink = `/du-an/${campaign.id}`;
  const reasonText = reason?.trim() ? ` Lý do: ${reason.trim()}` : "";

  switch (next) {
    case CampaignStatus.APPROVED:
      return { owner: owner(NotificationType.CAMPAIGN_APPROVED, "Chiến dịch đã được duyệt", `Chiến dịch ${name} đã được quản trị viên duyệt và sẽ sớm được phát hành.`) };
    case CampaignStatus.ACTIVE:
      if (previous === CampaignStatus.PAUSED) {
        return {
          owner: owner(NotificationType.CAMPAIGN_RESUMED, "Chiến dịch được tiếp tục", `Chiến dịch ${name} đã được mở lại và tiếp tục nhận ủng hộ.`),
          backers: { type: NotificationType.CAMPAIGN_RESUMED, title: "Chiến dịch bạn ủng hộ đã tiếp tục", message: `Chiến dịch ${name} đã được mở lại sau thời gian tạm dừng.`, link: publicLink, relatedId: campaign.id },
        };
      }
      return { owner: owner(NotificationType.CAMPAIGN_APPROVED, "Chiến dịch đã được phát hành", `Chiến dịch ${name} đã công khai và bắt đầu nhận ủng hộ.`) };
    case CampaignStatus.REJECTED:
      return { owner: owner(NotificationType.CAMPAIGN_REJECTED, "Chiến dịch chưa được duyệt", `Chiến dịch ${name} chưa được duyệt.${reasonText} Bạn có thể chỉnh sửa và gửi lại.`) };
    case CampaignStatus.NEEDS_INFO:
      return { owner: owner(NotificationType.CAMPAIGN_NEEDS_INFO, "Chiến dịch cần bổ sung thông tin", `Quản trị viên cần bạn bổ sung thông tin cho chiến dịch ${name}.${reasonText}`) };
    case CampaignStatus.PAUSED:
      return {
        owner: owner(NotificationType.CAMPAIGN_PAUSED, "Chiến dịch bị tạm dừng", `Chiến dịch ${name} đã bị tạm dừng nhận ủng hộ.${reasonText}`),
        backers: { type: NotificationType.CAMPAIGN_PAUSED, title: "Chiến dịch bạn ủng hộ bị tạm dừng", message: `Chiến dịch ${name} tạm dừng nhận ủng hộ trong lúc quản trị viên xem xét.`, link: publicLink, relatedId: campaign.id },
      };
    case CampaignStatus.SUCCESS:
      return {
        owner: owner(NotificationType.CAMPAIGN_ENDED, "Chiến dịch đạt mục tiêu", `Chiến dịch ${name} đã kết thúc và đạt mục tiêu gây quỹ. Hãy tiếp tục báo cáo tiến độ cho người ủng hộ.`),
        backers: { type: NotificationType.CAMPAIGN_ENDED, title: "Chiến dịch bạn ủng hộ đã đạt mục tiêu", message: `Chiến dịch ${name} đã kết thúc và đạt mục tiêu. Cảm ơn bạn đã đồng hành!`, link: publicLink, relatedId: campaign.id },
      };
    case CampaignStatus.FAILED:
      return {
        owner: owner(NotificationType.CAMPAIGN_ENDED, "Chiến dịch kết thúc chưa đạt mục tiêu", `Chiến dịch ${name} đã hết hạn nhưng chưa đạt mục tiêu gây quỹ.`),
        backers: { type: NotificationType.CAMPAIGN_ENDED, title: "Chiến dịch bạn ủng hộ đã kết thúc", message: `Chiến dịch ${name} đã hết hạn nhưng chưa đạt mục tiêu.`, link: publicLink, relatedId: campaign.id },
      };
    case CampaignStatus.ENDED:
      return { owner: owner(NotificationType.CAMPAIGN_ENDED, "Chiến dịch đã đóng", `Chiến dịch ${name} đã được đóng.`, false) };
    default:
      return {};
  }
}
