import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

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

  @Column({ type: "text" })
  description!: string;

  @Column({ length: 100 })
  category!: string;

  @Column({ name: "owner_id" })
  ownerId!: string;

  @ManyToOne("User", "campaigns")
  @JoinColumn({ name: "owner_id" })
  owner!: any;

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

  @Column({ name: "image_url", length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: "video_url", length: 500, nullable: true })
  videoUrl?: string;

  @Column({ name: "location", length: 255, nullable: true })
  location?: string;

  @Column({ name: "backer_count", default: 0 })
  backerCount!: number;

  @Column({ name: "view_count", default: 0 })
  viewCount!: number;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason?: string;

  @OneToMany("Donation", "campaign")
  donations!: any[];

  @OneToMany("Milestone", "campaign")
  milestones!: any[];
}
