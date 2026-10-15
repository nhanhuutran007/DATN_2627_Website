"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Lớp phủ hiện tối thiểu chừng này mỗi lần chuyển trang, để nội dung mới hiện ra mượt hơn. */
const MIN_VISIBLE_MS = 1000;
/** Bấm link nhưng trang không đổi (link bị chặn, lỗi mạng) thì tự tắt sau chừng này. */
const MAX_WAIT_MS = 10000;

/** Link nội bộ dẫn sang trang khác (khác pathname) và mở trong cùng tab. */
function isPageLink(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}

/** Hiệu ứng tải 3 chấm khi chuyển trang (bấm link hoặc điều hướng bằng code). */
export function RouteTransition() {
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  const [visible, setVisible] = useState(false);
  const [arrived, setArrived] = useState(false);
  const startedAt = useRef<number | null>(null);

  // Trang đã đổi (kể cả router.push sau đăng nhập): bật lớp phủ nếu chưa bật và đánh dấu đã tới nơi.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setVisible(true);
    setArrived(true);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!isPageLink(event)) return;
      startedAt.current = performance.now();
      setArrived(false);
      setVisible(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    startedAt.current ??= performance.now();
    const elapsed = performance.now() - startedAt.current;
    const delay = arrived ? Math.max(0, MIN_VISIBLE_MS - elapsed) : Math.max(0, MAX_WAIT_MS - elapsed);
    const timer = window.setTimeout(() => {
      startedAt.current = null;
      setVisible(false);
      setArrived(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [visible, arrived]);

  if (!visible) return null;
  return (
    <div className="route-transition" role="status" aria-live="polite">
      <span className="loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">Đang tải trang…</span>
    </div>
  );
}
