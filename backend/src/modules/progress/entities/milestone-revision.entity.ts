import { Exclude } from "class-transformer";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/** Giá trị một lần sửa mốc (chỉ các trường thay đổi). */
export type MilestoneRevisionValues = {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  budget?: number | null;
};

/** Một lần sửa mốc sau khi chiến dịch đã phát hành — công khai, kèm lý do. */
@Entity("milestone_revisions")
export class MilestoneRevision extends BaseEntity {
  @Column({ name: "milestone_id" })
  milestoneId!: string;

  @ManyToOne("Milestone", { onDelete: "CASCADE" })
  @JoinColumn({ name: "milestone_id" })
  milestone?: unknown;

  /** Người sửa; không trả ra API công khai. */
  @Exclude({ toPlainOnly: true })
  @Column({ name: "changed_by" })
  changedBy!: string;

  @Column({ length: 500 })
  reason!: string;

  @Column({ name: "old_values", type: "simple-json" })
  oldValues!: MilestoneRevisionValues;

  @Column({ name: "new_values", type: "simple-json" })
  newValues!: MilestoneRevisionValues;
}
