import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Từng quyền của cộng tác viên (thiếu = false khi mời, giữ nguyên khi sửa). */
export class MemberPermissionsDto {
  @IsOptional()
  @IsBoolean()
  editProfile?: boolean;

  @IsOptional()
  @IsBoolean()
  postUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  reportProgress?: boolean;

  @IsOptional()
  @IsBoolean()
  manageRewards?: boolean;
}

export class InviteMemberDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: "Email không hợp lệ." })
  @MaxLength(255)
  email!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Chức danh cần ít nhất 2 ký tự." })
  @MaxLength(100)
  title!: string;

  @ValidateNested()
  @Type(() => MemberPermissionsDto)
  permissions!: MemberPermissionsDto;
}

export class UpdateMemberDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Chức danh cần ít nhất 2 ký tự." })
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MemberPermissionsDto)
  permissions?: MemberPermissionsDto;
}

export type MemberPermissions = Required<MemberPermissionsDto>;

/** Cộng tác viên trong trang quản lý (người đại diện và các thành viên xem). */
export type MemberView = {
  id: string;
  organizationId: string;
  user: { id: string; name: string; email: string; avatar: string | null };
  title: string;
  status: "pending" | "active";
  permissions: MemberPermissions;
  invitedAt: Date;
  acceptedAt: Date | null;
};

/** Đội ngũ công khai trên trang tổ chức. */
export type TeamMemberView = { name: string; avatar: string | null; title: string; role: "representative" | "collaborator" };

/** Lời mời đang chờ hoặc tổ chức mình đang cộng tác (trang "Tổ chức của tôi"). */
export type CollaborationView = {
  memberId: string;
  status: "pending" | "active";
  title: string;
  permissions: MemberPermissions;
  organization: { id: string; slug: string; name: string; logoUrl: string | null; status: string };
  /** Chiến dịch của tổ chức mà mình được thao tác (chỉ khi `active`). */
  campaigns: { id: string; title: string; status: string; organizationId: string | null }[];
};
