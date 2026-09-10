import { api } from "../api";
import type { ApiMilestone } from "./campaigns";

export type ApiMilestoneUpdate = {
  id: string;
  milestoneId: string;
  content: string;
  imageUrl?: string | null;
  expenseAmount?: number | string | null;
  createdAt?: string;
};

export type CampaignProgress = {
  totalMilestones: number;
  completedMilestones: number;
  totalBudget: number;
  totalExpense: number;
  totalRaised: number;
  backerCount: number;
};

export type CreateMilestonePayload = {
  title: string;
  description?: string;
  targetDate?: string;
  budget?: number;
  sortOrder?: number;
};

export type CreateMilestoneUpdatePayload = {
  content: string;
  imageUrl?: string;
  expenseAmount?: number;
};

export async function fetchCampaignMilestones(
  campaignId: string,
): Promise<{ items: ApiMilestone[]; total: number }> {
  return api.get<{ items: ApiMilestone[]; total: number }>(
    `/campaigns/${encodeURIComponent(campaignId)}/milestones`,
  );
}

export async function fetchCampaignProgress(
  campaignId: string,
): Promise<CampaignProgress> {
  return api.get<CampaignProgress>(`/campaigns/${encodeURIComponent(campaignId)}/progress`);
}

export async function createMilestone(
  campaignId: string,
  payload: CreateMilestonePayload,
): Promise<ApiMilestone> {
  return api.post<ApiMilestone>(`/campaigns/${encodeURIComponent(campaignId)}/milestones`, payload);
}

export async function updateMilestone(
  id: string,
  payload: Partial<CreateMilestonePayload>,
): Promise<ApiMilestone> {
  return api.patch<ApiMilestone>(`/milestones/${encodeURIComponent(id)}`, payload);
}

export async function deleteMilestone(id: string): Promise<void> {
  return api.del<void>(`/milestones/${encodeURIComponent(id)}`);
}

export async function completeMilestone(id: string): Promise<ApiMilestone> {
  return api.post<ApiMilestone>(`/milestones/${encodeURIComponent(id)}/complete`);
}

export async function fetchMilestoneUpdates(
  milestoneId: string,
): Promise<ApiMilestoneUpdate[]> {
  return api.get<ApiMilestoneUpdate[]>(`/milestones/${encodeURIComponent(milestoneId)}/updates`);
}

export async function addMilestoneUpdate(
  milestoneId: string,
  payload: CreateMilestoneUpdatePayload,
): Promise<ApiMilestoneUpdate> {
  return api.post<ApiMilestoneUpdate>(`/milestones/${encodeURIComponent(milestoneId)}/updates`, payload);
}