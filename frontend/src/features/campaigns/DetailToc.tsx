"use client";

import { useEffect, useState } from "react";

export type DetailTocItem = { id: string; label: string };

type DetailTocProps = {
  items: DetailTocItem[];
};

/**
 * Mục lục dính ở cột trái trang dự án (như thanh điều hướng mục của Kickstarter):
 * bấm để nhảy tới mục, mục đang đọc được tô đậm. Chỉ hiện trên màn hình rộng (xem `.detail-toc`).
 */
export function DetailToc({ items }: DetailTocProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");

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

  return (
    <nav className="detail-toc" aria-label="Các mục của dự án">
      <p className="detail-toc-title">Trong trang này</p>
      <ul>
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
    </nav>
  );
}
