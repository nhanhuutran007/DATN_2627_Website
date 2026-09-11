import { Injectable } from "@nestjs/common";

import { readAiConfig, type AiConfig } from "../../config/ai.config";
import type {
  AiFactor,
  AiFraudEntityType,
  AiFraudReason,
  AiFraudRequest,
  AiFraudResponse,
  AiHealth,
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

type WirePredictRequest = {
  campaign_id: string | null;
  features: {
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
  };
};

type WirePredictResponse = {
  probability: number;
  prediction: "LIKELY" | "UNLIKELY";
  confidence: number;
  model: string | null;
  fallback: boolean;
  metrics: Record<string, unknown> | null;
  factors: AiFactor[];
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
      features: {
        category_id: payload.features.categoryId,
        goal_amount: payload.features.goalAmount,
        duration_days: payload.features.durationDays,
        profile_score: payload.features.profileScore,
        content_length: payload.features.contentLength,
        image_count: payload.features.imageCount,
        has_video: payload.features.hasVideo,
        story_word_count: payload.features.storyWordCount,
        owner_campaign_count: payload.features.ownerCampaignCount,
        owner_credential_approved: payload.features.ownerCredentialApproved,
        has_budget_report: payload.features.hasBudgetReport,
        early_views: payload.features.earlyViews,
        early_backers: payload.features.earlyBackers,
      },
    };
    return this.request<WirePredictResponse>("/api/v1/predict", { payload: wire });
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