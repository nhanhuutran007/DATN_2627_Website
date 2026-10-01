import type {
  NotificationsService,
  NotifyInput,
} from "../../src/modules/notifications/notifications.service";

export type BackerNotice = {
  campaignId: string;
  base: Omit<NotifyInput, "userId">;
  excludeUserIds: string[];
};

/** NotificationsService giả: lưu lại thông báo đã phát để test kiểm tra. */
export function makeNotifierRecorder(): {
  service: NotificationsService;
  notified: NotifyInput[];
  backerNotices: BackerNotice[];
} {
  const notified: NotifyInput[] = [];
  const backerNotices: BackerNotice[] = [];
  const service = {
    notify: async (input: NotifyInput | NotifyInput[]) => {
      notified.push(...(Array.isArray(input) ? input : [input]));
    },
    notifyCampaignBackers: async (
      campaignId: string,
      base: Omit<NotifyInput, "userId">,
      excludeUserIds: string[] = [],
    ) => {
      backerNotices.push({ campaignId, base, excludeUserIds });
      return 0;
    },
  } as unknown as NotificationsService;
  return { service, notified, backerNotices };
}
