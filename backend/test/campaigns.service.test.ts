import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

function createMockRepo() {
  const mockCampaign = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test campaign",
    description: "A description",
    category: "Giáo dục",
    ownerId: "123e4567-e89b-12d3-a456-426614174001",
    goalAmount: 50000000,
    currentAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.DRAFT,
    backerCount: 0,
    viewCount: 0,
  };

  const repo: any = {
    create: (dto: any) => ({ ...mockCampaign, ...dto }),
    save: async (campaign: any) => ({ ...mockCampaign, ...campaign }),
    find: async () => [mockCampaign],
    findOne: async () => mockCampaign,
    count: async () => 1,
    remove: async () => undefined,
  };

  return { repo, mockCampaign };
}

function makeUser(role: UserRole = UserRole.USER, id = "123e4567-e89b-12d3-a456-426614174001") {
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

describe("CampaignsService", () => {
  let campaignsService: CampaignsService;
  let repo: any;
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    const created = createMockRepo();
    repo = created.repo;
    audit = makeAuditRecorder();
    campaignsService = new CampaignsService(repo as any, audit.service);
  });

  describe("create", () => {
    it("should create a draft campaign for the owner", async () => {
      const dto = {
        title: "New campaign",
        description: "Long description",
        category: "Giáo dục",
        goalAmount: 10000000,
        endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      };
      const campaign = await campaignsService.create(dto as any, makeUser());
      equal(campaign.title, "New campaign");
      equal(campaign.status, CampaignStatus.DRAFT);
      equal(campaign.ownerId, "123e4567-e89b-12d3-a456-426614174001");
      equal(campaign.currentAmount, 0);
    });
  });

  describe("findAll", () => {
    it("should return a paged result with filtered statuses", async () => {
      const result = await campaignsService.findAll({ limit: 9, offset: 0 });
      ok(Array.isArray(result.items));
      equal(result.total, 1);
      equal(result.limit, 9);
      equal(result.offset, 0);
    });
  });

  describe("findById", () => {
    it("should return a campaign by id", async () => {
      const campaign = await campaignsService.findById("123e4567-e89b-12d3-a456-426614174000");
      ok(campaign);
      equal(campaign!.title, "Test campaign");
    });

    it("should throw NotFoundException when campaign not found", async () => {
      repo.findOne = async () => null;
      await campaignsService
        .findById("missing")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("submitForReview", () => {
    it("should move a draft campaign to pending", async () => {
      repo.findOne = async () => ({
        ...createMockRepo().mockCampaign,
        status: CampaignStatus.DRAFT,
      });
      const campaign = await campaignsService.submitForReview(
        "123e4567-e89b-12d3-a456-426614174000",
        makeUser(),
      );
      equal(campaign.status, CampaignStatus.PENDING);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "campaign.submit");
      equal(audit.entries[0].userId, "123e4567-e89b-12d3-a456-426614174001");
      equal(audit.entries[0].oldValues?.status, CampaignStatus.DRAFT);
      equal(audit.entries[0].newValues?.status, CampaignStatus.PENDING);
    });

    it("should allow resubmission from needs_info", async () => {
      repo.findOne = async () => ({
        ...createMockRepo().mockCampaign,
        status: CampaignStatus.NEEDS_INFO,
      });
      const campaign = await campaignsService.submitForReview(
        "123e4567-e89b-12d3-a456-426614174000",
        makeUser(),
      );
      equal(campaign.status, CampaignStatus.PENDING);
    });

    it("should reject an active campaign for resubmission", async () => {
      repo.findOne = async () => ({
        ...createMockRepo().mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      await campaignsService
        .submitForReview("123e4567-e89b-12d3-a456-426614174000", makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });

    it("should reject someone who is not the owner", async () => {
      await campaignsService
        .submitForReview("123e4567-e89b-12d3-a456-426614174000", makeUser(UserRole.USER, "other-user-id"))
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });

  describe("update", () => {
    it("should allow editing a needs_info campaign", async () => {
      repo.findOne = async () => ({
        ...createMockRepo().mockCampaign,
        status: CampaignStatus.NEEDS_INFO,
      });
      const campaign = await campaignsService.update(
        "123e4567-e89b-12d3-a456-426614174000",
        { title: "Updated title" } as any,
        makeUser(),
      );
      equal(campaign.title, "Updated title");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "campaign.update");
      equal(audit.entries[0].oldValues?.title, "Test campaign");
      equal(audit.entries[0].newValues?.title, "Updated title");
    });

    it("should reject editing an active campaign", async () => {
      repo.findOne = async () => ({
        ...createMockRepo().mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      await campaignsService
        .update("123e4567-e89b-12d3-a456-426614174000", { title: "New" } as any, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });

  describe("moderate", () => {
    it("should allow an admin to approve a campaign", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.PENDING });
      const campaign = await campaignsService.moderate(
        "123e4567-e89b-12d3-a456-426614174000",
        { status: CampaignStatus.APPROVED } as any,
        makeUser(UserRole.ADMIN),
      );
      equal(campaign.status, CampaignStatus.APPROVED);
    });

    it("should allow an admin to request more info", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.PENDING });
      const campaign = await campaignsService.moderate(
        "123e4567-e89b-12d3-a456-426614174000",
        { status: CampaignStatus.NEEDS_INFO, reason: "Cần bổ sung chứng từ" } as any,
        makeUser(UserRole.ADMIN),
      );
      equal(campaign.status, CampaignStatus.NEEDS_INFO);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "campaign.moderate");
      equal(audit.entries[0].oldValues?.status, CampaignStatus.PENDING);
      equal(audit.entries[0].newValues?.status, CampaignStatus.NEEDS_INFO);
      equal(audit.entries[0].newValues?.rejectionReason, "Cần bổ sung chứng từ");
    });

    it("should require a reason for needs_info", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.PENDING });
      await campaignsService
        .moderate(
          "123e4567-e89b-12d3-a456-426614174000",
          { status: CampaignStatus.NEEDS_INFO } as any,
          makeUser(UserRole.ADMIN),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 400);
        });
    });

    it("should deny non-admins", async () => {
      await campaignsService
        .moderate(
          "123e4567-e89b-12d3-a456-426614174000",
          { status: CampaignStatus.APPROVED } as any,
          makeUser(),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });

    it("should reject a transition outside the allowed matrix (draft -> ended)", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.DRAFT });
      await campaignsService
        .moderate(
          "123e4567-e89b-12d3-a456-426614174000",
          { status: CampaignStatus.ENDED } as any,
          makeUser(UserRole.ADMIN),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });

    it("should allow pausing an active campaign with a reason", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.ACTIVE });
      const campaign = await campaignsService.moderate(
        "123e4567-e89b-12d3-a456-426614174000",
        { status: CampaignStatus.PAUSED, reason: "Đang rà soát chứng từ" } as any,
        makeUser(UserRole.ADMIN),
      );
      equal(campaign.status, CampaignStatus.PAUSED);
    });

    it("should require a reason to pause a campaign", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.ACTIVE });
      await campaignsService
        .moderate(
          "123e4567-e89b-12d3-a456-426614174000",
          { status: CampaignStatus.PAUSED } as any,
          makeUser(UserRole.ADMIN),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 400);
        });
    });

    it("should allow resuming a paused campaign without a reason", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status: CampaignStatus.PAUSED });
      const campaign = await campaignsService.moderate(
        "123e4567-e89b-12d3-a456-426614174000",
        { status: CampaignStatus.ACTIVE } as any,
        makeUser(UserRole.ADMIN),
      );
      equal(campaign.status, CampaignStatus.ACTIVE);
    });
  });

  describe("remove", () => {
    it("should allow the owner to remove a campaign", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign });
      await campaignsService.remove("123e4567-e89b-12d3-a456-426614174000", makeUser());
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "campaign.delete");
      equal(audit.entries[0].entityId, "123e4567-e89b-12d3-a456-426614174000");
      equal(audit.entries[0].oldValues?.title, "Test campaign");
    });

    it("should throw ForbiddenException for a non-owner", async () => {
      repo.findOne = async () => ({ ...createMockRepo().mockCampaign });
      await campaignsService
        .remove("123e4567-e89b-12d3-a456-426614174000", makeUser(UserRole.USER, "other-user-id"))
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });
});