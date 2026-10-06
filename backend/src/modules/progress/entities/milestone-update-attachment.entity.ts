import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/** Chứng từ chi tiêu (ảnh hóa đơn/biên lai) đính kèm một bài cập nhật tiến độ. */
@Entity("milestone_update_attachments")
export class MilestoneUpdateAttachment extends BaseEntity {
  @Column({ name: "milestone_update_id" })
  milestoneUpdateId!: string;

  @ManyToOne("MilestoneUpdate", "attachments", { onDelete: "CASCADE" })
  @JoinColumn({ name: "milestone_update_id" })
  milestoneUpdate?: unknown;

  /** File đã tải lên với mục đích `expense_receipt` (mỗi file chỉ gắn một lần). */
  @Column({ name: "media_file_id" })
  mediaFileId!: string;

  /** Đường dẫn công khai `/api/v1/media/receipts/...` (file bất biến nên lưu sẵn). */
  @Column({ length: 500 })
  url!: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  caption?: string | null;

  @Column({ name: "sort_order", default: 0 })
  sortOrder!: number;
}
