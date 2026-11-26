/**
 * Thời gian gây quỹ cho phép: 7–60 ngày (như Kickstarter: tối đa 60 ngày), **tính từ lúc chủ dự án
 * phát hành**, không phải từ lúc tạo hồ sơ. Hồ sơ cần 24–48 giờ để duyệt nên khi chọn ngày kết thúc
 * lúc tạo/gửi duyệt được cộng thêm `REVIEW_BUFFER_DAYS` ngày dự trù.
 */
export const MIN_CAMPAIGN_DURATION_DAYS = 7;
export const MAX_CAMPAIGN_DURATION_DAYS = 60;
/** Số ngày dự trù cho thời gian chờ duyệt (cam kết duyệt trong 24–48 giờ, cộng 1 ngày dư). */
export const REVIEW_BUFFER_DAYS = 3;
/** Thời hạn cam kết xét duyệt (giờ) hiển thị cho chủ dự án và dùng để đánh dấu hồ sơ quá hạn ở admin. */
export const REVIEW_SLA_HOURS = 48;

const DAY_MS = 86_400_000;
/** Cho phép lệch 1 ngày (chọn ngày theo giờ địa phương, lưu theo UTC). */
const TOLERANCE_DAYS = 1;

/** Số ngày gây quỹ tính từ lúc bắt đầu (hoặc từ bây giờ nếu ngày bắt đầu đã qua/không có). */
export function campaignDurationDays(endDate: Date, startDate: Date | null | undefined, now = new Date()): number {
  const start = startDate && startDate.getTime() > now.getTime() ? startDate : now;
  return (endDate.getTime() - start.getTime()) / DAY_MS;
}

/** Vượt tối đa khi phát hành ngay bây giờ? */
export function exceedsMaxDuration(endDate: Date, startDate: Date | null | undefined, now = new Date()): boolean {
  return campaignDurationDays(endDate, startDate, now) > MAX_CAMPAIGN_DURATION_DAYS + TOLERANCE_DAYS;
}

export type DurationProblem = "too_short" | "too_long";

/**
 * Kiểm tra ngày kết thúc khi tạo/sửa/gửi duyệt: chiến dịch chưa phát hành nên khoảng cho phép
 * là [tối thiểu + dự trù duyệt, tối đa + dự trù duyệt] ngày kể từ bây giờ.
 * Riêng khi tạo/sửa nháp chỉ đòi tối thiểu (chưa biết bao giờ gửi), còn gửi duyệt đòi cả dự trù.
 */
export function draftDurationProblem(
  endDate: Date,
  now = new Date(),
  options: { requireReviewBuffer: boolean } = { requireReviewBuffer: false },
): DurationProblem | null {
  const days = (endDate.getTime() - now.getTime()) / DAY_MS;
  const min = MIN_CAMPAIGN_DURATION_DAYS + (options.requireReviewBuffer ? REVIEW_BUFFER_DAYS : 0);
  if (days < min - TOLERANCE_DAYS) return "too_short";
  if (days > MAX_CAMPAIGN_DURATION_DAYS + REVIEW_BUFFER_DAYS + TOLERANCE_DAYS) return "too_long";
  return null;
}

/** Kiểm tra ngày kết thúc lúc phát hành: thời gian gây quỹ thật (từ bây giờ) phải trong 7–60 ngày. */
export function publishDurationProblem(endDate: Date, now = new Date()): DurationProblem | null {
  const days = (endDate.getTime() - now.getTime()) / DAY_MS;
  if (days < MIN_CAMPAIGN_DURATION_DAYS - TOLERANCE_DAYS) return "too_short";
  if (days > MAX_CAMPAIGN_DURATION_DAYS + TOLERANCE_DAYS) return "too_long";
  return null;
}
