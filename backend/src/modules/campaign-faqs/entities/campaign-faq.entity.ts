import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";

/** Câu hỏi thường gặp do chủ dự án tự soạn (như mục FAQ của Kickstarter). */
@Entity("campaign_faqs")
export class CampaignFaq extends BaseEntity {
  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign", { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;

  @Column({ length: 300 })
  question!: string;

  @Column({ type: "text" })
  answer!: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;
}
