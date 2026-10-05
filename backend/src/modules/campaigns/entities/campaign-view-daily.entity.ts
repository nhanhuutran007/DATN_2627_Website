import { Column, Entity, PrimaryColumn } from "typeorm";

/** Lượt xem chiến dịch theo ngày UTC (bảng đếm tổng hợp, khóa = chiến dịch + ngày). */
@Entity("campaign_view_daily")
export class CampaignViewDaily {
  @PrimaryColumn({ name: "campaign_id", length: 36 })
  campaignId!: string;

  /** `YYYY-MM-DD` theo UTC. */
  @PrimaryColumn({ name: "view_date", type: "date" })
  viewDate!: string;

  @Column({ type: "int", default: 0 })
  views!: number;
}
