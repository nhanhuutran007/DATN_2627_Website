import { BadRequestException } from "@nestjs/common";
import { Between, FindOperator, LessThanOrEqual, MoreThanOrEqual } from "typeorm";

/** Điều kiện "từ … đến …" cho một cột số; bỏ trống cả hai thì không lọc. */
export function rangeFilter(min: number | undefined, max: number | undefined, label: string): FindOperator<number> | undefined {
  if (min !== undefined && max !== undefined) {
    if (min > max) {
      throw new BadRequestException(`${label}: min must not exceed max`);
    }
    return Between(min, max);
  }
  if (min !== undefined) return MoreThanOrEqual(min);
  if (max !== undefined) return LessThanOrEqual(max);
  return undefined;
}
