"use client";

import { resolveMediaUrl } from "@/lib/api";
import { videoSource, youtubeEmbedUrl } from "@/lib/video";

type VideoPlayerProps = {
  url: string;
  title: string;
  autoplay?: boolean;
  className?: string;
};

/**
 * Phát video ngay trên trang (không chuyển sang YouTube): link YouTube nhúng bằng iframe chế độ
 * hạn chế cookie, video tải lên phát bằng trình phát của trình duyệt.
 */
export function VideoPlayer({ url, title, autoplay = false, className }: VideoPlayerProps) {
  const source = videoSource(url);
  if (!source) return null;
  const classes = `video-player${className ? ` ${className}` : ""}`;

  if (source.kind === "youtube") {
    return (
      <iframe
        className={classes}
        src={youtubeEmbedUrl(source.id, autoplay)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <video className={classes} src={resolveMediaUrl(source.url)} title={title} controls autoPlay={autoplay} playsInline preload="metadata" />
  );
}
