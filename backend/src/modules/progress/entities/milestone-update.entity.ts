import { Column, Entity, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

@Entity("milestone_updates")
export class MilestoneUpdate extends BaseEntity {
  @Column({ name: "milestone_id" })
  milestoneId!: string;

  @ManyToOne("Milestone", "updates")
  milestone!: any;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "image_url", length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: "expense_amount", type: "decimal", precision: 15, scale: 2, nullable: true })
  expenseAmount?: number;
}