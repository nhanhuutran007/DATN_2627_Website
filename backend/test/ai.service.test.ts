import { deepEqual, equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { AiGateway } from "../src/integrations/ai/ai.gateway";
import type {
  AiFraudResponse,
  AiPredictResponse,
  AiRecommendRequest,
  AiRecommendResponse,
} from "../src/integrations/ai/ai.types";
import { AiService } from "../src/modules/ai/ai.service";
import { BehaviorEventType } from "../src/modules/ai/entities/behavior-event.entity";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CAMPAIGN_ID = "33333333-3333-3333-3333-333333333333";

function makeCampaign(overrides = {}) {
  return {
    id: CAMPAIGN_ID,
    title: "Test Campaign",
    description: "A campaign for testing",
    category: "Giáo dục",
    ownerId: USER_ID,
    goalAmount: 50000000,
    currentAmount: 1000000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.ACTIVE,
    imageUrl: "https://example.com/img.png",
    location: "Hà Nội",
    backerCount: 3,
    viewCount: 120,
    owner: { emailVerified: true },
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hash",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    aiTrackingConsent: false,
    aiConsentUpdatedAt: null,
    campaigns: [],
    donations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeAiGateway implements AiGateway {
  unavailable = false;
  lastRecommend: AiRecommendRequest | null = null;

  async health(): Promise<never> {
    throw new Error("not used");
  }

  async recommend(request: AiRecommendRequest): Promise<AiRecommendResponse> {
    this.lastRecommend = request;
    if (this.unavailable) throw new Error("down");
    return {
      source: "COLD_START",
      fallback: false,
      detail: "ok",
      items: [{ campaignId: CAMPAIGN_ID, score: 0.8, reason: "Phù hợp" }],
    };
  }

  async predict(): Promise<AiPredictResponse> {
    if (this.unavailable) throw new Error("down");
    return {
      probability: 0.72,
      prediction: "LIKELY",
      confidence: 0.44,
      model: "2026.09.1",
      fallback: false,
      metrics: null,
      factors: [],
    };
  }

  async getFraudScore(): Promise<AiFraudResponse> {
    if (this.unavailable) throw new Error("down");
    return {
      riskScore: 0.1,
      level: "LOW",
      method: "RULE",
      reasons: [],
      evidences: {},
      fallback: true,
    };
  }
}

function createRepos() {
  const campaignRepo: any = {
    find: async () => [makeCampaign()],
    findOne: async (opts: any) =>
      opts?.where?.id === "missing" ? null : makeCampaign(),
    count: async () => 2,
  };
  const donationRepo: any = {
    find: async () => [
      { campaignId: CAMPAIGN_ID, campaign: makeCampaign() },
    ],
    count: async () => 0,
  };
  const userRepo: any = {
    findOne: async (opts: any) =>
      opts?.where?.id === "missing" ? null : makeUser(),
  };
  const eventRepo: any = {
    create: (dto: any) => dto,
    save: async (event: any) => ({ id: "event-1", ...event }),
    find: async () => [
      { campaignId: CAMPAIGN_ID, eventType: BehaviorEventType.VIEW, category: "Giáo dục" },
    ],
  };
  return { campaignRepo, donationRepo, userRepo, eventRepo };
}

describe("AiService", () => {
  let service: AiService;
  let gateway: FakeAiGateway;
  let repos: ReturnType<typeof createRepos>;

  beforeEach(() => {
    repos = createRepos();
    gateway = new FakeAiGateway();
    service = new AiService(
      repos.campaignRepo,
      repos.donationRepo,
      repos.userRepo,
      repos.eventRepo,
      gateway,
    );
  });

  describe("recommend", () => {
    it("should return ranked items when the AI service is available", async () => {
      const result = await service.recommend({ limit: 5 });
      ok(result.available);
      equal(result.items.length, 1);
      equal(result.items[0].campaign.id, CAMPAIGN_ID);
      ok(result.source);
    });

    it("should fall back to popularity ranking when the AI service is down", async () => {
      gateway.unavailable = true;
      const result = await service.recommend({ limit: 5 });
      ok(result.available);
      equal(result.source, "POPULAR_FALLBACK");
      equal(result.items.length, 1);
      ok(result.detail);
    });

    it("should build history from behavior events for a consenting user", async () => {
      const result = await service.recommend({ limit: 5 }, makeUser({ aiTrackingConsent: true }));
      ok(result.available);
      equal(result.items.length, 1);
      equal(gateway.lastRecommend?.userId, USER_ID);
      ok((gateway.lastRecommend?.history.length ?? 0) > 0);
    });

    it("should not personalize or send userId without consent", async () => {
      repos.eventRepo.find = async () => {
        throw new Error("history must not be read without consent");
      };
      const result = await service.recommend({ limit: 5 }, makeUser());
      ok(result.available);
      equal(gateway.lastRecommend?.userId, null);
      equal(gateway.lastRecommend?.history.length, 0);
    });
  });

  describe("predict", () => {
    it("should return prediction data for a campaign", async () => {
      const result = await service.predict({ campaignId: CAMPAIGN_ID });
      equal(result.available, true);
      if (result.available) {
        equal(result.campaignId, CAMPAIGN_ID);
        equal(result.data.probability, 0.72);
        equal(result.data.prediction, "LIKELY");
      }
    });

    it("should report unavailable when the AI service is down", async () => {
      gateway.unavailable = true;
      const result = await service.predict({ campaignId: CAMPAIGN_ID });
      equal(result.available, false);
    });

    it("should throw NotFoundException for a missing campaign", async () => {
      await service
        .predict({ campaignId: "missing" })
        .then(() => Promise.reject(new Error("should have thrown")))
        .catch((err) => equal(err.status, 404));
    });
  });

  describe("getFraudScore", () => {
    it("should reject requests without campaignId or userId", async () => {
      await service
        .getFraudScore({})
        .then(() => Promise.reject(new Error("should have thrown")))
        .catch((err) => equal(err.status, 400));
    });

    it("should score a campaign entity", async () => {
      const result = await service.getFraudScore({ campaignId: CAMPAIGN_ID });
      equal(result.available, true);
      if (result.available) {
        equal(result.entityType, "CAMPAIGN");
        equal(result.data.level, "LOW");
      }
    });

    it("should score a user entity", async () => {
      const result = await service.getFraudScore({ userId: USER_ID });
      equal(result.available, true);
      if (result.available) {
        equal(result.entityType, "USER");
      }
    });

    it("should report unavailable when the AI service is down", async () => {
      gateway.unavailable = true;
      const result = await service.getFraudScore({ campaignId: CAMPAIGN_ID });
      equal(result.available, false);
    });
  });

  describe("recordEvent", () => {
    it("should persist a behavior event with the campaign category when consented", async () => {
      let saved: any = null;
      repos.eventRepo.save = async (event: any) => {
        saved = event;
        return { id: "event-1", ...event };
      };
      const result = await service.recordEvent(
        { campaignId: CAMPAIGN_ID, eventType: BehaviorEventType.VIEW },
        makeUser({ aiTrackingConsent: true }),
      );
      deepEqual(result, { recorded: true, eventId: "event-1" });
      equal(saved.userId, USER_ID);
      equal(saved.campaignId, CAMPAIGN_ID);
      equal(saved.category, "Giáo dục");
    });

    it("should skip recording without consent", async () => {
      repos.eventRepo.save = async () => {
        throw new Error("must not save without consent");
      };
      const result = await service.recordEvent(
        { campaignId: CAMPAIGN_ID, eventType: BehaviorEventType.VIEW },
        makeUser(),
      );
      deepEqual(result, { recorded: false, reason: "NO_CONSENT" });
    });

    it("should throw NotFoundException for a missing campaign", async () => {
      repos.campaignRepo.findOne = async () => null;
      await service
        .recordEvent(
          { campaignId: "missing", eventType: BehaviorEventType.FOLLOW },
          makeUser({ aiTrackingConsent: true }),
        )
        .then(() => Promise.reject(new Error("should have thrown")))
        .catch((err) => equal(err.status, 404));
    });
  });
});