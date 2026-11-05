"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { isSettingsTabSwitch } from "@/features/profile/AccountShell";

/**
 * Next chỉ cuộn tới đầu phần trang vừa đổi (thẻ `<main>`), nên khi chuyển trang từ giữa trang
 * (vd. /du-an → /du-an?category=…) header và phần trên bị đẩy khỏi màn hình. Mỗi lần URL đổi,
 * cuộn hẳn về đầu cửa sổ — trừ khi bấm Back/Forward (trình duyệt tự khôi phục vị trí cũ) hoặc link có `#`.
 */
export function ScrollReset() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const fromHistory = useRef(false);
  const first = useRef(true);
  const previousPath = useRef(pathname);

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const from = previousPath.current;
    previousPath.current = pathname;
    if (first.current) {
      first.current = false;
      return;
    }
    // Đổi tab trong trang Cài đặt: giữ nguyên vị trí cuộn như chuyển tab, không nhảy về đầu.
    if (isSettingsTabSwitch(from, pathname)) return;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]);

  return null;
}
