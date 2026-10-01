import { IsEnum, IsOptional } from "class-validator";

import { MediaPurpose } from "../entities/media-file.entity";

export class UploadImageDto {
  @IsOptional()
  @IsEnum(MediaPurpose, { message: "Mục đích ảnh không hợp lệ." })
  purpose?: MediaPurpose;
}

export type UploadedImageResponse = {
  id: string;
  /** Đường dẫn tương đối, dùng trực tiếp cho `imageUrl` của chiến dịch/bài cập nhật. */
  url: string;
  mimeType: string;
  sizeBytes: number;
};
