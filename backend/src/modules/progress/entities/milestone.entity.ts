import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

@Entity("milestones")
export class Milestone extends BaseEntity {
  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign", "milestones")
  @JoinColumn({ name: "campaign_id" })
  campaign!: any;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "target_date", type: "datetime", nullable: true })
  targetDate?: Date;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  budget?: number;

  @Column({ name: "sort_order", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_completed", default: false })
  isCompleted!: boolean;

  @Column({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Date;

  @OneToMany("MilestoneUpdate", "milestone")
  updates!: any[];
}