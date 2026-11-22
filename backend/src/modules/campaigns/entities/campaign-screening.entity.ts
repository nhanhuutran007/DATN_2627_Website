import { Column, Entity, JoinColumn, OneToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { ScreeningCheck, ScreeningLevel, ScreeningRecommendation } from "../campaign-screening.rules";
import { Campaign } from "./campaign.entity";

/**
 * Kết quả duyệt tự động mới nhất của một chiến dịch (chỉ admin xem). Không quyết định thay admin:
 * chỉ xếp hạng hàng đợi và, khi admin bật chế độ tự phát hành, cho qua hồ sơ rủi ro thấp đủ điều kiện.
 */
@Entity("campaign_screenings")
export class CampaignScreening extends BaseEntity {
  @Column({ name: "campaign_id", type: "char", length: 36, unique: true })
  campaignId!: string;

  @OneToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;

  /** 0 (an toàn) – 100 (rủi ro rất cao). */
  @Column({ type: "int" })
  score!: number;

  @Column({ type: "varchar", length: 10 })
  level!: ScreeningLevel;

  @Column({ type: "varchar", length: 20 })
  recommendation!: ScreeningRecommendation;

  @Column({ type: "json" })
  checks!: ScreeningCheck[];

  @Column({ name: "rules_version", type: "varchar", length: 20 })
  rulesVersion!: string;

  /** Hệ thống đã tự phát hành chiến dịch theo kết quả này (chế độ duyệt tự động rủi ro thấp). */
  @Column({ name: "auto_approved", type: "boolean", default: false })
  autoApproved!: boolean;

  @Column({ name: "screened_at", type: "datetime" })
  screenedAt!: Date;
}
