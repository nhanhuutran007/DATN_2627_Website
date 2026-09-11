import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum NotificationType {
  CAMPAIGN_APPROVED = "campaign_approved",
  CAMPAIGN_REJECTED = "campaign_rejected",
  DONATION_RECEIVED = "donation_received",
  MILESTONE_COMPLETED = "milestone_completed",
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

  @Column({ name: "is_read", default: false })
  isRead!: boolean;

  @Column({ name: "related_id", length: 36, nullable: true })
  relatedId?: string;
}
