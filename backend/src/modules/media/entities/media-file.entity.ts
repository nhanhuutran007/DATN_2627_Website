import { Column, DeleteDateColumn, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum MediaPurpose {
  CAMPAIGN_IMAGE = "campaign_image",
  PROGRESS_IMAGE = "progress_image",
  AVATAR = "avatar",
  EXPENSE_RECEIPT = "expense_receipt",
  /** Ảnh chứng từ chuyển khoản hoàn tiền thủ công — chỉ admin tải lên. */
  REFUND_PROOF = "refund_proof",
  ORGANIZATION_LOGO = "organization_logo",
  /** Ảnh chụp giấy phép/quyết định thành lập để admin xác minh tổ chức. */
  ORGANIZATION_DOCUMENT = "organization_document",
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

  /** SHA-256 của ảnh chứng từ, phát hiện file trùng y hệt. Chỉ có ở `expense_receipt`. */
  @Column({ name: "content_hash", type: "char", length: 64, nullable: true })
  contentHash?: string | null;

  /** Dấu vân hình ảnh, phát hiện ảnh gần giống (xem `image-fingerprint.ts`). */
  @Column({ name: "perceptual_hash", type: "varchar", length: 512, nullable: true })
  perceptualHash?: string | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
