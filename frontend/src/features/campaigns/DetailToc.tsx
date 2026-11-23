"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export type DetailTocItem = { id: string; label: string };

type DetailTocProps = {
  items: DetailTocItem[];
  /** Nút bên phải thanh tab (vd. "Ủng hộ"), chỉ hiện khi đã cuộn qua phần tử `#${watchId}`. */
  action?: ReactNode;
  watchId?: string;
};

/**
 * Thanh tab ngang dính ngay dưới header trang dự án (như Kickstarter: Campaign · Rewards ·
 * Creator · FAQ…), đặt dưới phần đầu (ảnh bìa + thẻ gây quỹ): bấm để nhảy tới mục, mục đang đọc
 * được gạch chân. Màn hình hẹp thì vuốt ngang.
 */
export function DetailToc({ items, action, watchId = "the-gay-quy" }: DetailTocProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");
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

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;
    // Mục "đang đọc" = mục cắt dải ngang khoảng 1/3 trên của màn hình.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  // Màn hình hẹp: giữ tab đang đọc trong tầm nhìn của thanh cuộn ngang (không cuộn cả trang).
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
        <ul ref={listRef}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? "location" : undefined}
                onClick={() => setActive(item.id)}
              >
                {item.label}
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
