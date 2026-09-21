import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AiService } from "../src/modules/ai/ai.service";
import { RiskAlertService } from "../src/modules/admin/risk-alert.service";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import {
  RiskAlert,
  RiskAlertLevel,
  RiskAlertStatus,
  RiskEntityType,
  RiskMethod,
} from "../src/modules/admin/entities/risk-alert.entity";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174010";
const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174001";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: ADMIN_ID,
    name: "Admin",
    email: "admin@gopmam.vn",
    passwordHash: "hash",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    campaigns: [],
    donations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: CAMPAIGN_ID,
    title: "Chiến dịch test",
    description: "Mô tả",
    category: "Giáo dục",
    ownerId: ADMIN_ID,
    goalAmount: 10000000,
    currentAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.ACTIVE,
    backerCount: 0,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    donations: [],
    milestones: [],
    ...overrides,
  } as Campaign;
}

function makeAlert(overrides: Partial<RiskAlert> = {}): RiskAlert {
  return {
    id: "123e4567-e89b-12d3-a456-426614174099",
    entityType: RiskEntityType.CAMPAIGN,
    entityId: CAMPAIGN_ID,
    entityName: "Chiến dịch test",
    level: RiskAlertLevel.HIGH,
    score: 0.8,
    method: RiskMethod.AI,
    reasons: [{ group: "frequency", label: "Nhiều giao dịch trong thời gian ngắn", weight: 0.4 }],
    evidences: { contribution_count_1h: 5, failed_payment_count: 0, total_payment_count: 10, amount_z_score: 0 },
    status: RiskAlertStatus.OPEN,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RiskAlert;
}

function makeAiService(resultOverride: () => any | Promise<any>) {
  return {
    getFraudScore: async () => resultOverride(),
  } as any as AiService;
}

function makeService(opts: {
  campaigns?: Campaign[];
  donation?: { total?: number; failed?: number; recent?: number; amounts?: number[] };
  aiResult?: () => any;
  existingOpen?: RiskAlert | null;
  openAlerts?: RiskAlert[];
}) {
  const donation = opts.donation ?? {};
  const donationRepo: any = {
    count: async ({ where }: { where: any }) => {
      if (where?.status === DonationStatus.FAILED) return donation.failed ?? 0;
      if (where?.createdAt) return donation.recent ?? 0;
      return donation.total ?? 0;
    },
    find: async () =>
      (donation.amounts ?? []).map((amount) => ({ amount })),
  };

  const saved: RiskAlert[] = [];
  const created: RiskAlert[] = [];
  const finalAlerts: RiskAlert[] = [];

  const riskAlertRepo: any = {
    findOneBy: async ({ id, entityId }: { id?: string; entityId?: string }) => {
      if (id !== undefined) {
        return finalAlerts.find((alert) => alert.id === id) ?? null;
      }
      return opts.existingOpen ?? null;
    },
    findBy: async () => opts.openAlerts ?? [],
    create: (dto: any) => {
      const alert = { ...makeAlert(), ...dto, id: `uuid-${created.length + 1}` };
      created.push(alert);
      return alert;
    },
    save: async (alert: RiskAlert) => {
      saved.push(alert);
      return alert;
    },
  };

  const aiService = makeAiService(opts.aiResult ?? (() => ({ available: false, entityType: "CAMPAIGN", entityId: CAMPAIGN_ID })));

  const campaignRepo: any = { find: async () => opts.campaigns ?? [makeCampaign()] };

  const audit = makeAuditRecorder();
  const service = new RiskAlertService(campaignRepo, donationRepo, riskAlertRepo, aiService, audit.service);

  return {
    service,
    audit,
    saved,
    created,
    finalAlerts,
    riskAlertRepo,
  };
}

describe("RiskAlertService", () => {
  let user: User;

  beforeEach(() => {
    user = makeUser();
  });

  describe("generateWarnings", () => {
    it("should flag campaigns with a medium/high AI score", async () => {
      const { service, created, audit } = makeService({
        aiResult: () => ({
          available: true,
          entityType: "CAMPAIGN",
          entityId: CAMPAIGN_ID,
          data: {
            riskScore: 0.85,
            level: "HIGH",
            method: "RULE",
            reasons: [{ group: "frequency", label: "Nhiều giao dịch trong thời gian ngắn", weight: 0.4 }],
            evidences: { contribution_count_1h: 6 },
            fallback: false,
          },
        }),
      });

      const result = await service.generateWarnings(user);
      equal(result.aiAvailable, true);
      equal(result.scanned, 1);
      equal(result.flagged, 1);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "risk_alert.generate");
      equal(audit.entries[0].userId, ADMIN_ID);
      equal(audit.entries[0].newValues?.flagged, 1);
      equal(created.length, 1);
      equal(created[0].level, RiskAlertLevel.HIGH);
      equal(created[0].method, RiskMethod.RULE);
    });

    it("should use the rule fallback when the AI service is down", async () => {
      const { service, created } = makeService({
        aiResult: () => ({ available: false, entityType: "CAMPAIGN", entityId: CAMPAIGN_ID }),
        donation: { total: 10, failed: 3, recent: 5, amounts: [1000, 100000] },
      });

      const result = await service.generateWarnings(user);
      equal(result.aiAvailable, false);
      equal(result.flagged, 1);
      equal(created[0].method, RiskMethod.RULE);
      equal(created[0].level, RiskAlertLevel.HIGH);
      equal(created[0].reasons.length, 2);
    });

    it("should skip campaigns with a LOW score", async () => {
      const { service, created } = makeService({
        aiResult: () => ({
          available: true,
          entityType: "CAMPAIGN",
          entityId: CAMPAIGN_ID,
          data: {
            riskScore: 0.1,
            level: "LOW",
            method: "ENSEMBLE",
            reasons: [],
            evidences: {},
            fallback: false,
          },
        }),
      });

      const result = await service.generateWarnings(user);
      equal(result.flagged, 0);
      equal(created.length, 0);
    });

    it("should update an existing open alert instead of creating a duplicate", async () => {
      const existing = makeAlert();
      const { service, created, saved } = makeService({
        aiResult: () => ({
          available: true,
          entityType: "CAMPAIGN",
          entityId: CAMPAIGN_ID,
          data: {
            riskScore: 0.9,
            level: "HIGH",
            method: "ENSEMBLE",
            reasons: [{ group: "payment", label: "Thất bại thanh toán", weight: 0.35 }],
            evidences: { contribution_count_1h: 8 },
            fallback: false,
          },
        }),
        existingOpen: existing,
      });

      const result = await service.generateWarnings(user);
      equal(result.flagged, 1);
      equal(created.length, 0);
      equal(saved.length, 1);
      equal(saved[0].score, 0.9);
      equal(saved[0].reasons[0].group, "payment");
    });

    it("should auto-resolve stale open alerts for unflagged entities", async () => {
      const kept = makeAlert({ id: "kept-1" });
      const stale = makeAlert({ id: "stale-1", entityId: "other-campaign", entityName: "Khác" });
      const { service, saved } = makeService({
        aiResult: () => ({
          available: true,
          entityType: "CAMPAIGN",
          entityId: CAMPAIGN_ID,
          data: {
            riskScore: 0.8,
            level: "HIGH",
            method: "ENSEMBLE",
            reasons: [{ group: "frequency", label: "Nhiều giao dịch", weight: 0.4 }],
            evidences: { contribution_count_1h: 5 },
            fallback: false,
          },
        }),
        existingOpen: kept,
        openAlerts: [kept, stale],
      });

      await service.generateWarnings(user);
      const resolvedStale = saved.find((alert) => alert.id === "stale-1");
      ok(resolvedStale);
      equal(resolvedStale.status, RiskAlertStatus.RESOLVED);
      equal(resolvedStale.resolvedBy, ADMIN_ID);
    });
  });

  describe("list", () => {
    it("should return a paged list of alerts", async () => {
      const { makeListRepo } = buildListRepo();
      const service = new RiskAlertService(null as any, null as any, makeListRepo() as any, makeAiService(async () => ({ available: false })), makeAuditRecorder().service);
      const result = await service.list({ limit: 10, offset: 0 });
      ok(Array.isArray(result.items));
      equal(result.total, 1);
      equal(result.limit, 10);
    });
  });

  describe("updateStatus", () => {
    it("should resolve an alert and record who handled it", async () => {
      const alert = makeAlert();
      const riskAlertRepo: any = {
        findOneBy: async () => alert,
        save: async (value: RiskAlert) => value,
      };
      const audit = makeAuditRecorder();
      const service = new RiskAlertService({} as any, {} as any, riskAlertRepo, makeAiService(async () => ({ available: false })), audit.service);

      const updated = await service.updateStatus(alert.id, { status: RiskAlertStatus.RESOLVED }, user);
      equal(updated.status, RiskAlertStatus.RESOLVED);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "risk_alert.status.update");
      equal(audit.entries[0].userId, ADMIN_ID);
      equal(audit.entries[0].newValues?.status, RiskAlertStatus.RESOLVED);
      equal(updated.resolvedBy, ADMIN_ID);
      ok(updated.resolvedAt instanceof Date);
    });

    it("should throw NotFoundException for a missing alert", async () => {
      const riskAlertRepo: any = {
        findOneBy: async () => null,
      };
      const service = new RiskAlertService({} as any, {} as any, riskAlertRepo, makeAiService(async () => ({ available: false })), makeAuditRecorder().service);

      await service
        .updateStatus("missing", { status: RiskAlertStatus.DISMISSED }, user)
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });
});

function buildListRepo() {
  const items = [makeAlert()];
  return {
    makeListRepo: () => ({
      findAndCount: async () => [items, items.length],
    }),
  };
}