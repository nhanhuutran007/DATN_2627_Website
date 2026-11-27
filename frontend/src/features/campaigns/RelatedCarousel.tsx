"use client";

import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * Băng chuyền "Có thể bạn cũng quan tâm": hiện 3 dự án mỗi lần (2 trên máy tính bảng, 1 trên điện thoại),
 * nút Trước/Sau cuộn sang nhóm kế tiếp; vẫn vuốt ngang được trên màn hình cảm ứng.
 */
export function RelatedCarousel({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  const items = Children.toArray(children);
  const single = edges.start && edges.end;

  return (
    <div className="related-carousel" role="region" aria-roledescription="băng chuyền" aria-label={label}>
      <ul className="related-carousel-track" ref={trackRef}>
        {items.map((child, index) => (
          <li key={index} className="related-carousel-item" aria-label={`${index + 1} / ${items.length}`}>
            {child}
          </li>
        ))}
      </ul>
      {!single && (
        <div className="related-carousel-nav">
          <button className="related-carousel-button" type="button" disabled={edges.start} aria-label="Các dự án trước" onClick={() => scroll(-1)}>
            <Icon name="chevron-left" size={20} />
          </button>
          <button className="related-carousel-button" type="button" disabled={edges.end} aria-label="Các dự án tiếp theo" onClick={() => scroll(1)}>
            <Icon name="chevron-left" size={20} className="icon-flip" />
          </button>
        </div>
      )}
    </div>
  );
}
