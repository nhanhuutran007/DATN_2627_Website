import type { Metadata } from "next";

import { NotificationCenter } from "@/features/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "Thông báo",
  description: "Thông báo về xét duyệt chiến dịch, khoản ủng hộ và tiến độ dự án.",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}
