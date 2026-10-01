import { isURL, ValidateBy, type ValidationOptions } from "class-validator";

/** Đường dẫn ảnh do `POST /media/images` cấp (tương đối, không phụ thuộc tên miền). */
export const MEDIA_IMAGE_PATH = /^\/api\/v1\/media\/(campaigns|progress)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export function isImageUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (MEDIA_IMAGE_PATH.test(value)) return true;
  return isURL(value, { protocols: ["http", "https"], require_protocol: true });
}

/** Link ảnh `http(s)://…` hoặc ảnh đã tải lên hệ thống (`/api/v1/media/…`). */
export function IsImageUrl(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: "isImageUrl",
      validator: {
        validate: (value) => isImageUrl(value),
        defaultMessage: () => "Ảnh phải là link http(s) hoặc ảnh đã tải lên hệ thống.",
      },
    },
    options,
  );
}
