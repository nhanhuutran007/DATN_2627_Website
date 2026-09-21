import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

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
