import { api } from "../api";
import type { ApiMilestone } from "./campaigns";

export type ApiUpdateAttachment = {
  id: string;
  url: string;
  caption?: string | null;
  sortOrder?: number;
};

export type ApiMilestoneUpdate = {
  id: string;
  milestoneId: string;
  content: string;
  imageUrl?: string | null;
  expenseAmount?: number | string | null;
  attachments?: ApiUpdateAttachment[];
  createdAt?: string;
};

export type ApiCampaignUpdate = ApiMilestoneUpdate & { milestoneTitle: string };

/** Khớp `MAX_RECEIPTS_PER_UPDATE` ở backend. */
export const MAX_RECEIPTS_PER_UPDATE = 6;

/** Trạng thái một mốc theo thời gian (server tính). */
export type MilestoneState = "completed" | "on_track" | "overdue" | "overdue_explained";

/** Tóm tắt minh bạch của chiến dịch. */
export type TransparencyStatus = "no_plan" | "on_track" | "late" | "late_explained";

export type CampaignProgress = {
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  totalBudget: number;
  totalExpense: number;
  totalRaised: number;
  backerCount: number;
  lastUpdateAt: string | null;
  revisionCount: number;
  transparency: TransparencyStatus;
  milestoneStates: { id: string; state: MilestoneState }[];
};

export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = {
  completed: "Hoàn thành",
  on_track: "Đang thực hiện",
  overdue: "Chậm tiến độ",
  overdue_explained: "Chậm – đã giải trình",
};

/** Lớp màu của nhãn trạng thái mốc (dùng chung trang dự án + dashboard). */
export const MILESTONE_STATE_TONE: Record<MilestoneState, string> = {
  completed: "tag-green",
  on_track: "",
  overdue: "tag-red",
  overdue_explained: "tag-amber",
};

export const TRANSPARENCY_LABEL: Record<TransparencyStatus, string> = {
  no_plan: "Chưa công bố kế hoạch",
  on_track: "Đúng tiến độ",
  late: "Chậm tiến độ, chưa giải trình",
  late_explained: "Chậm tiến độ, đã giải trình",
};

export type MilestoneRevisionValues = {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  budget?: number | null;
};

export type ApiMilestoneRevision = {
  id: string;
  milestoneId: string;
  milestoneTitle: string;
  reason: string;
  oldValues: MilestoneRevisionValues;
  newValues: MilestoneRevisionValues;
  createdAt: string;
};

/** Độ dài tối thiểu lý do khi sửa mốc của chiến dịch đã phát hành (khớp backend). */
export const CHANGE_REASON_MIN = 10;

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
  /** Bắt buộc khi `expenseAmount > 0`; `mediaId` lấy từ ảnh tải lên với `expense_receipt`. */
  receipts?: { mediaId: string; caption?: string }[];
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
  payload: Partial<CreateMilestonePayload> & { changeReason?: string },
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

/** Lịch sử thay đổi kế hoạch sau khi phát hành (công khai, kèm lý do). */
export async function fetchMilestoneRevisions(campaignId: string): Promise<ApiMilestoneRevision[]> {
  return api.get<ApiMilestoneRevision[]>(`/campaigns/${encodeURIComponent(campaignId)}/milestone-revisions`);
}

/** Nhật ký tiến độ công khai của chiến dịch (mới nhất trước). */
export async function fetchCampaignUpdates(
  campaignId: string,
  offset = 0,
  limit = 10,
): Promise<{ items: ApiCampaignUpdate[]; total: number }> {
  return api.get<{ items: ApiCampaignUpdate[]; total: number }>(
    `/campaigns/${encodeURIComponent(campaignId)}/updates?offset=${offset}&limit=${limit}`,
  );
}

export async function addMilestoneUpdate(
  milestoneId: string,
  payload: CreateMilestoneUpdatePayload,
): Promise<ApiMilestoneUpdate> {
  return api.post<ApiMilestoneUpdate>(`/milestones/${encodeURIComponent(milestoneId)}/updates`, payload);
}