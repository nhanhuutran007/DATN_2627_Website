import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum ReportStatus {
  PENDING = "pending",
  REVIEWING = "reviewing",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export enum ReportReason {
  SPAM = "spam",
  FRAUD = "fraud",
  INAPPROPRIATE = "inappropriate",
  MISINFORMATION = "misinformation",
  OTHER = "other",
}

@Entity("reports")
export class Report extends BaseEntity {
  @Column({ name: "reporter_id" })
  reporterId!: string;

  @ManyToOne("User")
  @JoinColumn({ name: "reporter_id" })
  reporter!: any;

  @Column({ name: "campaign_id", nullable: true })
  campaignId?: string;

  @ManyToOne("Campaign", { nullable: true })
  @JoinColumn({ name: "campaign_id" })
  campaign?: any;

  @Column({ type: "enum", enum: ReportReason })
  reason!: ReportReason;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "enum", enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes?: string;

  @Column({ name: "resolved_at", type: "datetime", nullable: true })
  resolvedAt?: Date;
}
