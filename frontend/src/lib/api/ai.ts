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
};

export type AiPredictResult =
  | { available: true; campaignId: string; data: AiPredictData }
  | { available: false; campaignId: string };

export function isAiPredictAvailable(
  result: AiPredictResult,
): result is Extract<AiPredictResult, { available: true }> {
  return result.available;
}

export async function fetchAiPrediction(campaignId: string): Promise<AiPredictResult> {
  try {
    return await api.post<AiPredictResult>("/ai/predict", { campaignId });
  } catch {
    return { available: false, campaignId };
  }
}

export type BehaviorEventType = "view" | "follow" | "contribute";

const trackedCampaigns = new Set<string>();

export async function trackBehaviorEvent(
  campaignId: string,
  eventType: BehaviorEventType,
): Promise<void> {
  // POST /ai/events yêu cầu đăng nhập và chỉ ghi khi người dùng đã đồng ý
  // (server cũng tự bỏ qua nếu chưa đồng ý).
  if (!hasSession() || !getStoredUser()?.aiTrackingConsent) return;
  if (eventType === "view" && trackedCampaigns.has(campaignId)) return;
  trackedCampaigns.add(campaignId);
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
