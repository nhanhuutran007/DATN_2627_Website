export type AiHealth = {
  service: string;
  status: string;
  model_status: "ready" | "degraded";
  model_version: string | null;
  models: Record<string, { loaded: boolean; version: string | null; fallback: string }>;
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
  /** Số từ trong tên chiến dịch. */
  nameWords: number;
  /** Tháng bắt đầu gây quỹ theo giờ Việt Nam (1–12). */
  launchMonth: number;
  /** Thứ bắt đầu theo giờ Việt Nam, 0 = thứ Hai … 6 = Chủ nhật (như pandas `dt.weekday` lúc huấn luyện). */
  launchWeekday: number;
};

/** Một dự án Góp Mầm đã kết thúc: đặc trưng lúc ra mắt + kết quả thật — mẫu để AI tự học. */
export type AiPlatformOutcome = {
  campaignId: string;
  title: string;
  features: AiPredictFeatures;
  reached: boolean;
  /** Số tiền thực sự gọi được (VND). */
  raised: number;
};

export type AiPredictRequest = {
  campaignId: string | null;
  features: AiPredictFeatures;
  history?: AiPlatformOutcome[];
};

/** Phần hiệu chỉnh học từ các dự án Góp Mầm đã kết thúc. */
export type AiPlatformAdjustment = {
  samples: number;
  similar: number;
  observedRate: number;
  modelRate: number;
  /** 0…1: mức tin vào dữ liệu Góp Mầm so với mô hình gốc. */
  weight: number;
  baseProbability: number;
  /** Video / ảnh / câu chuyện: học riêng từ dự án Góp Mầm (mô hình gốc không có các thông tin này). */
  content: AiContentEffect[];
};

export type AiContentEffect = {
  feature: string;
  label: string;
  /** "insufficient_data": các dự án đã kết thúc gần như giống nhau ở thông tin này. */
  status: "learned" | "insufficient_data";
  coefficient: number;
  /** Chênh lệch xác suất của chiến dịch này do thông tin đó; null nếu chưa học được. */
  impact: number | null;
};

export type AiEstimateRequest = {
  features: AiPredictFeatures;
  history: AiPlatformOutcome[];
  minDurationDays: number;
};

/** "platform": dữ liệu Góp Mầm chiếm phần lớn trong hiệu chỉnh; "model": chủ yếu mô hình gốc. */
export type AiSuggestionBasis = "platform" | "model";

/** Gợi ý thời hạn cho số tiền người tạo tự đặt (AI không gợi ý số tiền). */
export type AiEstimateResponse = {
  /** Ước lượng cho thời hạn đang chọn; null khi chưa chọn ngày kết thúc. */
  current: AiPredictResponse | null;
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
  /** Lưu ý riêng cho lần ước lượng này (vd. lĩnh vực không có trong dữ liệu huấn luyện). */
  caveats?: string[];
  /** Có khi đã hiệu chỉnh theo các dự án Góp Mầm đã kết thúc. */
  platform?: AiPlatformAdjustment | null;
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
