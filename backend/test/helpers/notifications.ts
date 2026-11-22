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
  followerNotices: (BackerNotice & { onlyUserIds?: string[] })[];
} {
  const notified: NotifyInput[] = [];
  const backerNotices: BackerNotice[] = [];
  const followerNotices: (BackerNotice & { onlyUserIds?: string[] })[] = [];
  const service = {
    notify: async (input: NotifyInput | NotifyInput[]) => {
      notified.push(...(Array.isArray(input) ? input : [input]));
    },
    notifyCampaignFollowers: async (
      campaignId: string,
      base: Omit<NotifyInput, "userId">,
      excludeUserIds: string[] = [],
      onlyUserIds?: string[],
    ) => {
      followerNotices.push({ campaignId, base: { ...base, email: true }, excludeUserIds, onlyUserIds });
      return 0;
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
  return { service, notified, backerNotices, followerNotices };
}
