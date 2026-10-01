import { api } from "../api";

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
};

export type RewardTierPayload = {
  title: string;
  description: string;
  minAmount: number;
  quantityLimit?: number | null;
  estimatedDelivery?: string | null;
  sortOrder?: number;
};

export type RewardClaim = {
  donationId: string;
  tierId: string;
  tierTitle: string;
  amount: number;
  backerName: string;
  completedAt: string | null;
};

export const MIN_REWARD_AMOUNT = 20_000;

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
