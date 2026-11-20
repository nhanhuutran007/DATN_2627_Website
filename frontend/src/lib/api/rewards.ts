import { api } from "../api";

/** Một món "Bao gồm" của phần quà. */
export type RewardItem = { name: string; quantity: number };

export type RewardTier = {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  minAmount: number;
  /** `null` = không giới hạn. */
  quantityLimit: number | null;
  claimedCount: number;
  remaining: number | null;
  estimatedDelivery: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string | null;
  items?: RewardItem[];
  /** Cần giao tận nơi (hỏi địa chỉ); `false` = quà số/ghi danh. Thiếu = true (API cũ). */
  requiresShipping?: boolean;
  /** Hạn chọn quà; `null` = đến hết chiến dịch. */
  availableUntil?: string | null;
  /** Còn chọn được: đang mở, còn suất, chưa quá hạn. */
  available?: boolean;
};

export type RewardTierPayload = {
  title: string;
  description: string;
  minAmount: number;
  quantityLimit?: number | null;
  estimatedDelivery?: string | null;
  sortOrder?: number;
  imageUrl?: string | null;
  items?: RewardItem[];
  requiresShipping?: boolean;
  availableUntil?: string | null;
};

export type RewardClaim = {
  donationId: string;
  tierId: string;
  tierTitle: string;
  amount: number;
  backerName: string;
  /** `completed`: đã thu tiền; `pledged`/`charge_failed`: cam kết, chờ trừ tiền. */
  status?: string;
  completedAt: string | null;
  /** Thông tin gửi quà; `null` với khoản ủng hộ cũ chưa có thông tin này. */
  recipient: { name: string; phone: string; address: string } | null;
};

export const MIN_REWARD_AMOUNT = 20_000;
export const MAX_REWARD_ITEMS = 10;

/** Mức quà còn chọn được (API cũ không có `available`: suy từ trạng thái và số suất). */
export function isRewardAvailable(tier: RewardTier): boolean {
  if (tier.available !== undefined) return tier.available;
  return tier.isActive && tier.remaining !== 0;
}

/** "Tháng 3/2027" — Kickstarter ghi tháng/năm dự kiến giao quà. */
export function deliveryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function fetchRewardTiers(campaignId: string): Promise<RewardTier[]> {
  return api.get<RewardTier[]>(`/campaigns/${encodeURIComponent(campaignId)}/reward-tiers`);
}

export function fetchManagedRewardTiers(campaignId: string): Promise<RewardTier[]> {
  return api.get<RewardTier[]>(`/campaigns/${encodeURIComponent(campaignId)}/reward-tiers/manage`);
}

export function fetchRewardClaims(campaignId: string): Promise<RewardClaim[]> {
  return api.get<RewardClaim[]>(`/campaigns/${encodeURIComponent(campaignId)}/reward-claims`);
}

export function createRewardTier(campaignId: string, payload: RewardTierPayload): Promise<RewardTier> {
  return api.post<RewardTier>(`/campaigns/${encodeURIComponent(campaignId)}/reward-tiers`, payload);
}

export function updateRewardTier(id: string, payload: Partial<RewardTierPayload> & { isActive?: boolean }): Promise<RewardTier> {
  return api.patch<RewardTier>(`/reward-tiers/${encodeURIComponent(id)}`, payload);
}

export async function deleteRewardTier(id: string): Promise<void> {
  await api.del(`/reward-tiers/${encodeURIComponent(id)}`);
}
