"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { AccountShell } from "@/features/profile/AccountShell";
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
  comment_new: "message",
  comment_reply: "message",
  comment_hidden: "shield",
  refund_approved: "wallet",
  refund_rejected: "wallet",
  donation_refunded: "wallet",
  milestone_overdue: "clock",
  milestone_rescheduled: "clock",
};

/** Khớp NOTIFICATION_RETENTION_DAYS ở backend (job xóa thông báo cũ mỗi đêm). */
const RETENTION_DAYS = 90;

/** Chia danh sách (đã xếp mới nhất trước) theo mốc thời gian như Facebook/LinkedIn. */
function groupByTime(items: AppNotification[], now = new Date()): Array<{ label: string; items: AppNotification[] }> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const groups = [
    { label: "Hôm nay", items: [] as AppNotification[] },
    { label: "7 ngày qua", items: [] as AppNotification[] },
    { label: "Trước đó", items: [] as AppNotification[] },
  ];
  for (const item of items) {
    const time = new Date(item.createdAt).getTime();
    groups[time >= startOfToday ? 0 : time >= weekAgo ? 1 : 2].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

type LoadState = "loading" | "ready" | "error";
type FilterKey = "all" | "unread";
type ListSnapshot = { items: AppNotification[]; total: number; page: number };

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
  // Danh sách đã tải của từng bộ lọc: đổi tab hiện ngay dữ liệu cũ thay vì xóa trắng chờ API (gây nháy).
  const cache = useRef<Partial<Record<FilterKey, ListSnapshot>>>({});

  const show = useCallback((snapshot: ListSnapshot) => {
    setItems(snapshot.items);
    setTotal(snapshot.total);
    setPage(snapshot.page);
  }, []);

  const apply = useCallback((filter: FilterKey, nextPage: number, result: NotificationPage) => {
    const previous = cache.current[filter]?.items ?? [];
    const snapshot = { items: nextPage === 1 ? result.items : [...previous, ...result.items], total: result.total, page: nextPage };
    cache.current[filter] = snapshot;
    show(snapshot);
    setUnread(result.unread);
    setState("ready");
  }, [show]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const filter: FilterKey = unreadOnly ? "unread" : "all";
    listNotifications({ page: 1, limit: PAGE_SIZE, unread: unreadOnly })
      .then((result) => {
        if (!cancelled) apply(filter, 1, result);
      })
      .catch(() => {
        // Đang hiện dữ liệu (tạm) thì giữ nguyên, chỉ báo lỗi khi màn hình đang chờ.
        if (!cancelled) setState((current) => (current === "loading" ? "error" : current));
      });
    return () => {
      cancelled = true;
    };
  }, [user, unreadOnly, apply, reloadKey]);

  /** Tải trang tiếp theo (nút "Xem thêm"). */
  const loadMore = async () => {
    try {
      apply(unreadOnly ? "unread" : "all", page + 1, await listNotifications({ page: page + 1, limit: PAGE_SIZE, unread: unreadOnly }));
    } catch {
      setState("error");
    }
  };

  const changeFilter = (onlyUnread: boolean) => {
    if (onlyUnread === unreadOnly) return;
    const cached = cache.current[onlyUnread ? "unread" : "all"];
    if (cached) {
      show(cached);
    } else if (onlyUnread) {
      // "Chưa đọc" là tập con của "Tất cả": lọc ngay trên dữ liệu đang có, API trả về sẽ thay bằng bản đầy đủ.
      const provisional = { items: items.filter((n) => !n.isRead), total: unread, page: 1 };
      show(provisional);
      cache.current.unread = provisional;
      // Thông báo chưa đọc nằm ngoài trang đã tải: chưa có gì để hiện, chờ API như trước.
      if (provisional.items.length === 0 && unread > 0) setState("loading");
    } else {
      setState("loading");
    }
    setUnreadOnly(onlyUnread);
  };

  /** Cập nhật cả danh sách đang nhớ của hai bộ lọc sau khi đánh dấu đã đọc. */
  const markReadInCache = (ids: string[] | "all") => {
    const isTarget = (n: AppNotification) => ids === "all" || ids.includes(n.id);
    const all = cache.current.all;
    if (all) cache.current.all = { ...all, items: all.items.map((n) => (isTarget(n) ? { ...n, isRead: true } : n)) };
    if (ids === "all") cache.current.unread = { items: [], total: 0, page: 1 };
    else delete cache.current.unread;
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
      markReadInCache([item.id]);
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
      markReadInCache("all");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell active="notifications">
      <section className="account-intro" aria-labelledby="notification-title">
        <h2 id="notification-title">Không bỏ lỡ cập nhật nào</h2>
        <p>
          Kết quả xét duyệt, khoản ủng hộ và tiến độ của các dự án bạn tạo, ủng hộ hoặc theo dõi đều được gửi về đây.{" "}
          {unread > 0 ? <b>Bạn có {unread} thông báo chưa đọc.</b> : "Bạn đã đọc hết thông báo."}
        </p>
        <p className="notification-retention">Thông báo được lưu {RETENTION_DAYS} ngày. Biên nhận và lịch sử ủng hộ vẫn lưu đầy đủ trong tài khoản.</p>
      </section>

      <div className="notification-tools">
        <div className="notification-filter" role="group" aria-label="Lọc thông báo">
          <button className="account-chip" type="button" aria-pressed={!unreadOnly} onClick={() => changeFilter(false)}>Tất cả</button>
          <button className="account-chip" type="button" aria-pressed={unreadOnly} onClick={() => changeFilter(true)}>Chưa đọc</button>
        </div>
        <button className="account-pill" type="button" disabled={busy || unread === 0} onClick={readAll}>
          Đánh dấu tất cả đã đọc
        </button>
      </div>

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
        <div className="notification-groups">
          {groupByTime(items).map((group) => (
            <section className="notification-group" key={group.label} aria-label={group.label}>
              <h3>{group.label}</h3>
              <ul className="notification-list list-reveal">
                {group.items.map((item) => (
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
            </section>
          ))}
        </div>
      )}

      {state === "ready" && items.length < total && (
        <div className="notification-more">
          <button className="account-pill" type="button" onClick={loadMore}>Xem thêm</button>
        </div>
      )}
    </AccountShell>
  );
}
