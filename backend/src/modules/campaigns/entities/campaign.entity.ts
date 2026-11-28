import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Donation } from "../../donations/entities/donation.entity";
import type { Milestone } from "../../progress/entities/milestone.entity";
import type { User } from "../../users/entities/user.entity";

export enum CampaignStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  NEEDS_INFO = "needs_info",
  ACTIVE = "active",
  PAUSED = "paused",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
  ENDED = "ended",
}

@Entity("campaigns")
export class Campaign extends BaseEntity {
  @Column({ length: 200 })
  title!: string;

  @Column({ type: "mediumtext" })
  description!: string;

  @Column({ length: 100 })
  category!: string;

  @Column({ name: "owner_id" })
  ownerId!: string;

  @ManyToOne("User", "campaigns")
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  /** Tổ chức thụ hưởng (đã xác minh); NULL = chiến dịch gây quỹ cá nhân. */
  @Column({ name: "organization_id", type: "char", length: 36, nullable: true })
  organizationId?: string | null;

  @ManyToOne("Organization")
  @JoinColumn({ name: "organization_id" })
  organization?: unknown;

  @Column({
    name: "goal_amount",
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  goalAmount!: number;

  @Column({
    name: "current_amount",
    type: "decimal",
    precision: 15,
    scale: 2,
    default: 0,
  })
  currentAmount!: number;

  @Column({ name: "start_date", type: "datetime" })
  startDate!: Date;

  @Column({ name: "end_date", type: "datetime" })
  endDate!: Date;

  @Column({ type: "enum", enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status!: CampaignStatus;

  /** Lần gửi duyệt gần nhất; hàng chờ duyệt xếp theo cột này. */
  @Column({ name: "submitted_at", type: "datetime", nullable: true })
  submittedAt?: Date | null;

  /** Admin chọn hiển thị ở mục "Dự án nổi bật" trang chủ. */
  @Column({ name: "is_featured", default: false })
  isFeatured!: boolean;

  @Column({ name: "featured_at", type: "datetime", nullable: true })
  featuredAt?: Date | null;

  /**
   * Dự án mô phỏng (`npm run seed:ai-history`) chỉ để AI có dữ liệu học: không hiện ở danh sách,
   * tìm kiếm, "Câu chuyện thành công" hay số liệu công khai.
   */
  @Column({ name: "is_simulated", default: false })
  isSimulated!: boolean;

  @Column({ name: "image_url", length: 500, nullable: true })
  imageUrl?: string;

  /** Link YouTube (dạng `youtube.com/watch?v=…`) hoặc video tải lên (`/api/v1/media/campaign-videos/…`). */
  @Column({ name: "video_url", type: "varchar", length: 500, nullable: true })
  videoUrl?: string | null;

  @Column({ name: "location", length: 255, nullable: true })
  location?: string;

  @Column({ name: "backer_count", default: 0 })
  backerCount!: number;

  @Column({ name: "view_count", default: 0 })
  viewCount!: number;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason?: string;

  /** Lý do chủ dự án tự hủy (công khai trên trang dự án). */
  @Column({ name: "cancel_reason", type: "varchar", length: 500, nullable: true })
  cancelReason?: string | null;

  @Column({ name: "cancelled_at", type: "datetime", nullable: true })
  cancelledAt?: Date | null;

  /** Trạng thái ngay trước khi chủ dự án hủy; chỉ `active` (đã công khai) mới còn xem công khai. */
  @Column({ name: "cancelled_from", type: "varchar", length: 20, nullable: true })
  cancelledFrom?: string | null;

  @OneToMany("Donation", "campaign")
  donations!: Donation[];

  @OneToMany("Milestone", "campaign")
  milestones!: Milestone[];
}
