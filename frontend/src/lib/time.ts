/** "vừa xong", "5 phút trước", "3 ngày trước"… quá 30 ngày thì hiện ngày. */
export function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return "vừa xong";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString("vi-VN");
}
