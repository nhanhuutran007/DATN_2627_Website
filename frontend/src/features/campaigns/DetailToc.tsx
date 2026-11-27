"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { useDetailTabs } from "@/features/campaigns/DetailTabs";

export type DetailTocItem = { id: string; label: string; /** Số mục (vd. số câu hỏi FAQ), hiện cạnh nhãn. */ count?: number };

type DetailTocProps = {
  items: DetailTocItem[];
  /** Nút bên phải thanh tab (vd. "Ủng hộ"), chỉ hiện khi đã cuộn qua phần tử `#${watchId}`. */
  action?: ReactNode;
  watchId?: string;
};

/**
 * Thanh tab ngang dính ngay dưới header trang dự án (như Kickstarter: Campaign · Rewards ·
 * Creator · FAQ…), đặt dưới phần đầu (ảnh bìa + thẻ gây quỹ). Mỗi tab mở một nội dung riêng
 * (`DetailTabsProvider`), không tải lại trang. Màn hình hẹp thì vuốt ngang.
 */
export function DetailToc({ items, action, watchId = "the-gay-quy" }: DetailTocProps) {
  const tabs = useDetailTabs();
  const active = tabs?.active ?? items[0]?.id ?? "";
  const [showAction, setShowAction] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const hasAction = Boolean(action);

  // Như nút "Back this project" của Kickstarter: hiện khi thẻ gây quỹ ở phần đầu đã khuất.
  useEffect(() => {
    const target = hasAction ? document.getElementById(watchId) : null;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowAction(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasAction, watchId]);

  // Màn hình hẹp: giữ tab đang mở trong tầm nhìn của thanh cuộn ngang (không cuộn cả trang).
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!list || !link) return;
    const left = link.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + link.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: left - 16, behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav className="detail-tabs" aria-label="Các mục của dự án">
      <div className="container detail-tabs-bar">
        <ul ref={listRef} role="tablist">
          {items.map((item) => (
            <li key={item.id} role="presentation">
              <a
                href={`#${item.id}`}
                id={`${item.id}-tab`}
                role="tab"
                aria-selected={active === item.id}
                aria-controls={`${item.id}-panel`}
                aria-current={active === item.id ? "page" : undefined}
                onClick={(event) => {
                  if (!tabs) return;
                  event.preventDefault();
                  tabs.select(item.id);
                }}
              >
                {item.label}
                {item.count ? <span className="detail-tabs-count">{item.count}</span> : null}
              </a>
            </li>
          ))}
        </ul>
        {action && (
          <div className="detail-tabs-action" hidden={!showAction}>
            {action}
          </div>
        )}
      </div>
    </nav>
  );
}
