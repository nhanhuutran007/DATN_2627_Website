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

/** Đầu ngày / cuối ngày theo giờ Việt Nam (UTC+7) của chuỗi "yyyy-mm-dd" admin chọn trên lịch. */
export function vnDayStart(day: string): Date {
  return new Date(`${day.slice(0, 10)}T00:00:00.000+07:00`);
}

export function vnDayEnd(day: string): Date {
  return new Date(`${day.slice(0, 10)}T23:59:59.999+07:00`);
}

/**
 * Điều kiện "từ ngày … đến ngày …" (giờ VN, bao gồm cả hai ngày) cho một cột thời gian;
 * thiếu một đầu thì để mở, bỏ trống cả hai thì không lọc.
 */
export function vnDateRange(from: string | undefined, to: string | undefined): FindOperator<Date> | undefined {
  const start = from ? vnDayStart(from) : undefined;
  const end = to ? vnDayEnd(to) : undefined;
  if (start && end) {
    if (start > end) {
      throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc.");
    }
    return Between(start, end);
  }
  if (start) return MoreThanOrEqual(start);
  if (end) return LessThanOrEqual(end);
  return undefined;
}
