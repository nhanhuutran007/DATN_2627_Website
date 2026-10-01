import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { getUnreadCount, NOTIFICATIONS_EVENT } from "@/lib/api/notifications";

const POLL_MS = 60_000;

/** Chuông thông báo trên header: số chưa đọc, cập nhật mỗi phút và khi quay lại tab. */
export function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      getUnreadCount()
        .then((count) => {
          if (!cancelled) setUnread(count);
        })
        .catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener(NOTIFICATIONS_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const label = unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo";

  return (
    <Link className="notification-bell" href="/thong-bao" aria-label={label} title={label} onClick={onNavigate}>
      <Icon name="bell" size={20} />
      {unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}
