import { Column, DeleteDateColumn, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum MediaPurpose {
  CAMPAIGN_IMAGE = "campaign_image",
  PROGRESS_IMAGE = "progress_image",
  AVATAR = "avatar",
}

@Entity("media_files")
export class MediaFile extends BaseEntity {
  @Column({ name: "owner_id" })
  ownerId!: string;

  /** Khóa trong kho lưu trữ, vd. `campaigns/<uuid>.webp` (server sinh). */
  @Column({ name: "storage_key", length: 120, unique: true })
  storageKey!: string;

  @Column({ name: "mime_type", length: 50 })
  mimeType!: string;

  @Column({ name: "size_bytes", type: "int" })
  sizeBytes!: number;

  @Column({ type: "enum", enum: MediaPurpose })
  purpose!: MediaPurpose;

  /** Tên file gốc (đã cắt gọn), chỉ để hiển thị/đối soát; không dùng làm đường dẫn. */
  @Column({ name: "original_name", type: "varchar", length: 255, nullable: true })
  originalName?: string | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
