/**
 * Thời gian gây quỹ cho phép: ít nhất 1 tháng, tối đa 60 ngày (như Kickstarter). Mô hình dự đoán học
 * từ Kickstarter nên thời hạn trong khoảng này cũng là vùng mô hình có nhiều dữ liệu nhất.
 */
export const MAX_CAMPAIGN_DURATION_DAYS = 60;

const DAY_MS = 86_400_000;

/** Số ngày gây quỹ tính từ lúc bắt đầu (hoặc từ bây giờ nếu ngày bắt đầu đã qua/không có). */
export function campaignDurationDays(endDate: Date, startDate: Date | null | undefined, now = new Date()): number {
  const start = startDate && startDate.getTime() > now.getTime() ? startDate : now;
  return (endDate.getTime() - start.getTime()) / DAY_MS;
}

/** Vượt tối đa? Cho phép lệch 1 ngày (chọn ngày theo giờ địa phương, lưu theo UTC). */
export function exceedsMaxDuration(endDate: Date, startDate: Date | null | undefined, now = new Date()): boolean {
  return campaignDurationDays(endDate, startDate, now) > MAX_CAMPAIGN_DURATION_DAYS + 1;
}
