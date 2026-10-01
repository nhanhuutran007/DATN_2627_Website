import { api } from "../api";

export type NotificationType =
  | "campaign_approved"
  | "campaign_rejected"
  | "campaign_needs_info"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_ended"
  | "donation_received"
  | "donation_confirmed"
  | "milestone_completed"
  | "progress_update"
  | "report_resolved"
  | "system";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: AppNotification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};

/** Sự kiện trình duyệt: số thông báo chưa đọc đã thay đổi (để chuông cập nhật ngay). */
export const NOTIFICATIONS_EVENT = "gopmam:notifications";

export function emitNotificationsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
}

export function listNotifications(params: { page?: number; limit?: number; unread?: boolean } = {}): Promise<NotificationPage> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.unread) query.set("unread", "true");
  const qs = query.toString();
  return api.get<NotificationPage>(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function getUnreadCount(): Promise<number> {
  const result = await api.get<{ unread: number }>("/notifications/unread-count");
  return result.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
  emitNotificationsChanged();
}

export async function markAllNotificationsRead(): Promise<number> {
  const result = await api.patch<{ updated: number }>("/notifications/read-all");
  emitNotificationsChanged();
  return result.updated;
}
