import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

/** Nhóm hành động theo tiền tố mã (vd. "refund." thuộc tài chính). */
export const AUDIT_ACTION_GROUPS = {
  auth: ["auth."],
  account: ["user."],
  finance: ["donation.", "refund.", "finance."],
  content: ["campaign.", "category.", "comment.", "milestone", "reward_tier.", "report.", "media.", "risk_alert."],
  system: ["backup.", "admin."],
} as const;
export type AuditActionGroup = keyof typeof AUDIT_ACTION_GROUPS;

/** Đăng nhập/đăng xuất thông thường: rất nhiều, ít giá trị truy vết nên cho phép ẩn. */
export const AUDIT_SESSION_ACTIONS = ["auth.login.success", "auth.google.login", "auth.logout", "auth.logout_all"];

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(Object.keys(AUDIT_ACTION_GROUPS))
  group?: AuditActionGroup;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  hideSessions?: boolean;

  /** Ngày theo giờ Việt Nam (yyyy-mm-dd), tính cả ngày. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
