"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type DetailTabsContextValue = {
  active: string;
  /** Mở tab `id` (không tải lại trang), cập nhật `#id` trên thanh địa chỉ. */
  select: (id: string, options?: { scroll?: boolean }) => void;
};

const DetailTabsContext = createContext<DetailTabsContextValue | null>(null);

export function useDetailTabs(): DetailTabsContextValue | null {
  return useContext(DetailTabsContext);
}

/** Thanh tab dính dưới header: khi đổi tab, đưa phần đầu nội dung lên ngay dưới thanh tab. */
function scrollToTabs() {
  const bar = document.querySelector<HTMLElement>(".detail-tabs");
  if (!bar) return;
  const stickyTop = Number.parseFloat(getComputedStyle(bar).top) || 0;
  const content = document.querySelector<HTMLElement>("[data-detail-tabs-start]") ?? bar;
  const target = content.getBoundingClientRect().top + window.scrollY - stickyTop - bar.offsetHeight - 12;
  // Chỉ cuộn khi đang ở dưới điểm bắt đầu nội dung tab (đang đọc phần đầu trang thì giữ nguyên).
  if (window.scrollY > target) window.scrollTo({ top: target, behavior: "smooth" });
}

/** Phần tử có `id` nằm trong tab nào (vd. `#minh-bach` thuộc tab Ngân sách). */
function tabOfElement(id: string, tabIds: string[]): string | null {
  const element = document.getElementById(id);
  const panel = element?.closest<HTMLElement>("[data-tab-panel]");
  if (panel?.dataset.tabPanel) return panel.dataset.tabPanel;
  // Phần tử tải sau (vd. `#cap-nhat-3` của bài cập nhật): khớp theo tiền tố tên tab.
  return [...tabIds].sort((a, b) => b.length - a.length).find((tab) => id === tab || id.startsWith(`${tab}-`)) ?? null;
}

/** Cuộn tới phần tử (có thể tải sau vài trăm ms) sau khi tab hiện ra. */
function scrollToElementSoon(id: string) {
  let tries = 0;
  const attempt = () => {
    const element = document.getElementById(id);
    if (element && element.offsetParent !== null) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    tries += 1;
    if (tries < 20) window.setTimeout(attempt, 150);
  };
  window.requestAnimationFrame(attempt);
}

/**
 * Trang dự án chia thành các tab (như Kickstarter: Campaign · Rewards · FAQ · Updates · Comments):
 * mỗi lúc chỉ hiện một nội dung, đổi tab không tải lại trang. Nội dung các tab vẫn được dựng sẵn
 * ở máy chủ (tốt cho SEO) và chỉ ẩn/hiện. Link `#id` (từ thông báo, email…) mở đúng tab chứa phần tử đó.
 */
export function DetailTabsProvider({ tabIds, children }: { tabIds: string[]; children: ReactNode }) {
  const [active, setActive] = useState(tabIds[0] ?? "");
  const key = tabIds.join("|");

  const select = useCallback(
    (id: string, options: { scroll?: boolean } = {}) => {
      if (!tabIds.includes(id)) return;
      setActive(id);
      const url = id === tabIds[0] ? `${window.location.pathname}${window.location.search}` : `#${id}`;
      window.history.replaceState(window.history.state, "", url);
      if (options.scroll !== false) window.requestAnimationFrame(scrollToTabs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  // Mở theo `#id` trên địa chỉ (lúc vào trang và khi hash đổi).
  useEffect(() => {
    const openHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const tab = tabOfElement(id, tabIds);
      if (!tab) return;
      setActive(tab);
      if (id !== tab) scrollToElementSoon(id);
      else window.requestAnimationFrame(scrollToTabs);
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Link nội bộ `href="#…"` trong trang (vd. "Người tổ chức" ở phần đầu, "Điểm minh bạch"): mở tab chứa đích.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.closest(".detail-tabs")) return;
      const id = decodeURIComponent(link.getAttribute("href")?.slice(1) ?? "");
      const tab = id ? tabOfElement(id, tabIds) : null;
      if (!tab) return;
      event.preventDefault();
      setActive(tab);
      window.history.replaceState(window.history.state, "", `#${id}`);
      if (id === tab) window.requestAnimationFrame(scrollToTabs);
      else scrollToElementSoon(id);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = useMemo(() => ({ active, select }), [active, select]);
  return <DetailTabsContext.Provider value={value}>{children}</DetailTabsContext.Provider>;
}

/** Nội dung một tab: chỉ hiện khi tab đang mở. */
export function DetailTabPanel({ id, labelledBy, children }: { id: string; labelledBy?: string; children: ReactNode }) {
  const tabs = useDetailTabs();
  const hidden = tabs ? tabs.active !== id : false;
  return (
    <div
      className="detail-tab-panel"
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={labelledBy ?? `${id}-tab`}
      data-tab-panel={id}
      hidden={hidden}
    >
      {children}
    </div>
  );
}
