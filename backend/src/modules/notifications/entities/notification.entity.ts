import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum NotificationType {
  CAMPAIGN_APPROVED = "campaign_approved",
  CAMPAIGN_REJECTED = "campaign_rejected",
  CAMPAIGN_NEEDS_INFO = "campaign_needs_info",
  CAMPAIGN_PAUSED = "campaign_paused",
  CAMPAIGN_RESUMED = "campaign_resumed",
  CAMPAIGN_ENDED = "campaign_ended",
  DONATION_RECEIVED = "donation_received",
  DONATION_CONFIRMED = "donation_confirmed",
  MILESTONE_COMPLETED = "milestone_completed",
  PROGRESS_UPDATE = "progress_update",
  REPORT_RESOLVED = "report_resolved",
  COMMENT_NEW = "comment_new",
  COMMENT_REPLY = "comment_reply",
  COMMENT_HIDDEN = "comment_hidden",
  REFUND_APPROVED = "refund_approved",
  REFUND_REJECTED = "refund_rejected",
  DONATION_REFUNDED = "donation_refunded",
  MILESTONE_OVERDUE = "milestone_overdue",
  MILESTONE_RESCHEDULED = "milestone_rescheduled",
  SYSTEM = "system",
}

@Entity("notifications")
export class Notification extends BaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne("User")
  @JoinColumn({ name: "user_id" })
  user!: any;

  @Column({ type: "enum", enum: NotificationType })
  type!: NotificationType;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  /** Đường dẫn tương đối trong web để mở khi bấm thông báo (vd. `/du-an/<id>`). */
  @Column({ type: "varchar", length: 300, nullable: true })
  link?: string | null;

  @Column({ name: "is_read", default: false })
  isRead!: boolean;

  @Column({ name: "related_id", length: 36, nullable: true })
  relatedId?: string;
}
