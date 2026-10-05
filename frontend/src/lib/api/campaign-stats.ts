import { api } from "../api";

export type CampaignDailyPoint = { date: string; views: number; donations: number; amount: number };

export type CampaignStats = {
  campaignId: string;
  viewCount: number;
  backerCount: number;
  followerCount: number;
  currentAmount: number;
  goalAmount: number;
  /** Lượt ủng hộ thành công / lượt xem (0–1); null khi chưa có lượt xem. */
  conversionRate: number | null;
  days: number;
  daily: CampaignDailyPoint[];
};

/** Số liệu chiến dịch cho chủ dự án/admin. */
export function fetchCampaignStats(campaignId: string, days = 30): Promise<CampaignStats> {
  return api.get<CampaignStats>(`/campaigns/${encodeURIComponent(campaignId)}/stats?days=${days}`);
}

const VIEWED_KEY = "gopmam.viewedCampaigns";

/**
 * Ghi một lượt xem (server tự chống đếm trùng 30 phút). Trình duyệt chỉ gửi một
 * lần mỗi phiên tab cho mỗi chiến dịch để đỡ request thừa; lỗi được bỏ qua.
 */
export async function recordCampaignView(campaignId: string): Promise<void> {
  try {
    const seen = new Set<string>(JSON.parse(window.sessionStorage.getItem(VIEWED_KEY) ?? "[]") as string[]);
    if (seen.has(campaignId)) return;
    seen.add(campaignId);
    window.sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...seen].slice(-50)));
  } catch {
    // sessionStorage bị chặn: vẫn gửi, server chống trùng.
  }
  try {
    // apiFetch tự gửi kèm token nếu đã đăng nhập → chủ dự án tự xem không bị tính.
    await api.post(`/campaigns/${encodeURIComponent(campaignId)}/views`);
  } catch {
    return;
  }
}
