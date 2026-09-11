export type AiHealth = {
  service: string;
  status: string;
  model_status: string;
  model_version: string | null;
};

export type CampaignFeature = {
  campaignId: string;
  category: string;
  title: string;
  keywords: string[];
  target: number;
  durationDays: number;
  profileScore: number;
  fundedRatio: number;
  daysLeft: number;
  views: number;
  backersCount: number;
  contentLength: number;
  imageCount: number;
  hasVideo: boolean;
  status: string;
};

export type AiUserEvent = {
  campaignId: string;
  eventType: "VIEW" | "SEARCH" | "FOLLOW" | "CONTRIBUTE";
  category: string;
};

export type AiRecommendRequest = {
  userId: string | null;
  preferences: string[];
  excludeIds: string[];
  candidates: CampaignFeature[];
  history: AiUserEvent[];
};

export type AiRecommendItem = {
  campaignId: string;
  score: number;
  reason: string;
};

export type AiRecommendSource =
  | "COLLABORATIVE"
  | "CONTENT"
  | "COLD_START"
  | "POPULAR_FALLBACK";

export type AiRecommendResponse = {
  source: AiRecommendSource;
  fallback: boolean;
  items: AiRecommendItem[];
  detail: string;
};

export type AiPredictFeatures = {
  categoryId: number;
  goalAmount: number;
  durationDays: number;
  profileScore: number;
  contentLength: number;
  imageCount: number;
  hasVideo: boolean;
  storyWordCount: number;
  ownerCampaignCount: number;
  ownerCredentialApproved: boolean;
  hasBudgetReport: boolean;
  earlyViews: number;
  earlyBackers: number;
};

export type AiPredictRequest = {
  campaignId: string | null;
  features: AiPredictFeatures;
};

export type AiFactor = {
  feature: string;
  label: string;
  direction: "UP" | "DOWN";
  weight: number;
  note: string;
};

export type AiPredictResponse = {
  probability: number;
  prediction: "LIKELY" | "UNLIKELY";
  confidence: number;
  model: string | null;
  fallback: boolean;
  metrics: Record<string, unknown> | null;
  factors: AiFactor[];
};

export type AiFraudEntityType = "USER" | "CAMPAIGN" | "CONTRIBUTION" | "TRANSACTION";

export type AiFraudRequest = {
  entityType: AiFraudEntityType;
  entityId: string | null;
  features: Record<string, number>;
};

export type AiFraudReason = {
  group: string;
  label: string;
  weight: number;
};

export type AiFraudResponse = {
  riskScore: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  method: "ENSEMBLE" | "RULE";
  reasons: AiFraudReason[];
  evidences: Record<string, number>;
  fallback: boolean;
};