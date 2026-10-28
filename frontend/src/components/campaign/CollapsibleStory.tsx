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
  // Mở/thu bằng max-height có chuyển tiếp (theme.css): trượt tới chiều cao thật rồi bỏ giới hạn,
  // để ảnh tải muộn trong câu chuyện không bị cắt.
  const [fullHeight, setFullHeight] = useState(0);
  const [settled, setSettled] = useState(false);

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

  const toggle = () => {
    const element = ref.current;
    if (!element) return;
    if (expanded && settled) {
      // Đang không giới hạn chiều cao: đặt chiều cao thật và ép trình duyệt tính bố cục,
      // để chuyển tiếp thu gọn có điểm xuất phát thay vì nhảy thẳng về COLLAPSED_HEIGHT.
      element.style.maxHeight = `${element.scrollHeight}px`;
      void element.offsetHeight;
    }
    setFullHeight(element.scrollHeight);
    setSettled(false);
    setExpanded(!expanded);
  };

  return (
    <>
      <div
        id={id}
        ref={ref}
        className={`story-collapse${collapsed ? " is-collapsed" : ""}`}
        style={overflowing ? { maxHeight: collapsed ? COLLAPSED_HEIGHT : settled ? undefined : fullHeight } : undefined}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && expanded) setSettled(true);
        }}
      >
        {children}
      </div>
      {overflowing && (
        <button className="story-toggle" type="button" aria-expanded={expanded} aria-controls={id} onClick={toggle}>
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </>
  );
}
