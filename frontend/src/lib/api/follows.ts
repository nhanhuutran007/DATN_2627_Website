import { api } from "../api";
import type { ApiCampaignStatus } from "./campaigns";

export type FollowStatus = { following: boolean; followerCount: number };

export type FollowedCampaign = {
  followedAt: string;
  campaign: {
    id: string;
    title: string;
    category: string;
    status: ApiCampaignStatus;
    goalAmount: number | string;
    currentAmount: number | string;
    endDate: string;
    imageUrl?: string | null;
    location?: string | null;
  };
};

export type FollowedCampaignPage = { items: FollowedCampaign[]; total: number; limit: number; offset: number };

const followPath = (campaignId: string) => `/campaigns/${encodeURIComponent(campaignId)}/follow`;

/** Số người theo dõi; `following` chỉ đúng khi đã đăng nhập. */
export function fetchFollowStatus(campaignId: string): Promise<FollowStatus> {
  return api.get<FollowStatus>(followPath(campaignId));
}

export function followCampaign(campaignId: string): Promise<FollowStatus> {
  return api.post<FollowStatus>(followPath(campaignId));
}

export function unfollowCampaign(campaignId: string): Promise<FollowStatus> {
  return api.del<FollowStatus>(followPath(campaignId));
}

export function fetchMyFollows(limit = 20, offset = 0): Promise<FollowedCampaignPage> {
  return api.get<FollowedCampaignPage>(`/users/me/follows?limit=${limit}&offset=${offset}`);
}
