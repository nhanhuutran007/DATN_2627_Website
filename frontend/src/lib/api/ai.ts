import { api, getStoredUser, hasSession, updateStoredUser } from "../api";
import { apiCampaignToView, type ApiCampaign } from "./campaigns";
import type { Campaign } from "@/lib/data/campaigns";

export type AiRecommendItem = {
  campaign: ApiCampaign;
  score: number;
  reason: string;
};

export type AiRecommendSource =
  | "COLLABORATIVE"
  | "CONTENT"
  | "COLD_START"
  | "POPULAR_FALLBACK";

export type AiRecommendResponse = {
  available: boolean;
  source?: AiRecommendSource;
  items: AiRecommendItem[];
  detail?: string;
};

export type AiRecommendedItem = {
  campaign: Campaign;
  score: number;
  reason: string;
};

export type AiRecommendationView = {
  items: AiRecommendedItem[];
  source?: AiRecommendSource;
  detail?: string;
};

export type RecommendAiOptions = {
  preferences?: string[];
  excludeIds?: string[];
  limit?: number;
};

export async function fetchAiRecommendations(
  options: RecommendAiOptions = {},
): Promise<AiRecommendationView> {
  const result = await api.post<AiRecommendResponse>("/ai/recommend", options);
  return {
    items: result.items.map((item) => ({
      campaign: {
        ...apiCampaignToView(item.campaign),
        aiReason: item.reason,
      },
      score: item.score,
      reason: item.reason,
    })),
    source: result.source,
    detail: result.detail,
  };
}

export type AiFactor = {
  feature: string;
  label: string;
  direction: "UP" | "DOWN";
  weight: number;
  note: string;
};

export type AiPredictData = {
  probability: number;
  prediction: "LIKELY" | "UNLIKELY";
  confidence: number;
  model: string | null;
  fallback: boolean;
  metrics: Record<string, unknown> | null;
  factors: AiFactor[];
  /** Lưu ý riêng cho lần ước lượng này (vd. lĩnh vực không có trong dữ liệu huấn luyện). */
  caveats?: string[];
  /** Có khi AI đã hiệu chỉnh theo các dự án Góp Mầm đã kết thúc. */
  platform?: AiPlatformAdjustment | null;
};

/** Phần AI tự học từ dự án Góp Mầm đã kết thúc. */
export type AiPlatformAdjustment = {
  /** Số dự án đã kết thúc dùng để học. */
  samples: number;
  /** Số dự án tương tự quy đổi (có trọng số). */
  similar: number;
  observedRate: number;
  modelRate: number;
  /** 0…1: mức tin vào dữ liệu Góp Mầm so với mô hình gốc. */
  weight: number;
  baseProbability: number;
};

/** "platform": dữ liệu Góp Mầm chiếm phần lớn trong hiệu chỉnh; "model": chủ yếu mô hình gốc. */
export type AiSuggestionBasis = "platform" | "model";

/** Gợi ý thời hạn cho số tiền người tạo tự đặt (AI không gợi ý số tiền). */
export type AiDurationEstimate = {
  /** Ước lượng cho thời hạn đang chọn; null khi chưa chọn ngày kết thúc. */
  current: AiPredictData | null;
  /** `days`: thời hạn ngắn nhất gần bằng mức tốt nhất; `low`–`high`: các thời hạn tốt gần như nhau. */
  duration: { days: number; low: number; high: number; probability: number; basis: AiSuggestionBasis };
  /** Khả năng đạt ở từng thời hạn (đường đã làm mượt), cùng số tiền đã đặt. */
  options: Array<{ days: number; probability: number }>;
  /** Thời hạn của ngày kết thúc đang chọn (có trong `options`); null khi chưa chọn. */
  chosenDays: number | null;
  similar: Array<{
    campaignId: string | null;
    title: string | null;
    goalAmount: number;
    raised: number;
    durationDays: number;
    reached: boolean;
    similarity: number;
  }>;
  samples: number;
  similarReached: number;
  notes: string[];
};

export type AiDurationEstimateResult = { available: true; data: AiDurationEstimate } | { available: false };

export type DurationEstimateInput = {
  category: string;
  /** Số tiền người tạo đã đặt (bắt buộc). */
  goalAmount: number;
  /** ISO; bỏ trống khi chưa chọn ngày kết thúc. */
  endDate?: string;
  title?: string;
};

/** Gợi ý thời hạn cho số tiền của chiến dịch đang soạn (cần đăng nhập). */
export function fetchDurationEstimate(
  input: DurationEstimateInput,
  signal?: AbortSignal,
): Promise<AiDurationEstimateResult> {
  return api.post<AiDurationEstimateResult>("/ai/estimate", input, { signal });
}

export type AiPredictResult =
  | { available: true; campaignId: string; data: AiPredictData }
  | { available: false; campaignId: string };

export function isAiPredictAvailable(
  result: AiPredictResult,
): result is Extract<AiPredictResult, { available: true }> {
  return result.available;
}

/** Ước lượng của mô hình — chỉ chủ dự án/admin; lỗi quyền/mạng được ném ra để UI báo. */
export function fetchCampaignPrediction(campaignId: string): Promise<AiPredictResult> {
  return api.get<AiPredictResult>(`/campaigns/${encodeURIComponent(campaignId)}/prediction`);
}

/** "search" = bấm vào một dự án trong kết quả tìm kiếm. */
export type BehaviorEventType = "view" | "follow" | "contribute" | "search";

const trackedCampaigns = new Set<string>();

export async function trackBehaviorEvent(
  campaignId: string,
  eventType: BehaviorEventType,
): Promise<void> {
  // POST /ai/events yêu cầu đăng nhập và chỉ ghi khi người dùng đã đồng ý
  // (server cũng tự bỏ qua nếu chưa đồng ý).
  if (!hasSession() || !getStoredUser()?.aiTrackingConsent) return;
  // Chỉ chống trùng lượt xem: đánh dấu cả loại khác thì lượt xem ngay sau đó (vd. bấm từ kết quả tìm kiếm) bị bỏ sót
  if (eventType === "view") {
    if (trackedCampaigns.has(campaignId)) return;
    trackedCampaigns.add(campaignId);
  }
  try {
    await api.post("/ai/events", { campaignId, eventType });
  } catch {
    return;
  }
}

export type AiHealth = { available: boolean; detail?: string };

export async function fetchAiHealth(): Promise<AiHealth> {
  try {
    return await api.get<AiHealth>("/ai/health");
  } catch {
    return { available: false };
  }
}

export type AiConsentResult = {
  aiTrackingConsent: boolean;
  aiConsentUpdatedAt: string;
  deletedEventCount: number;
};

/** Đồng ý / rút lại đồng ý ghi nhận hành vi; rút lại thì server xóa lịch sử đã ghi. */
export async function updateAiConsent(consent: boolean): Promise<AiConsentResult> {
  const result = await api.patch<AiConsentResult>("/users/me/ai-consent", { consent });
  const user = getStoredUser();
  if (user) {
    updateStoredUser({ ...user, aiTrackingConsent: result.aiTrackingConsent, aiConsentDecided: true });
  }
  return result;
}
