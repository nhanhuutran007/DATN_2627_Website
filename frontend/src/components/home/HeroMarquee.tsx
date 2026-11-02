"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

import { coverFor } from "@/lib/covers";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";

/** Số ảnh tối thiểu để dải ảnh đủ dài, không lộ khoảng trống khi trôi. */
const MIN_TILES = 8;
/** Giây cho mỗi ảnh đi hết một vòng: càng lớn càng trôi chậm. */
const SECONDS_PER_TILE = 7;
/** Kéo quá số px này mới tính là kéo (dưới ngưỡng vẫn là một cú bấm mở dự án). */
const DRAG_THRESHOLD = 6;

/**
 * Ưu tiên dự án đang gây quỹ, mỗi ảnh chỉ dùng một lần (nhiều dự án chung ảnh minh họa theo lĩnh vực);
 * thiếu thì lặp lại cho đủ dài.
 */
function pickTiles(campaigns: Campaign[]): Campaign[] {
  const open = campaigns.filter((campaign) => campaign.status === "Đang gây quỹ");
  const source = open.length >= 4 ? open : campaigns;
  const seen = new Set<string>();
  const unique = source.filter((campaign) => {
    const src = coverFor(campaign).src;
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
  const tiles = unique.length > 0 ? unique : source;
  const filled = [...tiles];
  while (filled.length > 0 && filled.length < MIN_TILES) filled.push(...tiles.slice(0, MIN_TILES - filled.length));
  return filled;
}

/**
 * Dải ảnh dự án (cùng khung 4:3) trôi chậm từ phải sang trái ở hero; rê chuột để dừng,
 * nắm kéo bằng chuột (hoặc vuốt trên màn hình cảm ứng) để lướt, bấm để mở dự án.
 */
export function HeroMarquee({ campaigns }: { campaigns: Campaign[] }) {
  const tiles = pickTiles(campaigns);
  // Nhân đôi dải để vòng lặp liền mạch: cuộn đúng nửa chiều dài rồi quay về đầu.
  const track = [...tiles, ...tiles];
  const viewportRef = useRef<HTMLDivElement>(null);
  const state = useRef({ pos: 0, hovering: false, pointerDown: false, dragging: false, startX: 0, startPos: 0, suppressClick: false });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || tiles.length === 0) return;
    const s = state.current;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const half = el.scrollWidth / 2;
      if (half > 0) {
        const paused = s.hovering || s.pointerDown || el.matches(":focus-within");
        // Khi dừng, lấy vị trí thật (người dùng có thể vừa cuộn/vuốt) để trôi tiếp từ đó.
        s.pos = paused ? el.scrollLeft : s.pos + (half / (tiles.length * SECONDS_PER_TILE)) * dt;
        if (!s.dragging) {
          if (s.pos >= half) s.pos -= half;
          else if (s.pos < 0) s.pos += half;
        }
        if (!paused || Math.abs(el.scrollLeft - s.pos) >= 1) el.scrollLeft = s.pos;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tiles.length]);

  if (tiles.length === 0) return null;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    s.pointerDown = true;
    s.suppressClick = false;
    // Cảm ứng dùng cuộn gốc của trình duyệt; chỉ chuột mới cần tự xử lý kéo.
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    s.startX = event.clientX;
    s.startPos = event.currentTarget.scrollLeft;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    const el = event.currentTarget;
    if (!s.pointerDown || event.pointerType !== "mouse") return;
    const dx = event.clientX - s.startX;
    if (!s.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      s.dragging = true;
      // Chỉ bắt con trỏ khi đã thật sự kéo, để cú bấm thường vẫn tới được thẻ.
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
    }
    const half = el.scrollWidth / 2;
    let next = s.startPos - dx;
    // Vòng lặp vô hạn khi kéo: dời mốc bắt đầu theo nửa dải thay vì chạm mép.
    if (next >= half) { s.startPos -= half; next -= half; }
    else if (next < 0) { s.startPos += half; next += half; }
    s.pos = next;
    el.scrollLeft = next;
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    s.pointerDown = false;
    if (!s.dragging) return;
    s.dragging = false;
    s.suppressClick = true;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  // Vừa kéo xong thì nuốt cú click, tránh mở nhầm dự án dưới con trỏ.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!state.current.suppressClick) return;
    state.current.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={viewportRef}
      className="hero-marquee"
      role="region"
      aria-label="Dự án đang gây quỹ"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") state.current.hovering = true; }}
      onPointerLeave={() => { state.current.hovering = false; }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onClickCapture={onClickCapture}
      onDragStart={(event) => event.preventDefault()}
    >
      <ul className="hero-marquee-track">
        {track.map((campaign, index) => {
          const copy = index >= tiles.length;
          const cover = coverFor(campaign);
          const progress = Math.min(campaignProgress(campaign), 100);
          return (
            <li className="hero-tile" key={`${campaign.slug}-${index}`} aria-hidden={copy || undefined}>
              <Link href={`/du-an/${campaign.slug}`} tabIndex={copy ? -1 : undefined}>
                {/* Tải sẵn mọi ảnh: tải lười làm ô sắp trôi vào còn trống rồi ảnh mới bật ra, trông như dải bị khựng. */}
                <Image src={cover.src} alt="" fill sizes="380px" loading="eager" unoptimized={!cover.illustrative} />
                <span className="hero-tile-caption">
                  <span className="hero-tile-cat">{campaign.category}</span>
                  <span className="hero-tile-title">{campaign.title}</span>
                  <span className="hero-tile-bar" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
