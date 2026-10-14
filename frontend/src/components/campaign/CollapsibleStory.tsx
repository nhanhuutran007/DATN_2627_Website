"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Chiều cao (px) khi thu gọn; nội dung ngắn hơn thì không hiện nút "Xem thêm". */
const COLLAPSED_HEIGHT = 360;

/** Câu chuyện dự án dài được thu gọn, bấm "Xem thêm" để mở hết. */
export function CollapsibleStory({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollHeight > COLLAPSED_HEIGHT + 40);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const collapsed = overflowing && !expanded;

  return (
    <>
      <div
        id={id}
        ref={ref}
        className={`story-collapse${collapsed ? " is-collapsed" : ""}`}
        style={collapsed ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
      >
        {children}
      </div>
      {overflowing && (
        <button className="story-toggle" type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </>
  );
}
