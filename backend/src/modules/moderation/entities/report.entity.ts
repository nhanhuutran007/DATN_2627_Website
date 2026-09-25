import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";
import type { User } from "../../users/entities/user.entity";

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
  reporter?: User;

  @Column({ name: "campaign_id", type: "varchar", nullable: true })
  campaignId?: string | null;

  @ManyToOne("Campaign", { nullable: true })
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign | null;

  @Column({ type: "enum", enum: ReportReason })
  reason!: ReportReason;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "enum", enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes?: string | null;

  /** Admin đã xử lý (chuyển reviewing/resolved/dismissed) lần gần nhất. */
  @Column({ name: "resolved_by", type: "varchar", nullable: true })
  resolvedBy?: string | null;

  @Column({ name: "resolved_at", type: "datetime", nullable: true })
  resolvedAt?: Date | null;

  /** Chiến dịch đã bị tạm dừng như một phần của việc xử lý báo cáo này. */
  @Column({ name: "campaign_paused", type: "boolean", default: false })
  campaignPaused!: boolean;
}
