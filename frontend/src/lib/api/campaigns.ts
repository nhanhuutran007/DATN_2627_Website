import { api } from "../api";
import type { Campaign, CampaignStatus } from "@/lib/data/campaigns";
import { htmlToText, looksLikeHtml } from "@/lib/rich-text";

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

/**
 * Trạng thái đã công khai: backend chỉ mở theo dõi, lượt xem, sổ cái, bình luận
 * và báo cáo cho các trạng thái này (các trạng thái khác trả 404).
 */
const PUBLISHED_STATUSES: readonly ApiCampaignStatus[] = ["approved", "active", "paused", "success", "failed", "ended"];

/** Dữ liệu mẫu (không có `apiStatus`) coi như đã công khai. */
export function isPublishedStatus(status: ApiCampaignStatus | undefined): boolean {
  return status === undefined || PUBLISHED_STATUSES.includes(status);
}

/** Nhãn kết quả kiểm duyệt hiển thị ở trang chi tiết. */
export function reviewStatusLabel(status: ApiCampaignStatus | undefined): string {
  switch (status) {
    case "draft":
      return "Chưa gửi duyệt";
    case "pending":
      return "Đang chờ quản trị viên duyệt";
    case "needs_info":
      return "Quản trị viên yêu cầu bổ sung";
    case "rejected":
      return "Bị từ chối";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Đã được quản trị viên duyệt";
  }
}

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
  submittedAt?: string | null;
  isFeatured?: boolean;
  imageUrl?: string | null;
  videoUrl?: string | null;
  location?: string | null;
  backerCount?: number;
  viewCount?: number;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  milestones?: ApiMilestone[];
  /** Tổ chức được gây quỹ cho (chỉ gắn được với tổ chức đã xác minh). */
  organizationId?: string | null;
  organization?: ApiCampaignOrganization | null;
};

export type ApiCampaignOrganization = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  status: string;
};

export type CampaignListResponse = {
  items: ApiCampaign[];
  total: number;
  limit: number;
  offset: number;
};

export type CampaignSort = "featured" | "popular" | "ending" | "newest" | "progress" | "latest";

export type CampaignQuery = {
  q?: string;
  category?: string;
  /** Một hoặc nhiều trạng thái (gửi dạng `active,success`). */
  status?: ApiCampaignStatus | ApiCampaignStatus[];
  location?: string;
  /** Khoảng mục tiêu vốn (VNĐ). */
  minGoal?: number;
  maxGoal?: number;
  /** Khoảng tỷ lệ hoàn thành (%). */
  minProgress?: number;
  maxProgress?: number;
  /** Chỉ chiến dịch đang gây quỹ, kết thúc trong N ngày tới. */
  endingWithinDays?: number;
  /** Chỉ chiến dịch gây quỹ cho tổ chức này. */
  organizationId?: string;
  /** Chỉ chiến dịch gây quỹ cho một tổ chức đã xác minh. */
  forOrganization?: boolean;
  sort?: CampaignSort;
  limit?: number;
  offset?: number;
};

/** Liên hệ công khai của chiến dịch (nút "Liên hệ"); trường null = người tổ chức chưa công khai. */
export type CampaignContact = {
  owner: { name: string; email: string | null; phone: string | null; address: string | null };
  organization: { name: string; slug: string; email: string; phone: string; address: string; website: string | null } | null;
};

/** Cần đăng nhập; máy chủ giới hạn 20 lần/phút. */
export function fetchCampaignContact(campaignId: string): Promise<CampaignContact> {
  return api.get<CampaignContact>(`/campaigns/${encodeURIComponent(campaignId)}/contact`);
}

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
  /** `null` khi cập nhật = bỏ gắn tổ chức. */
  organizationId?: string | null;
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
  const statuses = Array.isArray(query.status) ? query.status : query.status ? [query.status] : [];
  if (statuses.length > 0) params.set("status", statuses.join(","));
  if (query.location) params.set("location", query.location);
  if (query.organizationId) params.set("organizationId", query.organizationId);
  if (query.forOrganization) params.set("forOrganization", "true");
  for (const key of ["minGoal", "maxGoal", "minProgress", "maxProgress", "endingWithinDays"] as const) {
    const value = query[key];
    if (value !== undefined) params.set(key, String(value));
  }
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
    // Đã duyệt nhưng admin chưa kích hoạt: máy chủ chưa nhận tiền ủng hộ (chỉ nhận khi `active`)
    case "approved":
      return "Sắp mở gây quỹ";
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

/** Ảnh minh họa của từng lĩnh vực; ảnh đầu tiên là ảnh đại diện (banner trang lĩnh vực). */
const CATEGORY_IMAGES: Record<string, Campaign["image"][]> = {
  "Môi trường": ["mangrove", "beach"],
  "Nông nghiệp": ["farm", "highland"],
  "Khởi nghiệp": ["startup", "market"],
  "Công nghệ": ["computer", "robot"],
  "Y tế": ["health", "clinic"],
  "Giáo dục": ["library", "reading"],
  "Văn hóa nghệ thuật": ["music", "lantern"],
};

/**
 * Ảnh theo chủ đề, dò từ khóa trong tên rồi tóm tắt chiến dịch (đã bỏ dấu). Thứ tự quan trọng: mẫu cụ thể
 * đứng trước; tránh từ ngắn dễ trùng sau khi bỏ dấu (vd. "ong" nằm trong "không", "sach" là cả "sách" lẫn "sạch",
 * "cau" là cả "cầu" lẫn "nhu cầu").
 */
const TOPIC_IMAGES: [RegExp, Campaign["image"]][] = [
  [/nang luong mat troi|dien mat troi|pin mat troi|solar/, "solar"],
  [/tiem chung|vac ?xin|vaccine/, "clinic"],
  [/hoc boi|day boi|duoi nuoc/, "swim"],
  [/ca phe|coffee/, "coffee"],
  [/nuoi ong|mat ong|thung ong/, "bees"],
  [/bep an|bua an|bua trua|ban tru|suat an/, "meal"],
  [/thuy canh|nha mang|tuoi nho giot/, "seedling"],
  [/rau sach|trong rau|rau huu co|canh tac huu co/, "vegetable"],
  [/tai che|phe thai nhua|rac thai nhua|phan loai rac|thung rac|don rac|bai bien/, "beach"],
  [/ngap man|trong cay|trong rung/, "mangrove"],
  [/nuoc sach|gieng|loc nuoc/, "water"],
  [/cau dan sinh|xay cau|cau tre|cau treo|cau be tong|qua suoi/, "bridge"],
  [/vuon uom|doanh nghiep xa hoi/, "startup"],
  [/hoc bong|sinh vien/, "graduate"],
  [/tieng anh|ngoai ngu|thu vien|doc sach|dau sach|cuon sach/, "reading"],
  [/robot|stem/, "robot"],
  [/ung dung|nen tang|phan mem|website|app/, "computer"],
  [/kham mat|nguoi cao tuoi|luu dong|benh nhi|dieu tri nhi/, "health"],
  [/tu thuoc|so cuu|tram y te|kham benh/, "clinic"],
  [/tho cam|thu cong|lang nghe|hop tac xa/, "market"],
  [/den long/, "lantern"],
  [/am nhac|ca nhac|nghe thuat|le hoi/, "music"],
];

export function foldVietnamese(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

/** Ảnh khớp chủ đề của chiến dịch (ưu tiên tên, rồi tóm tắt); `null` khi không chủ đề nào khớp. */
export function topicImage(title: string, summary = ""): Campaign["image"] | null {
  for (const text of [title, summary]) {
    const folded = foldVietnamese(text);
    const match = TOPIC_IMAGES.find(([pattern]) => pattern.test(folded));
    if (match) return match[1];
  }
  return null;
}

/** Lĩnh vực có bộ ảnh minh họa riêng (lĩnh vực admin mới tạo thì chưa có). */
export function hasCategoryImages(category: string): boolean {
  return category in CATEGORY_IMAGES;
}

/**
 * Ảnh minh họa theo lĩnh vực khi chiến dịch chưa có ảnh riêng. Truyền `seed` (id chiến dịch)
 * để các chiến dịch cùng lĩnh vực luân phiên ảnh, mỗi chiến dịch luôn giữ cùng một ảnh.
 */
export function imageByCategory(category: string, seed = ""): Campaign["image"] {
  const images = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES["Giáo dục"];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return images[hash % images.length];
}

/** Ảnh minh họa cho một chiến dịch chưa có ảnh riêng: đúng chủ đề nếu nhận ra, không thì theo lĩnh vực. */
export function imageForCampaign(campaign: { category: string; title: string; summary?: string; id?: string }) {
  return topicImage(campaign.title, campaign.summary) ?? imageByCategory(campaign.category, campaign.id);
}

/**
 * Trong một danh sách, các chiến dịch cùng lĩnh vực chỉ dùng ảnh chung của lĩnh vực (không nhận ra chủ đề)
 * lần lượt nhận các ảnh khác nhau của lĩnh vực đó, để lưới thẻ không lặp ảnh. Ảnh theo chủ đề giữ nguyên.
 */
export function spreadCategoryImages(campaigns: Campaign[]): Campaign[] {
  const next = new Map<string, number>();
  return campaigns.map((campaign) => {
    const images = CATEGORY_IMAGES[campaign.category];
    if (campaign.imageUrl || !images || topicImage(campaign.title, campaign.summary)) return campaign;
    const index = next.get(campaign.category) ?? Math.max(images.indexOf(campaign.image), 0);
    next.set(campaign.category, index + 1);
    return { ...campaign, image: images[index % images.length] };
  });
}

function toStory(description: string): string[] {
  const paragraphs = (looksLikeHtml(description) ? htmlToText(description) : description)
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
      // Qua hạn mà chưa đánh dấu hoàn thành là "Quá hạn", không phải "Hoàn thành".
      const status: MilestoneView["status"] = milestone.isCompleted
        ? "Hoàn thành"
        : target !== null && target.getTime() <= now.getTime()
          ? "Quá hạn"
          : "Sắp tới";
      return {
        id: milestone.id,
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
    apiStatus: api.status,
    image: imageForCampaign({ category: api.category, title: api.title, summary: toSummary(api), id: api.id }),
    imageUrl: api.imageUrl ?? null,
    endDate: formatDate(api.endDate),
    ...(api.createdAt ? { createdDate: formatDate(api.createdAt) } : {}),
    aiReason: "",
    story: toStory(api.description),
    ...(looksLikeHtml(api.description) ? { storyHtml: api.description } : {}),
    transparencyScore: milestones.length > 0 ? 95 : 86,
    milestones,
    organization:
      api.organization && api.organization.status === "verified"
        ? { slug: api.organization.slug, name: api.organization.name, logoUrl: api.organization.logoUrl ?? null }
        : null,
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
export type PlatformStats = {
  totalRaised: number;
  totalBackers: number;
  publicCampaigns: number;
  activeCampaigns: number;
  successfulCampaigns: number;
};

/** Thống kê thật toàn nền tảng (tổng tiền đã được cổng thanh toán xác nhận). */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>("/campaigns/stats");
}