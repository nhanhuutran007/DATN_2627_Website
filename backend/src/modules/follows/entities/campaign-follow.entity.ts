import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { Campaign } from "../../campaigns/entities/campaign.entity";

@Entity("campaign_follows")
@Unique("uq_campaign_follows_user_campaign", ["userId", "campaignId"])
export class CampaignFollow extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ name: "campaign_id", length: 36 })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;
}
