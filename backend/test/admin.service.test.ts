import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AdminService } from "../src/modules/admin/admin.service";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { RiskAlertLevel, RiskAlertStatus } from "../src/modules/admin/entities/risk-alert.entity";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const USER_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_ID = "123e4567-e89b-12d3-a456-426614174002";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    name: "Admin User",
    email: "admin@example.com",
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
    id: "123e4567-e89b-12d3-a456-426614174010",
    title: "Campaign",
    description: "Description",
    category: "Giáo dục",
    ownerId: OTHER_ID,
    owner: makeUser({ role: UserRole.CAMPAIGN_OWNER }),
    goalAmount: 10000000,
    currentAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.PENDING,
    backerCount: 0,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    donations: [],
    milestones: [],
    ...overrides,
  } as Campaign;
}

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: "123e4567-e89b-12d3-a456-426614174020",
    userId: USER_ID,
    user: makeUser(),
    campaignId: "123e4567-e89b-12d3-a456-426614174010",
    campaign: makeCampaign(),
    amount: 100000,
    currency: "VND",
    status: DonationStatus.PENDING,
    idempotencyKey: "key",
    isAnonymous: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Donation;
}

type MockRepo = {
  find: any;
  findAndCount: any;
  findOneBy: any;
  save: any;
  calls: any[];
  [key: string]: any;
};

function createMockRepos() {
  const userRepo: MockRepo = {
    find: async () => [makeUser({ role: UserRole.CAMPAIGN_OWNER })],
    findAndCount: async () => [[makeUser()], 1],
    findOneBy: async ({ id }: { id: string }) =>
      id === "missing" ? null : makeUser(),
    save: async (user: User) => user,
    calls: [],
  };
  const campaignRepo: MockRepo = {
    find: async () => [
      makeCampaign({ status: CampaignStatus.SUCCESS, currentAmount: 5000000 }),
      makeCampaign({ status: CampaignStatus.PENDING }),
    ],
    findAndCount: async () => [[makeCampaign()], 1],
    findOneBy: async () => makeCampaign(),
    save: async (campaign: Campaign) => campaign,
    calls: [],
  };
  const donationRepo: MockRepo = {
    find: async () => [
      makeDonation({ status: DonationStatus.COMPLETED, amount: 1000000, completedAt: new Date() }),
      makeDonation({ status: DonationStatus.COMPLETED, amount: 2000000, completedAt: new Date() }),
      makeDonation({ status: DonationStatus.FAILED, amount: 500000 }),
      makeDonation({ status: DonationStatus.PENDING }),
      makeDonation({ status: DonationStatus.REFUNDED }),
    ],
    findAndCount: async () => [[makeDonation()], 1],
    findOneBy: async () => makeDonation(),
    save: async (donation: Donation) => donation,
    calls: [],
  };
  const riskAlertRepo: MockRepo & { seed: any[] } = {
    find: async ({ where }: any) => {
      const list = riskAlertRepo.seed ?? [];
      return where?.status ? list.filter((alert: any) => alert.status === where.status) : list;
    },
    findAndCount: async () => [[], 0],
    findOneBy: async () => null,
    save: async (alert: any) => alert,
    create: (dto: any) => dto,
    calls: [],
    seed: [],
  };

  const capture = (repo: MockRepo, method: string) => {
    const original = repo[method];
    repo[method] = async (...args: unknown[]) => {
      repo.calls.push({ method, args });
      return original(...args);
    };
  };
  capture(userRepo, "find");
  capture(userRepo, "findAndCount");
  capture(userRepo, "findOneBy");
  capture(campaignRepo, "find");
  capture(campaignRepo, "findAndCount");
  capture(donationRepo, "find");
  capture(donationRepo, "findAndCount");

  return { userRepo, campaignRepo, donationRepo, riskAlertRepo };
}

function makeService() {
  const repos = createMockRepos();
  const audit = makeAuditRecorder();
  const service = new AdminService(
    repos.userRepo as any,
    repos.campaignRepo as any,
    repos.donationRepo as any,
    repos.riskAlertRepo as any,
    audit.service,
  );
  return { service, repos, audit };
}

describe("AdminService", () => {
  let service: AdminService;
  let repos: { userRepo: MockRepo; campaignRepo: MockRepo; donationRepo: MockRepo; riskAlertRepo: MockRepo & { seed: any[] } };

  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    const built = makeService();
    service = built.service;
    repos = built.repos;
    audit = built.audit;
  });

  describe("getOverview", () => {
    it("should aggregate users, campaigns and donations", async () => {
      const overview = (await service.getOverview()) as any;
      equal(overview.users.total, 1);
      equal(overview.users.owners, 1);

      equal(overview.campaigns.total, 2);
      equal(overview.campaigns.pending, 1);
      equal(overview.campaigns.success, 1);

      equal(overview.donations.total, 5);
      equal(overview.donations.completed, 2);
      equal(overview.donations.failed, 1);
      equal(overview.donations.pending, 1);
      equal(overview.donations.refunded, 1);
      equal(overview.donations.completedAmount, 3000000);
      equal(overview.donations.failedAmount, 500000);
    });

    it("should compute successRate and topCategories", async () => {
      const overview = (await service.getOverview()) as any;
      equal(overview.successRate, 1);
      ok(Array.isArray(overview.topCategories));
      equal(overview.topCategories[0].category, "Giáo dục");
      equal(overview.topCategories[0].raised, 5000000);
    });

    it("should return six monthly buckets ending on the current month", async () => {
      const overview = (await service.getOverview()) as any;
      ok(Array.isArray(overview.monthly));
      equal(overview.monthly.length, 6);
      const last = overview.monthly[5];
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      equal(last.month, expected);
      equal(last.donations, 2);
      equal(last.raised, 3000000);
    });

    it("should count open risk alerts by level", async () => {
      repos.riskAlertRepo.seed = [
        { status: RiskAlertStatus.OPEN, level: RiskAlertLevel.HIGH },
        { status: RiskAlertStatus.OPEN, level: RiskAlertLevel.MEDIUM },
        { status: RiskAlertStatus.RESOLVED, level: RiskAlertLevel.HIGH },
      ];
      const overview = (await service.getOverview()) as any;
      equal(overview.risks.open, 2);
      equal(overview.risks.high, 1);
      equal(overview.risks.medium, 1);
    });
  });

  describe("listCampaigns", () => {
    it("should return a paged list", async () => {
      const result = await service.listCampaigns({ limit: 10, offset: 0 });
      ok(Array.isArray(result.items));
      equal(result.total, 1);
      equal(result.limit, 10);
      equal(result.offset, 0);
    });

    it("should pass status filter into the query", async () => {
      await service.listCampaigns({ status: CampaignStatus.PENDING });
      const call = repos.campaignRepo.calls.find((c) => c.method === "findAndCount");
      equal(call.args[0].where.status, CampaignStatus.PENDING);
    });

    it("should build an OR-array where when searching", async () => {
      await service.listCampaigns({ q: "học" });
      const call = repos.campaignRepo.calls.find((c) => c.method === "findAndCount");
      ok(Array.isArray(call.args[0].where));
      equal(call.args[0].where.length, 3);
    });

    it("should map the sort option to an order", async () => {
      await service.listCampaigns({ sort: "raised" });
      const call = repos.campaignRepo.calls.find((c) => c.method === "findAndCount");
      equal(call.args[0].order.currentAmount, "DESC");
    });
  });

  describe("listDonations", () => {
    it("should return a paged list", async () => {
      const result = await service.listDonations({ limit: 5, offset: 0 });
      ok(Array.isArray(result.items));
      equal(result.total, 1);
    });

    it("should pass status filter into the query", async () => {
      await service.listDonations({ status: DonationStatus.COMPLETED });
      const call = repos.donationRepo.calls.find((c) => c.method === "findAndCount");
      equal(call.args[0].where.status, DonationStatus.COMPLETED);
    });
  });

  describe("listUsers", () => {
    it("should return a paged list", async () => {
      const result = await service.listUsers({ limit: 5, offset: 0 });
      ok(Array.isArray(result.items));
      equal(result.total, 1);
    });

    it("should pass role and status filters into the query", async () => {
      await service.listUsers({ role: UserRole.CAMPAIGN_OWNER, status: UserStatus.ACTIVE });
      const call = repos.userRepo.calls.find((c) => c.method === "findAndCount");
      equal(call.args[0].where.role, UserRole.CAMPAIGN_OWNER);
      equal(call.args[0].where.status, UserStatus.ACTIVE);
    });
  });

  describe("updateUserStatus", () => {
    it("should ban another user", async () => {
      repos.userRepo.findOneBy = async () => makeUser({ id: OTHER_ID });
      const user = await service.updateUserStatus(
        OTHER_ID,
        { status: UserStatus.BANNED },
        makeUser(),
      );
      equal(user.status, UserStatus.BANNED);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "user.status.update");
      equal(audit.entries[0].userId, USER_ID);
      equal(audit.entries[0].entityId, OTHER_ID);
      equal(audit.entries[0].oldValues?.status, UserStatus.ACTIVE);
      equal(audit.entries[0].newValues?.status, UserStatus.BANNED);
    });

    it("should prevent an admin from banning themselves", async () => {
      await service
        .updateUserStatus(USER_ID, { status: UserStatus.BANNED }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 400);
        });
    });

    it("should throw NotFoundException for a missing user", async () => {
      repos.userRepo.findOneBy = async () => null;
      await service
        .updateUserStatus("missing", { status: UserStatus.ACTIVE }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });
});