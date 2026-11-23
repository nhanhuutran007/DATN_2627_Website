import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, MoreThan, Repository } from "typeorm";

import { AiGateway } from "../../integrations/ai/ai.gateway";
import type {
  AiEstimateResponse,
  AiFraudResponse,
  AiPlatformOutcome,
  AiPredictFeatures,
  AiPredictResponse,
  AiRecommendResponse,
  AiUserEvent,
  CampaignFeature,
} from "../../integrations/ai/ai.types";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { CampaignViewDaily } from "../campaigns/entities/campaign-view-daily.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreateBehaviorEventDto,
  EstimateCampaignDto,
  FraudAiDto,
  PredictAiDto,
  RecommendAiDto,
} from "./dto/ai.dto";
import { BehaviorEvent, BehaviorEventType } from "./entities/behavior-event.entity";

/**
 * Số chiến dịch đưa cho bộ gợi ý xếp hạng. Lấy rộng hơn số cần hiển thị: nếu chỉ lấy vài chiến
 * dịch đông người ủng hộ nhất thì lĩnh vực người dùng quan tâm có thể không có mặt để mà gợi ý.
 */
const RECOMMEND_POOL_SIZE = 60;
/** Số sự kiện gần nhất dùng làm lịch sử quan tâm. */
const HISTORY_LIMIT = 50;

/** Số giao dịch nhiều nhất mà cùng một tài khoản tạo ra trong danh sách (đặc trưng tốc độ giao dịch). */
export function maxDonationsPerDonor(donations: ReadonlyArray<{ userId?: string | null }>): number {
  const counts = new Map<string, number>();
  for (const donation of donations) {
    const key = donation.userId ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

/**
 * Độ lệch (z-score) của khoản lớn nhất so với các khoản của cùng chiến dịch, tính trên log số
 * tiền: số tiền ủng hộ lệch phải rất mạnh (đa số nhỏ, vài khoản lớn hợp lệ) nên tính trên số
 * tiền thô sẽ gắn cờ oan mọi khoản hào phóng.
 */
export function logAmountZScore(amounts: readonly number[]): number {
  const logs = amounts.filter((amount) => Number.isFinite(amount) && amount > 0).map((amount) => Math.log(amount));
  if (logs.length < 2) return 0;
  const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
  const variance = logs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / logs.length;
  const std = Math.sqrt(variance);
  if (!Number.isFinite(std) || std <= 0) return 0;
  return Number(((Math.max(...logs) - mean) / std).toFixed(6));
}

/**
 * Mã lĩnh vực của mô hình dự đoán (khớp `CATEGORY_IDS` trong ai-service/app/services/catalog.py):
 * 0 Môi trường, 1 Khởi nghiệp, 2 Giáo dục, 3 Y tế, 4 Văn hóa, 5 Công nghệ.
 * Lĩnh vực do admin đặt tên tự do (vd. "Văn hóa nghệ thuật", "Nông nghiệp") nên dò theo từ khóa
 * không dấu thay vì so khớp nguyên tên. Nông nghiệp vào nhóm Khởi nghiệp vì lúc huấn luyện
 * Food/Crafts/Fashion của Kickstarter được gộp vào nhóm này.
 */
const AI_CATEGORY_RULES: ReadonlyArray<{ id: number; keywords: readonly string[] }> = [
  { id: 3, keywords: ["y te", "suc khoe", "benh"] },
  { id: 2, keywords: ["giao duc", "hoc bong", "truong hoc"] },
  { id: 5, keywords: ["cong nghe", "ky thuat so", "phan mem"] },
  { id: 4, keywords: ["van hoa", "nghe thuat", "am nhac", "dien anh", "truyen thong", "xuat ban"] },
  {
    id: 1,
    keywords: ["khoi nghiep", "nong nghiep", "kinh doanh", "thu cong", "thuc pham", "am thuc", "thoi trang", "lang nghe", "du lich"],
  },
  { id: 0, keywords: ["moi truong", "nang luong", "dong vat"] },
];
/** Không khớp lĩnh vực nào: giữ mã 0 như trước (Môi trường). */
const AI_CATEGORY_DEFAULT = 0;

function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lĩnh vực của nền tảng → mã lĩnh vực gửi cho mô hình dự đoán. */
export function aiCategoryId(category: string | null | undefined): number {
  const folded = foldVietnamese(category ?? "");
  if (!folded) return AI_CATEGORY_DEFAULT;
  const rule = AI_CATEGORY_RULES.find((candidate) => candidate.keywords.some((keyword) => folded.includes(keyword)));
  return rule ? rule.id : AI_CATEGORY_DEFAULT;
}

const EVENT_TYPE_MAP: Record<BehaviorEventType, AiUserEvent["eventType"]> = {
  [BehaviorEventType.VIEW]: "VIEW",
  [BehaviorEventType.FOLLOW]: "FOLLOW",
  [BehaviorEventType.CONTRIBUTE]: "CONTRIBUTE",
  [BehaviorEventType.SEARCH]: "SEARCH",
};

const DAY_MS = 86_400_000;

/** Trạng thái đã có kết quả cuối cùng — mẫu để AI tự học (ENDED: hết hạn, xét đạt theo số tiền). */
const FINISHED_STATUSES = [CampaignStatus.SUCCESS, CampaignStatus.FAILED, CampaignStatus.ENDED];
/** Số dự án đã kết thúc gần nhất gửi cho AI mỗi lần (khớp giới hạn MAX_HISTORY bên ai-service). */
const PLATFORM_HISTORY_LIMIT = 1000;
/** Dự án kết thúc ít khi thay đổi: lưu tạm danh sách 5 phút thay vì truy vấn mỗi lần dự đoán. */
const PLATFORM_HISTORY_TTL_MS = 5 * 60 * 1000;
/** Thời hạn gây quỹ ngắn nhất form tạo chiến dịch cho phép (≥ 1 tháng). */
const MIN_CAMPAIGN_DAYS = 30;
/** "Ban đầu" trong đặc trưng dự đoán = 7 ngày đầu gây quỹ (tổng hiện tại sẽ làm mô hình tự trả lời). */
const EARLY_WINDOW_DAYS = 7;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Số từ trong tên chiến dịch (đặc trưng `name_words`, như `name.split()` lúc huấn luyện). */
export function countWords(text: string | null | undefined): number {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Tháng (1–12) và thứ (0 = thứ Hai … 6 = Chủ nhật) của ngày bắt đầu theo giờ Việt Nam — khớp
 * `launched.dt.month` / `launched.dt.weekday` lúc huấn luyện. Ngày lỗi thì dùng hôm nay.
 */
export function launchCalendar(start: Date | string | null | undefined): {
  launchMonth: number;
  launchWeekday: number;
} {
  const parsed = start ? new Date(start) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const local = new Date(date.getTime() + VIETNAM_OFFSET_MS);
  return { launchMonth: local.getUTCMonth() + 1, launchWeekday: (local.getUTCDay() + 6) % 7 };
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type RecommendResult = {
  available: boolean;
  source?: string;
  items: {
    campaign: Campaign;
    score: number;
    reason: string;
  }[];
  detail?: string;
};

export type RecordEventResult =
  | { recorded: true; eventId: string }
  | { recorded: false; reason: "NO_CONSENT" };

export type PredictResult =
  | { available: true; campaignId: string; data: AiPredictResponse }
  | { available: false; campaignId: string };

export type EstimateResult =
  | { available: true; data: AiEstimateResponse }
  | { available: false };

/** Đạt mục tiêu: SUCCESS, hoặc ENDED (hết hạn) mà số tiền gọi được đã đủ mục tiêu. */
export function campaignReached(campaign: Pick<Campaign, "status" | "currentAmount" | "goalAmount">): boolean {
  if (campaign.status === CampaignStatus.SUCCESS) return true;
  if (campaign.status !== CampaignStatus.ENDED) return false;
  const goal = Number(campaign.goalAmount) || 0;
  return goal > 0 && (Number(campaign.currentAmount) || 0) >= goal;
}

export type FraudResult =
  | { available: true; entityType: string; entityId: string; data: AiFraudResponse }
  | { available: false; entityType: string; entityId: string };

@Injectable()
export class AiService {
  private platformHistory: { loadedAt: number; items: AiPlatformOutcome[] } | null = null;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BehaviorEvent)
    private readonly eventRepo: Repository<BehaviorEvent>,
    @InjectRepository(CampaignViewDaily)
    private readonly viewDailyRepo: Repository<CampaignViewDaily>,
    @Inject("AiGateway")
    private readonly aiGateway: AiGateway,
  ) {}

  async health(): Promise<{ available: boolean; detail?: string }> {
    try {
      await this.aiGateway.health();
      return { available: true };
    } catch (error) {
      return { available: false, detail: errorMessage(error) };
    }
  }

  async recommend(dto: RecommendAiDto, user?: User): Promise<RecommendResult> {
    const limit = dto.limit ?? 10;
    const excludeIds = dto.excludeIds ?? [];
    // Không gợi ý cho người dùng chính chiến dịch của họ
    const candidates = (await this.loadCandidates()).filter(
      (campaign) => !user || campaign.ownerId !== user.id,
    );

    if (candidates.length === 0) {
      return { available: true, source: "COLD_START", items: [], detail: "Không có chiến dịch để gợi ý" };
    }

    // Chỉ dùng lịch sử cá nhân (và gửi userId sang AI) khi người dùng đã đồng ý.
    const personalized = Boolean(user?.aiTrackingConsent);
    const history = personalized && user ? await this.buildHistory(user) : [];
    const preferences = dto.preferences?.length
      ? dto.preferences
      : this.derivePreferences(history);

    try {
      const response = await this.aiGateway.recommend({
        userId: personalized && user ? user.id : null,
        preferences,
        excludeIds,
        candidates: candidates.map((campaign) => this.toCampaignFeature(campaign)),
        history,
      });
      return this.attachRecommendItems(response, candidates, limit);
    } catch {
      const items = candidates
        .filter((campaign) => !excludeIds.includes(campaign.id))
        .map((campaign) => ({
          campaign,
          score: campaign.backerCount * 1.5 + campaign.viewCount * 0.7,
          reason: "Được cộng đồng đánh giá cao",
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        available: true,
        source: "POPULAR_FALLBACK",
        items,
        detail: "Dịch vụ AI tạm thời gián đoạn, hiển thị dự án phổ biến",
      };
    }
  }

  /** Dự đoán cho admin (`POST /ai/predict`). */
  async predict(dto: PredictAiDto): Promise<PredictResult> {
    const campaign = await this.findCampaignForPrediction(dto.campaignId);
    return this.runPrediction(campaign);
  }

  /**
   * Ước lượng của mô hình cho một chiến dịch — chỉ chủ dự án và admin được xem,
   * không hiển thị công khai để tránh ảnh hưởng quyết định của người ủng hộ.
   */
  async predictForViewer(campaignId: string, viewer: User): Promise<PredictResult> {
    const campaign = await this.findCampaignForPrediction(campaignId);
    if (campaign.ownerId !== viewer.id && viewer.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only the campaign owner or an admin can view the prediction");
    }
    return this.runPrediction(campaign);
  }

  private async findCampaignForPrediction(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
      relations: { owner: true, milestones: true },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  private async runPrediction(campaign: Campaign): Promise<PredictResult> {
    const [features, history] = await Promise.all([
      this.buildPredictFeatures(campaign),
      this.loadPlatformHistory(),
    ]);

    try {
      const data = await this.aiGateway.predict({
        campaignId: campaign.id,
        features,
        // Không tự học từ chính dự án đang dự đoán (nếu nó đã kết thúc, kết quả đã biết).
        history: history.filter((item) => item.campaignId !== campaign.id),
      });
      return { available: true, campaignId: campaign.id, data };
    } catch {
      return { available: false, campaignId: campaign.id };
    }
  }

  /**
   * Gợi ý mục tiêu và thời hạn cho chiến dịch đang soạn (chưa cần lưu), học từ các dự án Góp Mầm
   * đã kết thúc. Chỉ là tham khảo cho người tạo, không ảnh hưởng xét duyệt.
   */
  async estimateDraft(dto: EstimateCampaignDto, user: User): Promise<EstimateResult> {
    const now = new Date();
    const end = dto.endDate ? new Date(dto.endDate) : null;
    const durationDays = end && !Number.isNaN(end.getTime()) && end > now ? this.daysBetween(now, end) : 0;
    const [ownerCampaignCount, history] = await Promise.all([
      this.campaignRepo.count({ where: { ownerId: user.id } }),
      this.loadPlatformHistory(),
    ]);
    const features: AiPredictFeatures = {
      ...emptyPredictFeatures(),
      categoryId: aiCategoryId(dto.category),
      goalAmount: dto.goalAmount ?? 0,
      durationDays,
      // Chiến dịch mới: tính cả dự án đang tạo như khi đã lưu.
      ownerCampaignCount: ownerCampaignCount + 1,
      ownerCredentialApproved: Boolean(user.emailVerified),
      nameWords: countWords(dto.title),
      ...launchCalendar(now),
    };

    try {
      const data = await this.aiGateway.estimate({ features, history, minDurationDays: MIN_CAMPAIGN_DAYS });
      return { available: true, data };
    } catch {
      return { available: false };
    }
  }

  /**
   * Các dự án Góp Mầm đã kết thúc (mới nhất trước) kèm đặc trưng lúc ra mắt và kết quả thật.
   * Gửi kèm mỗi lần dự đoán để AI tự hiệu chỉnh theo dữ liệu nền tảng — dự án vừa kết thúc có
   * tác dụng ở lần dự đoán sau (tối đa trễ PLATFORM_HISTORY_TTL_MS), không cần huấn luyện lại.
   * Chỉ lấy các trường có sẵn trên bảng chiến dịch, không truy vấn thêm cho từng dự án.
   */
  async loadPlatformHistory(): Promise<AiPlatformOutcome[]> {
    const cached = this.platformHistory;
    if (cached && Date.now() - cached.loadedAt < PLATFORM_HISTORY_TTL_MS) return cached.items;

    const campaigns = await this.campaignRepo.find({
      where: { status: In(FINISHED_STATUSES) },
      order: { endDate: "DESC" },
      take: PLATFORM_HISTORY_LIMIT,
    });
    const items = campaigns
      .filter((campaign) => Number(campaign.goalAmount) > 0)
      .map((campaign) => ({
        campaignId: campaign.id,
        title: campaign.title ?? "",
        features: this.launchFeatures(campaign),
        reached: campaignReached(campaign),
        raised: Number(campaign.currentAmount) || 0,
      }));
    this.platformHistory = { loadedAt: Date.now(), items };
    return items;
  }

  /** Đặc trưng lúc ra mắt lấy được ngay từ bản ghi chiến dịch (không cần truy vấn phụ). */
  private launchFeatures(campaign: Campaign): AiPredictFeatures {
    return {
      ...emptyPredictFeatures(),
      categoryId: aiCategoryId(campaign.category),
      goalAmount: Number(campaign.goalAmount) || 0,
      durationDays: this.daysBetween(campaign.startDate, campaign.endDate),
      ...contentFeatures(campaign),
      hasVideo: Boolean(campaign.videoUrl),
      nameWords: countWords(campaign.title),
      ...launchCalendar(campaign.startDate),
    };
  }

  async getFraudScore(dto: FraudAiDto): Promise<FraudResult> {
    if (!dto.campaignId && !dto.userId) {
      throw new BadRequestException("Provide at least campaignId or userId");
    }

    if (dto.campaignId) {
      const entityId = dto.campaignId;
      const features = await this.buildCampaignFraudFeatures(entityId);
      try {
        const data = await this.aiGateway.getFraudScore({
          entityType: "CAMPAIGN",
          entityId,
          features,
        });
        return { available: true, entityType: "CAMPAIGN", entityId, data };
      } catch {
        return { available: false, entityType: "CAMPAIGN", entityId };
      }
    }

    const entityId = dto.userId as string;
    const features = await this.buildUserFraudFeatures(entityId);
    try {
      const data = await this.aiGateway.getFraudScore({
        entityType: "USER",
        entityId,
        features,
      });
      return { available: true, entityType: "USER", entityId, data };
    } catch {
      return { available: false, entityType: "USER", entityId };
    }
  }

  async recordEvent(dto: CreateBehaviorEventDto, user: User): Promise<RecordEventResult> {
    if (!user.aiTrackingConsent) {
      return { recorded: false, reason: "NO_CONSENT" };
    }

    const campaign = await this.campaignRepo.findOne({ where: { id: dto.campaignId } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    const event = this.eventRepo.create({
      userId: user.id,
      campaignId: dto.campaignId,
      eventType: dto.eventType,
      category: campaign.category,
    });
    const saved = await this.eventRepo.save(event);
    return { recorded: true, eventId: saved.id };
  }

  /**
   * Chỉ chiến dịch đang nhận ủng hộ: gợi ý một chiến dịch đã kết thúc hay chưa mở thì người
   * dùng bấm vào cũng không ủng hộ được.
   */
  private async loadCandidates(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      where: { status: CampaignStatus.ACTIVE, endDate: MoreThan(new Date()) },
      relations: { owner: true, milestones: true },
      order: { backerCount: "DESC" },
      take: RECOMMEND_POOL_SIZE,
    });
  }

  /** Lịch sử quan tâm, mới nhất trước (bộ gợi ý giảm trọng số theo vị trí trong danh sách). */
  private async buildHistory(user: User): Promise<AiUserEvent[]> {
    const [events, donations] = await Promise.all([
      this.eventRepo.find({
        where: { userId: user.id },
        order: { createdAt: "DESC" },
        take: HISTORY_LIMIT,
      }),
      this.donationRepo.find({
        where: { userId: user.id, status: DonationStatus.COMPLETED },
        relations: { campaign: true },
        order: { createdAt: "DESC" },
        take: HISTORY_LIMIT,
      }),
    ]);

    const timed: Array<{ at: number; event: AiUserEvent }> = events.map((event) => ({
      at: timeOf(event.createdAt),
      event: {
        campaignId: event.campaignId,
        eventType: EVENT_TYPE_MAP[event.eventType],
        category: event.category,
      },
    }));

    // Khoản ủng hộ đã được ghi thành sự kiện CONTRIBUTE thì không cộng lần hai
    const contributed = new Set(
      timed.filter((item) => item.event.eventType === "CONTRIBUTE").map((item) => item.event.campaignId),
    );
    for (const donation of donations) {
      const category = donation.campaign?.category;
      if (!category || contributed.has(donation.campaignId)) continue;
      contributed.add(donation.campaignId);
      timed.push({
        at: timeOf(donation.createdAt),
        event: { campaignId: donation.campaignId, eventType: "CONTRIBUTE", category },
      });
    }

    return timed
      .sort((a, b) => b.at - a.at)
      .slice(0, HISTORY_LIMIT)
      .map((item) => item.event);
  }

  private derivePreferences(history: AiUserEvent[]): string[] {
    const counts = new Map<string, number>();
    for (const event of history) {
      if (!event.category) continue;
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  private async buildPredictFeatures(campaign: Campaign): Promise<AiPredictFeatures> {
    const milestones = campaign.milestones ?? [];
    const start = new Date(campaign.startDate);
    const earlyEnd = new Date(start.getTime() + EARLY_WINDOW_DAYS * DAY_MS);
    const [ownerCampaignCount, earlyBackers, earlyViewDays] = await Promise.all([
      this.campaignRepo.count({ where: { ownerId: campaign.ownerId } }),
      this.donationRepo.count({
        where: { campaignId: campaign.id, status: DonationStatus.COMPLETED, createdAt: Between(start, earlyEnd) },
      }),
      this.viewDailyRepo.find({
        select: { views: true },
        where: { campaignId: campaign.id, viewDate: Between(utcDay(start), utcDay(new Date(earlyEnd.getTime() - 1))) },
      }),
    ]);

    return {
      categoryId: aiCategoryId(campaign.category),
      goalAmount: Number(campaign.goalAmount) || 0,
      durationDays: this.daysBetween(campaign.startDate, campaign.endDate),
      profileScore: this.profileScore(campaign),
      ...contentFeatures(campaign),
      hasVideo: Boolean(campaign.videoUrl),
      ownerCampaignCount,
      ownerCredentialApproved: Boolean(campaign.owner?.emailVerified),
      hasBudgetReport: milestones.some((milestone) => milestone.budget != null),
      earlyViews: earlyViewDays.reduce((sum, day) => sum + day.views, 0),
      earlyBackers,
      nameWords: countWords(campaign.title),
      ...launchCalendar(campaign.startDate),
    };
  }

  // Chỉ gửi đặc trưng hệ thống thực sự đo được; thiết bị dùng chung, đổi quốc gia IP và đổi hồ sơ
  // chưa được thu thập nên không gửi (gửi 0 sẽ khiến mô hình chấm trên dữ liệu giả).
  private async buildCampaignFraudFeatures(campaignId: string): Promise<Record<string, number>> {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [total, failed, recentDonations, completed] = await Promise.all([
      this.donationRepo.count({ where: { campaignId } }),
      this.donationRepo.count({ where: { campaignId, status: DonationStatus.FAILED } }),
      this.donationRepo.find({
        where: { campaignId, createdAt: MoreThan(lastHour) },
        select: { id: true, userId: true },
      }),
      this.donationRepo.find({
        where: { campaignId, status: DonationStatus.COMPLETED },
        select: { id: true, amount: true },
      }),
    ]);
    const amounts = completed.map((donation) => Number(donation.amount) || 0);

    // Tuổi tài khoản chủ dự án; không biết thì bỏ hẳn đặc trưng (gửi 0 sẽ bị luật coi là
    // "tài khoản mới tạo" và gắn cờ oan mọi chiến dịch).
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
      relations: { owner: true },
    });
    const ownerCreatedAt = campaign?.owner?.createdAt;

    return {
      // Số giao dịch của MỘT tài khoản trong 1 giờ (như lúc huấn luyện), không phải của cả chiến
      // dịch: chiến dịch được nhiều người ủng hộ cùng lúc là tín hiệu tốt, không phải gian lận.
      contribution_count_1h: maxDonationsPerDonor(recentDonations),
      failed_payment_count: failed,
      total_payment_count: total,
      amount_z_score: logAmountZScore(amounts),
      ...(ownerCreatedAt
        ? {
            new_account_days: Math.max(
              0,
              Math.floor((Date.now() - new Date(ownerCreatedAt).getTime()) / DAY_MS),
            ),
          }
        : {}),
    };
  }

  private async buildUserFraudFeatures(userId: string): Promise<Record<string, number>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [total, failed, recent] = await Promise.all([
      this.donationRepo.count({ where: { userId } }),
      this.donationRepo.count({ where: { userId, status: DonationStatus.FAILED } }),
      this.donationRepo.count({ where: { userId, createdAt: MoreThan(lastHour) } }),
    ]);

    return {
      contribution_count_1h: recent,
      failed_payment_count: failed,
      total_payment_count: total,
      amount_z_score: 0,
      new_account_days: Math.max(
        0,
        Math.floor((Date.now() - new Date(user.createdAt).getTime()) / DAY_MS),
      ),
    };
  }

  private attachRecommendItems(
    response: AiRecommendResponse,
    candidates: Campaign[],
    limit: number,
  ): RecommendResult {
    const byId = new Map(candidates.map((campaign) => [campaign.id, campaign]));
    const items = response.items
      .map((item) => {
        const campaign = byId.get(item.campaignId);
        return campaign ? { campaign, score: item.score, reason: item.reason } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit);

    return {
      available: true,
      source: response.source,
      items,
      detail: response.detail,
    };
  }

  private toCampaignFeature(campaign: Campaign): CampaignFeature {
    const target = Number(campaign.goalAmount) || 0;
    const current = Number(campaign.currentAmount) || 0;

    return {
      campaignId: campaign.id,
      category: campaign.category ?? "",
      title: campaign.title,
      keywords: this.extractKeywords(campaign.title, campaign.category),
      target,
      durationDays: this.daysBetween(campaign.startDate, campaign.endDate),
      profileScore: this.profileScore(campaign),
      fundedRatio: Math.min(1, target > 0 ? current / target : 0),
      daysLeft: Math.max(
        0,
        Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / DAY_MS),
      ),
      views: campaign.viewCount,
      backersCount: campaign.backerCount,
      contentLength: campaign.description?.length ?? 0,
      imageCount: campaign.imageUrl ? 1 : 0,
      hasVideo: Boolean(campaign.videoUrl),
      status: campaign.status,
    };
  }

  private profileScore(campaign: Campaign): number {
    let score = 0;
    if (campaign.title?.trim()) score += 20;
    if (campaign.description?.trim()) score += 20;
    if (campaign.category?.trim()) score += 10;
    if (campaign.imageUrl) score += 10;
    if (campaign.location) score += 5;
    if (campaign.videoUrl) score += 10;

    const milestones = campaign.milestones ?? [];
    score += Math.min(milestones.length, 3) * 5;
    if (milestones.some((milestone) => milestone.budget != null)) score += 10;

    return Math.min(100, score);
  }

  private daysBetween(start: Date, end: Date): number {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(diff / DAY_MS));
  }

  private extractKeywords(title: string, category: string): string[] {
    const stopWords = new Set([
      "cho", "và", "của", "dự", "án", "mới", "phát", "triển", "cộng", "đồng",
      "từ", "các", "với", "như", "được", "đã", "không", "này", "đó", "the",
      "and", "for",
    ]);
    const tokens = `${title} ${category}`
      .toLowerCase()
      .split(/[^a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word));
    return [...new Set(tokens)].slice(0, 10);
  }
}

/** Mô tả là HTML từ trình soạn thảo: đếm chữ trên văn bản thuần, ảnh = ảnh bìa + ảnh chèn trong mô tả. */
function contentFeatures(
  campaign: Pick<Campaign, "description" | "imageUrl">,
): Pick<AiPredictFeatures, "contentLength" | "imageCount" | "storyWordCount"> {
  const html = campaign.description ?? "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return {
    contentLength: text.length,
    imageCount: (campaign.imageUrl ? 1 : 0) + (html.match(/<img\b/gi)?.length ?? 0),
    storyWordCount: text ? text.split(" ").length : 0,
  };
}

function emptyPredictFeatures(): AiPredictFeatures {
  return {
    categoryId: 0,
    goalAmount: 0,
    durationDays: 0,
    profileScore: 0,
    contentLength: 0,
    imageCount: 0,
    hasVideo: false,
    storyWordCount: 0,
    ownerCampaignCount: 0,
    ownerCredentialApproved: false,
    hasBudgetReport: false,
    earlyViews: 0,
    earlyBackers: 0,
    nameWords: 0,
    launchMonth: 1,
    launchWeekday: 0,
  };
}

function timeOf(value: Date | string | null | undefined): number {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
