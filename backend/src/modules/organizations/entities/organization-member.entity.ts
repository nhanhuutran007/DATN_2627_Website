import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { User } from "../../users/entities/user.entity";
import { Organization } from "./organization.entity";

export enum MemberStatus {
  /** Đã mời, chờ người được mời chấp nhận. */
  PENDING = "pending",
  ACTIVE = "active",
}

/** Từng quyền người đại diện gán cho cộng tác viên (như Kickstarter). */
export enum OrgPermission {
  /** Sửa phần giới thiệu của hồ sơ tổ chức (không gồm thông tin pháp lý). */
  EDIT_PROFILE = "editProfile",
  /** Đăng/sửa/xóa bài cập nhật trên chiến dịch của tổ chức. */
  POST_UPDATES = "postUpdates",
  /** Quản lý mốc, báo cáo tiến độ và chi tiêu (kèm chứng từ). */
  REPORT_PROGRESS = "reportProgress",
  /** Quản lý mức quà và xem danh sách người nhận quà để gửi quà. */
  MANAGE_REWARDS = "manageRewards",
}

export const ORG_PERMISSIONS = Object.values(OrgPermission);

/** Cột tương ứng với từng quyền. */
export const PERMISSION_COLUMN: Record<OrgPermission, keyof OrganizationMember> = {
  [OrgPermission.EDIT_PROFILE]: "canEditProfile",
  [OrgPermission.POST_UPDATES]: "canPostUpdates",
  [OrgPermission.REPORT_PROGRESS]: "canReportProgress",
  [OrgPermission.MANAGE_REWARDS]: "canManageRewards",
};

@Entity("organization_members")
@Unique("uq_organization_members_org_user", ["organizationId", "userId"])
export class OrganizationMember extends BaseEntity {
  @Column({ name: "organization_id", length: 36 })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization?: Organization;

  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ name: "invited_by", length: 36 })
  invitedBy!: string;

  /** Chức danh hiển thị công khai, vd. "Điều phối truyền thông". */
  @Column({ length: 100 })
  title!: string;

  @Column({ type: "enum", enum: MemberStatus, default: MemberStatus.PENDING })
  status!: MemberStatus;

  @Column({ name: "can_edit_profile", default: false })
  canEditProfile!: boolean;

  @Column({ name: "can_post_updates", default: false })
  canPostUpdates!: boolean;

  @Column({ name: "can_report_progress", default: false })
  canReportProgress!: boolean;

  @Column({ name: "can_manage_rewards", default: false })
  canManageRewards!: boolean;

  @Column({ name: "accepted_at", type: "datetime", nullable: true })
  acceptedAt?: Date | null;
}
