/** Đường dẫn video do `POST /media/videos` cấp. */
const UPLOADED_VIDEO_PATH = /^\/api\/v1\/media\/campaign-videos\/[0-9a-f-]{36}\.(mp4|webm)$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Mã video YouTube từ các dạng link thường gặp (watch?v=, youtu.be, shorts, embed, live).
 * Khớp `youtubeVideoId` ở backend (`common/validators/is-video-url.ts`).
 */
export function youtubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = /^\/(shorts|embed|live)\/([^/]+)/.exec(url.pathname)?.[2] ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function isUploadedVideo(value: string): boolean {
  return UPLOADED_VIDEO_PATH.test(value);
}

export type VideoSource = { kind: "youtube"; id: string } | { kind: "file"; url: string };

/** Nguồn phát của `videoUrl` đã lưu; `null` nếu không hợp lệ. */
export function videoSource(value: string | null | undefined): VideoSource | null {
  if (!value) return null;
  if (isUploadedVideo(value)) return { kind: "file", url: value };
  const id = youtubeVideoId(value);
  return id ? { kind: "youtube", id } : null;
}

/** Link nhúng YouTube chế độ hạn chế cookie, không gợi ý video của kênh khác khi xem xong. */
export function youtubeEmbedUrl(id: string, autoplay: boolean): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
