import { Column, Entity, Index } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum BehaviorEventType {
  VIEW = "view",
  FOLLOW = "follow",
  CONTRIBUTE = "contribute",
}

@Entity("behavior_events")
@Index(["userId", "eventType"])
@Index(["campaignId"])
export class BehaviorEvent extends BaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @Column({ name: "campaign_id" })
  campaignId!: string;

  @Column({ type: "enum", enum: BehaviorEventType })
  eventType!: BehaviorEventType;

  @Column({ length: 100 })
  category!: string;

  @Column({ name: "event_data", type: "json", nullable: true })
  eventData?: Record<string, unknown>;
}