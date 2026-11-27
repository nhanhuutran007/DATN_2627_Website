import { apiFetch, apiUpload } from "../api";

export type MediaPurpose =
  | "campaign_image"
  | "progress_image"
  | "avatar"
  | "expense_receipt"
  | "refund_proof"
  | "organization_logo"
  | "organization_document"
  | "category_image"
  | "campaign_video";

export type UploadedImage = {
  id: string;
  /** Đường dẫn tương đối `/api/v1/media/...`, gửi thẳng vào `imageUrl`. */
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Kiểm tra sơ bộ phía trình duyệt; server vẫn kiểm tra lại nội dung file. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh tối đa 5 MB.";
  if (file.size === 0) return "File ảnh rỗng.";
  return null;
}

export async function uploadImage(file: File, purpose: MediaPurpose = "campaign_image"): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  return apiFetch<UploadedImage>("/media/images", { method: "POST", body: form });
}

/**
 * Video giới thiệu giới hạn theo thời lượng: tối đa 2 phút (Kickstarter khuyên video dưới 2 phút).
 * Dung lượng chỉ là giới hạn kỹ thuật, khớp `MAX_VIDEO_BYTES` / `MAX_VIDEO_SECONDS` ở backend.
 */
export const MAX_VIDEO_SECONDS = 120;
/** Lệch vài giây do làm tròn khi xuất video. */
const VIDEO_DURATION_TOLERANCE = 2;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** MOV (iPhone) cũng nhận: cùng họ định dạng với MP4, server kiểm tra lại theo nội dung file. */
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export function validateVideoFile(file: File): string | null {
  if (file.type && !ACCEPTED_VIDEO_TYPES.includes(file.type)) return "Chỉ chấp nhận video MP4, MOV hoặc WebM.";
  if (file.size === 0) return "File video rỗng.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `Video quá lớn (tối đa ${MAX_VIDEO_BYTES / 1024 / 1024} MB). Hãy xuất lại ở 1080p hoặc thấp hơn.`;
  }
  return null;
}

/** Thời lượng video (giây) đọc từ metadata ở trình duyệt; `null` nếu trình duyệt không đọc được. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(value);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/** Lỗi thời lượng: video dài hơn 2 phút. */
export async function validateVideoDuration(file: File): Promise<string | null> {
  const seconds = await readVideoDuration(file);
  if (seconds !== null && seconds > MAX_VIDEO_SECONDS + VIDEO_DURATION_TOLERANCE) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return `Video dài ${minutes} phút ${rest} giây, vượt giới hạn ${MAX_VIDEO_SECONDS / 60} phút. Hãy cắt ngắn rồi tải lên lại.`;
  }
  return null;
}

/** Video giới thiệu dự án; `onProgress` nhận 0–1. Trả đường dẫn để gửi vào `videoUrl`. */
export function uploadVideo(file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<UploadedImage>("/media/videos", form, onProgress, signal);
}
