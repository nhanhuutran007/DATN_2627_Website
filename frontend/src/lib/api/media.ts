import { apiFetch } from "../api";

export type MediaPurpose = "campaign_image" | "progress_image" | "avatar";

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
