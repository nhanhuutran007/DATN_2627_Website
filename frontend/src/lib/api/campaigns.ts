import { api } from "../api";
import type { Campaign, CampaignStatus } from "@/lib/data/campaigns";

export type ApiCampaignStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "needs_info"
  | "active"
  | "paused"
  | "success"
  | "failed"
  | "cancelled"
  | "ended";

export type ApiOwner = {
  id: string;
  name: string;
};

export type ApiMilestone = {
  id: string;
  campaignId: string;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  budget?: number | string | null;
  sortOrder?: number;
  isCompleted?: boolean;
  completedAt?: string | null;
  createdAt?: string;
};

export type ApiCampaign = {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerId?: string;
  owner?: ApiOwner | null;
  goalAmount: number | string;
  currentAmount: number | string;
  startDate: string;
  endDate: string;
  status: ApiCampaignStatus;
  imageUrl?: string | null;
  videoUrl?: string | null;
  location?: string | null;
  backerCount?: number;
  viewCount?: number;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  milestones?: ApiMilestone[];
};

export type CampaignListResponse = {
  items: ApiCampaign[];
  total: number;
  limit: number;
  offset: number;
};

export type CampaignSort = "popular" | "ending" | "newest" | "progress" | "latest";

export type CampaignQuery = {
  q?: string;
  category?: string;
  status?: ApiCampaignStatus;
  sort?: CampaignSort;
  limit?: number;
  offset?: number;
};

export async function fetchCampaigns(query: CampaignQuery = {}): Promise<CampaignListResponse> {
  const params = toParams(query);
  return api.get<CampaignListResponse>(`/campaigns${params ? `?${params}` : ""}`);
}

export async function fetchMyCampaigns(query: CampaignQuery = {}): Promise<CampaignListResponse> {
  const params = toParams(query);
  return api.get<CampaignListResponse>(`/campaigns/mine${params ? `?${params}` : ""}`);
}

export async function fetchCampaign(id: string): Promise<ApiCampaign> {
  return api.get<ApiCampaign>(`/campaigns/${encodeURIComponent(id)}`);
}

export type CreateCampaignPayload = {
  title: string;
  description: string;
  category: string;
  goalAmount: number;
  endDate: string;
  startDate?: string;
  location?: string;
  imageUrl?: string;
};

export async function createCampaign(payload: CreateCampaignPayload): Promise<ApiCampaign> {
  return api.post<ApiCampaign>("/campaigns", payload);
}

export async function updateCampaign(
  id: string,
  payload: Partial<CreateCampaignPayload>,
): Promise<ApiCampaign> {
  return api.patch<ApiCampaign>(`/campaigns/${encodeURIComponent(id)}`, payload);
}

export async function submitCampaign(id: string): Promise<ApiCampaign> {
  return api.post<ApiCampaign>(`/campaigns/${encodeURIComponent(id)}/submit`);
}

export async function deleteCampaign(id: string): Promise<void> {
  return api.del<void>(`/campaigns/${encodeURIComponent(id)}`);
}

function toParams(query: CampaignQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  return params.toString();
}

const DAY_MS = 86_400_000;

function toNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value?: string | null): string {
  if (!value) return "Chưa xác định";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa xác định";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function statusToDisplay(status: ApiCampaignStatus): CampaignStatus {
  switch (status) {
    case "draft":
      return "Bản nháp";
    case "pending":
      return "Chờ duyệt";
    case "needs_info":
      return "Cần bổ sung";
    case "approved":
    case "active":
      return "Đang gây quỹ";
    case "rejected":
      return "Bị từ chối";
    case "paused":
      return "Tạm dừng";
    case "success":
      return "Đã đạt mục tiêu";
    case "ended":
      return "Kết thúc";
    case "failed":
    case "cancelled":
      return "Đã kết thúc";
    default:
      return "Đang gây quỹ";
  }
}

function imageByCategory(category: string): Campaign["image"] {
  switch (category) {
    case "Môi trường":
    case "Nông nghiệp":
      return "mangrove";
    case "Khởi nghiệp":
    case "Công nghệ":
      return "startup";
    case "Y tế":
      return "health";
    case "Giáo dục":
    default:
      return "library";
  }
}

function toStory(description: string): string[] {
  const paragraphs = description
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [description.trim() || "Chưa có câu chuyện chi tiết."];
}

function toSummary(api: ApiCampaign): string {
  const first = toStory(api.description)[0] ?? "";
  return first.length > 200 ? `${first.slice(0, 197).trimEnd()}…` : first;
}

type MilestoneView = Campaign["milestones"][number];

function toMilestones(api: ApiCampaign, now: Date): Campaign["milestones"] {
  return (api.milestones ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map<MilestoneView>((milestone) => {
      const target = milestone.targetDate ? new Date(milestone.targetDate) : null;
      const status =
        milestone.isCompleted || (target === null ? false : target.getTime() <= now.getTime())
          ? "Hoàn thành"
          : "Sắp tới";
      return {
        title: milestone.title,
        date: formatDate(milestone.targetDate),
        budget: toNumber(milestone.budget),
        status,
      };
    });
}

export function apiCampaignToView(api: ApiCampaign): Campaign {
  const now = new Date();
  const isClosed = api.status === "success" || api.status === "failed" || api.status === "cancelled";
  const endDate = new Date(api.endDate);
  const daysLeft = isClosed ? 0 : Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS));

  const milestones = toMilestones(api, now);
  const firstMilestone = milestones[0];
  const latestDate = api.updatedAt ?? api.createdAt ?? api.startDate;

  return {
    slug: api.id,
    title: api.title,
    summary: toSummary(api),
    category: api.category,
    location: api.location ?? "Chưa cập nhật",
    owner: api.owner?.name ?? "Nhóm ẩn danh",
    verified: Boolean(api.owner),
    raised: toNumber(api.currentAmount),
    target: toNumber(api.goalAmount),
    backers: toNumber(api.backerCount),
    daysLeft,
    status: statusToDisplay(api.status),
    image: imageByCategory(api.category),
    aiReason: "",
    story: toStory(api.description),
    transparencyScore: milestones.length > 0 ? 95 : 86,
    milestones,
    latestUpdate: {
      date: formatDate(latestDate),
      title: firstMilestone?.title ?? "Chiến dịch vừa được tạo",
      excerpt:
        firstMilestone?.status === "Hoàn thành"
          ? "Một đầu ra trong kế hoạch đã hoàn tất và được cập nhật công khai."
          : "Thông tin chi tiết, chứng từ và tiến độ sẽ được công bố công khai tại mục cập nhật.",
    },
  };
}