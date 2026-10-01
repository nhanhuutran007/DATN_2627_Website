"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { useAuthUser } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationPage,
  type NotificationType,
} from "@/lib/api/notifications";

const PAGE_SIZE = 20;

const ICONS: Partial<Record<NotificationType, IconName>> = {
  campaign_approved: "check",
  campaign_resumed: "check",
  campaign_rejected: "document",
  campaign_needs_info: "document",
  campaign_paused: "clock",
  campaign_ended: "chart",
  donation_received: "heart",
  donation_confirmed: "heart",
  milestone_completed: "check",
  progress_update: "chart",
  report_resolved: "shield",
};

type LoadState = "loading" | "ready" | "error";

export function NotificationCenter() {
  const user = useAuthUser();
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("loading");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const apply = useCallback((nextPage: number, result: NotificationPage) => {
    setItems((prev) => (nextPage === 1 ? result.items : [...prev, ...result.items]));
    setTotal(result.total);
    setUnread(result.unread);
    setPage(nextPage);
    setState("ready");
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listNotifications({ page: 1, limit: PAGE_SIZE, unread: unreadOnly })
      .then((result) => {
        if (!cancelled) apply(1, result);
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user, unreadOnly, apply, reloadKey]);

  /** Tải trang tiếp theo (nút "Xem thêm"). */
  const loadMore = async () => {
    try {
      apply(page + 1, await listNotifications({ page: page + 1, limit: PAGE_SIZE, unread: unreadOnly }));
    } catch {
      setState("error");
    }
  };

  const changeFilter = (onlyUnread: boolean) => {
    if (onlyUnread === unreadOnly) return;
    setState("loading");
    setUnreadOnly(onlyUnread);
  };

  const retry = () => {
    setState("loading");
    setReloadKey((k) => k + 1);
  };

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="bell" size={28} /></span>
        <h1>Đăng nhập để xem thông báo</h1>
        <p>Thông báo về kết quả xét duyệt, khoản ủng hộ và tiến độ các dự án bạn theo dõi sẽ hiện ở đây.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/thong-bao">Đăng nhập</Link>
          <Link className="button button-outline" href="/dang-ky">Tạo tài khoản</Link>
        </div>
      </main>
    );
  }

  const open = async (item: AppNotification) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationRead(item.id).catch(() => undefined);
    }
    if (item.link) router.push(item.link);
  };

  const readAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => (unreadOnly ? [] : prev.map((n) => ({ ...n, isRead: true }))));
      setUnread(0);
      if (unreadOnly) setTotal(0);
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container notification-page">
      <header className="notification-head">
        <div>
          <h1>Thông báo</h1>
          <p>{unread > 0 ? `Bạn có ${unread} thông báo chưa đọc.` : "Bạn đã đọc hết thông báo."}</p>
        </div>
        <div className="notification-tools">
          <div className="notification-filter" role="group" aria-label="Lọc thông báo">
            <button className="tab" type="button" aria-pressed={!unreadOnly} onClick={() => changeFilter(false)}>Tất cả</button>
            <button className="tab" type="button" aria-pressed={unreadOnly} onClick={() => changeFilter(true)}>Chưa đọc</button>
          </div>
          <button className="button button-outline button-sm" type="button" disabled={busy || unread === 0} onClick={readAll}>
            <Icon name="check" size={16} /> Đánh dấu tất cả đã đọc
          </button>
        </div>
      </header>

      {state === "loading" && <p className="empty-line" role="status">Đang tải thông báo…</p>}

      {state === "error" && (
        <div className="form-error" role="alert">
          Không tải được thông báo. <button className="link-button" type="button" onClick={retry}>Thử lại</button>
        </div>
      )}

      {state === "ready" && items.length === 0 && (
        <div className="empty-box">
          <p>{unreadOnly ? "Không có thông báo chưa đọc." : "Chưa có thông báo nào."}</p>
          <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
        </div>
      )}

      {items.length > 0 && state !== "loading" && (
        <ul className="notification-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`notification-item ${item.isRead ? "" : "is-unread"}`}
                type="button"
                onClick={() => open(item)}
              >
                <span className="notification-icon" aria-hidden="true">
                  <Icon name={ICONS[item.type] ?? "bell"} size={18} />
                </span>
                <span className="notification-body">
                  <b>{item.title}</b>
                  <span>{item.message}</span>
                  <small>
                    <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                    {!item.isRead && <span className="sr-only"> · chưa đọc</span>}
                  </small>
                </span>
                {!item.isRead && <span className="notification-dot" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {state === "ready" && items.length < total && (
        <div className="notification-more">
          <button className="button button-outline" type="button" onClick={loadMore}>Xem thêm</button>
        </div>
      )}
    </main>
  );
}
