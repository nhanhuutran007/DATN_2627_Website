import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { Milestone } from "../src/modules/progress/entities/milestone.entity";
import { ProgressService } from "../src/modules/progress/progress.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";
const MILESTONE_ID = "123e4567-e89b-12d3-a456-426614174002";
const UPDATE_ID = "123e4567-e89b-12d3-a456-426614174003";

function makeUser(role: UserRole = UserRole.USER, id = OWNER_ID) {
  return {
    id,
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hash",
    role,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    campaigns: [],
    donations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockRepos() {
  const mockCampaign = {
    id: CAMPAIGN_ID,
    title: "Test Campaign",
    description: "Description",
    category: "Giáo dục",
    ownerId: OWNER_ID,
    goalAmount: 50000000,
    currentAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.ACTIVE,
    backerCount: 3,
    viewCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMilestone: Partial<Milestone> = {
    id: MILESTONE_ID,
    campaignId: CAMPAIGN_ID,
    title: "Khảo sát",
    description: "Khảo sát nhu cầu",
    targetDate: new Date(),
    budget: 5000000,
    sortOrder: 1,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    updates: [],
  };

  const milestoneRepo: any = {
    create: (dto: any) => ({ ...mockMilestone, ...dto }),
    save: async (m: any) => ({ ...mockMilestone, ...m }),
    find: async (opts: any) => {
      if (opts?.where?.id && opts.where.id === "missing") return [];
      return [mockMilestone];
    },
    findOne: async (opts: any) => {
      if (opts?.where?.id === "missing") return null;
      return mockMilestone;
    },
    count: async (opts: any) => {
      if (opts?.where?.isCompleted) return 1;
      return 1;
    },
    maximum: async () => 1,
    remove: async () => undefined,
  };

  const updateRepo: any = {
    create: (dto: any) => ({ id: UPDATE_ID, ...dto }),
    save: async (u: any) => ({ id: UPDATE_ID, ...u }),
    find: async () => [
      { id: UPDATE_ID, milestoneId: MILESTONE_ID, content: "Báo cáo tiến độ", expenseAmount: 1000000 },
    ],
  };

  const campaignRepo: any = {
    findOne: async (opts: any) => {
      if (opts?.where?.id === "missing") return null;
      return mockCampaign;
    },
  };

  const donationRepo: any = {
    sum: async () => 5000000,
  };

  return { milestoneRepo, updateRepo, campaignRepo, donationRepo, mockCampaign };
}

describe("ProgressService", () => {
  let service: ProgressService;
  let repos: ReturnType<typeof createMockRepos>;
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    repos = createMockRepos();
    audit = makeAuditRecorder();
    service = new ProgressService(
      repos.milestoneRepo,
      repos.updateRepo,
      repos.campaignRepo,
      repos.donationRepo,
      audit.service,
    );
  });

  describe("findCampaignMilestones", () => {
    it("should return milestones with total", async () => {
      const result = await service.findCampaignMilestones(CAMPAIGN_ID);
      ok(Array.isArray(result.items));
      equal(result.total, 1);
    });
  });

  describe("createMilestone", () => {
    it("should create a milestone for campaign owner", async () => {
      const milestone = await service.createMilestone(
        CAMPAIGN_ID,
        { title: "Mốc mới", budget: 2000000 },
        makeUser(),
      );
      equal(milestone.title, "Mốc mới");
      equal(milestone.campaignId, CAMPAIGN_ID);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone.create");
    });

    it("should deny non-owner, non-admin", async () => {
      await service
        .createMilestone(
          CAMPAIGN_ID,
          { title: "Mốc mới" },
          makeUser(UserRole.USER, "other-user"),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });

    it("should throw NotFoundException for missing campaign", async () => {
      repos.campaignRepo.findOne = async () => null;
      await service
        .createMilestone("missing", { title: "Mốc" }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("updateMilestone", () => {
    it("should update a milestone", async () => {
      const milestone = await service.updateMilestone(
        MILESTONE_ID,
        { title: "Đổi tên" },
        makeUser(),
      );
      equal(milestone.title, "Đổi tên");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone.update");
      equal(audit.entries[0].oldValues?.title, "Khảo sát");
      equal(audit.entries[0].newValues?.title, "Đổi tên");
    });

    it("should throw NotFoundException for missing milestone", async () => {
      repos.milestoneRepo.findOne = async () => null;
      await service
        .updateMilestone("missing", { title: "x" }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("removeMilestone", () => {
    it("should remove a milestone and record an audit entry", async () => {
      await service.removeMilestone(MILESTONE_ID, makeUser());
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone.delete");
      equal(audit.entries[0].entityId, MILESTONE_ID);
    });

    it("should deny non-owner, non-admin", async () => {
      await service
        .removeMilestone(MILESTONE_ID, makeUser(UserRole.USER, "other-user"))
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });

  describe("completeMilestone", () => {
    it("should mark milestone complete", async () => {
      const milestone = await service.completeMilestone(MILESTONE_ID, makeUser());
      equal(milestone.isCompleted, true);
      ok(milestone.completedAt);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone.complete");
    });

    it("should deny non-owner", async () => {
      await service
        .completeMilestone(MILESTONE_ID, makeUser(UserRole.USER, "other-user"))
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });

  describe("addMilestoneUpdate", () => {
    it("should add an update to a milestone", async () => {
      const update = await service.addMilestoneUpdate(
        MILESTONE_ID,
        { content: "Đã hoàn thành", expenseAmount: 300000 },
        makeUser(),
      );
      equal(update.milestoneId, MILESTONE_ID);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone_update.create");
    });
  });

  describe("getCampaignProgress", () => {
    it("should compute progress summary from transactions", async () => {
      const summary = await service.getCampaignProgress(CAMPAIGN_ID);
      equal(summary.totalMilestones, 1);
      equal(summary.completedMilestones, 1);
      equal(summary.totalBudget, 5000000);
      equal(summary.totalExpense, 1000000);
      equal(summary.totalRaised, 5000000);
      equal(summary.backerCount, 3);
    });

    it("should throw NotFoundException for missing campaign", async () => {
      repos.campaignRepo.findOne = async () => null;
      await service
        .getCampaignProgress("missing")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("constraints", () => {
    it("should reject milestone changes for a closed campaign", async () => {
      repos.campaignRepo.findOne = async () => ({
        ...repos.mockCampaign,
        status: CampaignStatus.SUCCESS,
      });
      await service
        .createMilestone(CAMPAIGN_ID, { title: "Muộn" }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });
  });
});