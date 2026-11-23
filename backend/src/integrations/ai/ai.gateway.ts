import { Injectable } from "@nestjs/common";

import { readAiConfig, type AiConfig } from "../../config/ai.config";
import type {
  AiFactor,
  AiFraudEntityType,
  AiFraudReason,
  AiFraudRequest,
  AiEstimateRequest,
  AiEstimateResponse,
  AiFraudResponse,
  AiHealth,
  AiPlatformOutcome,
  AiPredictFeatures,
  AiPredictRequest,
  AiPredictResponse,
  AiRecommendResponse,
  AiRecommendRequest,
  AiUserEvent,
  CampaignFeature,
} from "./ai.types";

export class AiServiceUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AiServiceUnavailableError";
  }
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export interface AiGateway {
  health(): Promise<AiHealth>;
  recommend(payload: AiRecommendRequest): Promise<AiRecommendResponse>;
  predict(payload: AiPredictRequest): Promise<AiPredictResponse>;
  estimate(payload: AiEstimateRequest): Promise<AiEstimateResponse>;
  getFraudScore(payload: AiFraudRequest): Promise<AiFraudResponse>;
}

type WireRecommendRequest = {
  user_id: string | null;
  preferences: string[];
  exclude_ids: string[];
  candidates: WireCampaignFeature[];
  history: WireUserEvent[];
};

type WireCampaignFeature = {
  campaign_id: string;
  category: string;
  title: string;
  keywords: string[];
  target: number;
  duration_days: number;
  profile_score: number;
  funded_ratio: number;
  days_left: number;
  views: number;
  backers_count: number;
  content_length: number;
  image_count: number;
  has_video: boolean;
  status: string;
};

type WireUserEvent = {
  campaign_id: string;
  event_type: string;
  category: string;
};

type WireRecommendResponse = {
  source: AiRecommendResponse["source"];
  fallback: boolean;
  items: Array<{ campaign_id: string; score: number; reason: string }>;
  detail: string;
};

type WirePredictFeatures = {
  category_id: number;
  goal_amount: number;
  duration_days: number;
  profile_score: number;
  content_length: number;
  image_count: number;
  has_video: boolean;
  story_word_count: number;
  owner_campaign_count: number;
  owner_credential_approved: boolean;
  has_budget_report: boolean;
  early_views: number;
  early_backers: number;
  name_words: number;
  launch_month: number;
  launch_weekday: number;
};

type WirePlatformOutcome = {
  campaign_id: string;
  title: string;
  features: WirePredictFeatures;
  reached: boolean;
  raised: number;
};

type WirePredictRequest = {
  campaign_id: string | null;
  features: WirePredictFeatures;
  history: WirePlatformOutcome[];
};

type WirePlatformAdjustment = {
  samples: number;
  similar: number;
  observed_rate: number;
  model_rate: number;
  weight: number;
  base_probability: number;
};

type WirePredictResponse = {
  probability: number;
  prediction: "LIKELY" | "UNLIKELY";
  confidence: number;
  model: string | null;
  fallback: boolean;
  metrics: Record<string, unknown> | null;
  factors: AiFactor[];
  caveats?: string[];
  platform?: WirePlatformAdjustment | null;
};

type WireEstimateResponse = {
  current: WirePredictResponse | null;
  duration: AiEstimateResponse["duration"];
  options: AiEstimateResponse["options"];
  chosen_days: number | null;
  similar: Array<{
    campaign_id: string | null;
    title: string | null;
    goal_amount: number;
    raised: number;
    duration_days: number;
    reached: boolean;
    similarity: number;
  }>;
  samples: number;
  similar_reached: number;
  notes: string[];
};

type WireFraudRequest = {
  entity_type: AiFraudEntityType;
  entity_id: string | null;
  features: Record<string, number>;
};

type WireFraudResponse = {
  risk_score: number;
  level: AiFraudResponse["level"];
  method: AiFraudResponse["method"];
  reasons: AiFraudReason[];
  evidences: Record<string, number>;
  fallback: boolean;
};

@Injectable()
export class HttpAiGateway implements AiGateway {
  private readonly config: AiConfig;

  constructor() {
    this.config = readAiConfig();
  }

  async health(): Promise<AiHealth> {
    return this.request<AiHealth>("/api/v1/health", { method: "GET" });
  }

  async recommend(payload: AiRecommendRequest): Promise<AiRecommendResponse> {
    const wire: WireRecommendRequest = {
      user_id: payload.userId,
      preferences: payload.preferences,
      exclude_ids: payload.excludeIds,
      candidates: payload.candidates.map(toWireCampaign),
      history: payload.history.map(toWireEvent),
    };
    const response = await this.request<WireRecommendResponse>("/api/v1/recommend", {
      payload: wire,
    });
    return {
      source: response.source,
      fallback: response.fallback,
      detail: response.detail,
      items: response.items.map((item) => ({
        campaignId: item.campaign_id,
        score: item.score,
        reason: item.reason,
      })),
    };
  }

  async predict(payload: AiPredictRequest): Promise<AiPredictResponse> {
    const wire: WirePredictRequest = {
      campaign_id: payload.campaignId,
      features: toWireFeatures(payload.features),
      history: (payload.history ?? []).map(toWireOutcome),
    };
    return fromWirePredict(await this.request<WirePredictResponse>("/api/v1/predict", { payload: wire }));
  }

  async estimate(payload: AiEstimateRequest): Promise<AiEstimateResponse> {
    const response = await this.request<WireEstimateResponse>("/api/v1/estimate", {
      payload: {
        features: toWireFeatures(payload.features),
        history: payload.history.map(toWireOutcome),
        min_duration_days: payload.minDurationDays,
      },
    });
    return {
      current: response.current ? fromWirePredict(response.current) : null,
      duration: response.duration,
      options: response.options,
      chosenDays: response.chosen_days ?? null,
      similar: response.similar.map((item) => ({
        campaignId: item.campaign_id,
        title: item.title,
        goalAmount: item.goal_amount,
        raised: item.raised,
        durationDays: item.duration_days,
        reached: item.reached,
        similarity: item.similarity,
      })),
      samples: response.samples,
      similarReached: response.similar_reached,
      notes: response.notes,
    };
  }

  async getFraudScore(payload: AiFraudRequest): Promise<AiFraudResponse> {
    const wire: WireFraudRequest = {
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      features: payload.features,
    };
    const response = await this.request<WireFraudResponse>("/api/v1/fraud/score", {
      payload: wire,
    });
    return {
      riskScore: response.risk_score,
      level: response.level,
      method: response.method,
      reasons: response.reasons,
      evidences: response.evidences,
      fallback: response.fallback,
    };
  }

  private async request<T>(
    path: string,
    opts: { method?: "GET" | "POST"; payload?: unknown },
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (this.config.apiKey) {
        headers["X-AI-Key"] = this.config.apiKey;
      }
      if (opts.payload !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${this.config.serviceUrl}${path}`, {
        method: opts.method ?? "POST",
        headers,
        body: opts.payload !== undefined ? JSON.stringify(opts.payload) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AiServiceError(
          `AI service responded with HTTP ${response.status}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw error;
      }
      throw new AiServiceUnavailableError("AI service is unreachable", error);
    } finally {
      clearTimeout(timer);
    }
  }
}

function toWireCampaign(candidate: CampaignFeature): WireCampaignFeature {
  return {
    campaign_id: candidate.campaignId,
    category: candidate.category,
    title: candidate.title,
    keywords: candidate.keywords,
    target: candidate.target,
    duration_days: candidate.durationDays,
    profile_score: candidate.profileScore,
    funded_ratio: candidate.fundedRatio,
    days_left: candidate.daysLeft,
    views: candidate.views,
    backers_count: candidate.backersCount,
    content_length: candidate.contentLength,
    image_count: candidate.imageCount,
    has_video: candidate.hasVideo,
    status: candidate.status,
  };
}

function toWireEvent(event: AiUserEvent): WireUserEvent {
  return {
    campaign_id: event.campaignId,
    event_type: event.eventType,
    category: event.category,
  };
}
function toWireFeatures(features: AiPredictFeatures): WirePredictFeatures {
  return {
    category_id: features.categoryId,
    goal_amount: features.goalAmount,
    duration_days: features.durationDays,
    profile_score: features.profileScore,
    content_length: features.contentLength,
    image_count: features.imageCount,
    has_video: features.hasVideo,
    story_word_count: features.storyWordCount,
    owner_campaign_count: features.ownerCampaignCount,
    owner_credential_approved: features.ownerCredentialApproved,
    has_budget_report: features.hasBudgetReport,
    early_views: features.earlyViews,
    early_backers: features.earlyBackers,
    name_words: features.nameWords,
    launch_month: features.launchMonth,
    launch_weekday: features.launchWeekday,
  };
}

function toWireOutcome(outcome: AiPlatformOutcome): WirePlatformOutcome {
  return {
    campaign_id: outcome.campaignId,
    title: outcome.title.slice(0, 200),
    features: toWireFeatures(outcome.features),
    reached: outcome.reached,
    raised: Math.max(0, outcome.raised),
  };
}

function fromWirePredict(response: WirePredictResponse): AiPredictResponse {
  const { platform, ...rest } = response;
  return {
    ...rest,
    platform: platform
      ? {
          samples: platform.samples,
          similar: platform.similar,
          observedRate: platform.observed_rate,
          modelRate: platform.model_rate,
          weight: platform.weight,
          baseProbability: platform.base_probability,
        }
      : null,
  };
}
