"use client";

import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { SECTION_TABS, sectionTabHref, type AdminTab } from "@/features/admin/sections";

export type TabBadge = { text: string; title: string } | null;

function tabFromUrl(tabs: AdminTab[]): string {
  const fallback = tabs[0]?.slug ?? "";
  if (typeof window === "undefined") return fallback;
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((item) => item.slug === tab) ? (tab as string) : fallback;
}

/**
 * Tab đang mở của một mục gộp, giữ trong URL (`?tab=`) để làm mới / chia sẻ link / Quay lại đều đúng phần.
 * Mục không có tab trả về chuỗi rỗng.
 */
export function useSectionTab(section: string): [string, (tab: string) => void] {
  const tabs = SECTION_TABS[section];
  const [tab, setTab] = useState(tabs?.[0]?.slug ?? "");

  useEffect(() => {
    const list = SECTION_TABS[section] ?? [];
    const sync = () => setTab(tabFromUrl(list));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [section]);

  const select = useCallback(
    (next: string) => {
      if (next === tab) return;
      window.history.pushState(null, "", sectionTabHref(section, next));
      setTab(next);
    },
    [section, tab],
  );

  return [tab, select];
}

/** Thanh tab của mục gộp: chỉ biểu tượng + tên + số việc cần xử lý. */
export function SectionTabBar({
  section,
  value,
  onSelect,
  badges = {},
}: {
  section: string;
  value: string;
  onSelect: (tab: string) => void;
  badges?: Record<string, TabBadge>;
}) {
  const tabs = SECTION_TABS[section];
  if (!tabs) return null;
  return (
    <div className="recon-presets recon-tabs section-tabs" role="tablist">
      {tabs.map((item) => {
        const badge = badges[item.slug];
        return (
          <button
            key={item.slug}
            type="button"
            role="tab"
            aria-selected={value === item.slug}
            className={value === item.slug ? "is-active" : undefined}
            onClick={() => onSelect(item.slug)}
          >
            <Icon name={item.icon} size={17} />
            {item.label}
            {badge && <span className="recon-tab-badge" title={badge.title}>{badge.text}</span>}
          </button>
        );
      })}
    </div>
  );
}
