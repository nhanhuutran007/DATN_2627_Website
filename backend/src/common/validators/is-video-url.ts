import { ValidateBy, type ValidationOptions } from "class-validator";

/** Đường dẫn video do `POST /media/videos` cấp (tương đối, không phụ thuộc tên miền). */
export const MEDIA_VIDEO_PATH = /^\/api\/v1\/media\/campaign-videos\/[0-9a-f-]{36}\.(mp4|webm)$/;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Mã video YouTube (11 ký tự) từ các dạng link thường gặp: `youtube.com/watch?v=…`,
 * `youtu.be/…`, `youtube.com/shorts/…`, `youtube.com/embed/…`, `youtube.com/live/…`.
 * Trả `null` nếu không phải link YouTube hợp lệ.
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
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = /^\/(shorts|embed|live)\/([^/]+)/.exec(url.pathname);
      id = match ? match[2] : null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Link YouTube → dạng chuẩn `https://www.youtube.com/watch?v=<id>`; video tải lên giữ nguyên. */
export function normalizeVideoUrl(value: string): string {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : value.trim();
}

export function isCampaignVideoUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return MEDIA_VIDEO_PATH.test(value) || youtubeVideoId(value) !== null;
}

/** Link YouTube hoặc video đã tải lên hệ thống (`/api/v1/media/campaign-videos/…`). */
export function IsCampaignVideoUrl(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: "isCampaignVideoUrl",
      validator: {
        validate: (value) => isCampaignVideoUrl(value),
        defaultMessage: () => "Video phải là link YouTube hoặc video đã tải lên hệ thống.",
      },
    },
    options,
  );
}
