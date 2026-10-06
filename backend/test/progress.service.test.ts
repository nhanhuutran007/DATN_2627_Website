import { deepEqual, equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { MediaPurpose } from "../src/modules/media/entities/media-file.entity";
import { Milestone } from "../src/modules/progress/entities/milestone.entity";
import { ProgressService } from "../src/modules/progress/progress.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";
const MILESTONE_ID = "123e4567-e89b-12d3-a456-426614174002";
const UPDATE_ID = "123e4567-e89b-12d3-a456-426614174003";
const RECEIPT_ID = "123e4567-e89b-12d3-a456-426614174004";

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
    aiTrackingConsent: false,
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

  updateRepo.findAndCount = async () => [
    [{ id: UPDATE_ID, milestoneId: MILESTONE_ID, content: "Báo cáo tiến độ", expenseAmount: 1000000, attachments: [] }],
    1,
  ];

  const donationRepo: any = {
    sum: async () => 5000000,
  };

  const mockReceipt = {
    id: RECEIPT_ID,
    ownerId: OWNER_ID,
    storageKey: `receipts/${RECEIPT_ID}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1000,
    purpose: MediaPurpose.EXPENSE_RECEIPT,
  };
  const mediaRepo: any = {
    find: async () => [mockReceipt],
  };
  const attachmentRepo: any = {
    count: async () => 0,
  };

  const savedRevisions: any[] = [];
  const revisionRepo: any = {
    create: (dto: any) => dto,
    save: async (revision: any) => {
      savedRevisions.push(revision);
      return { id: "rev-1", ...revision };
    },
    count: async () => savedRevisions.length,
    find: async () => savedRevisions.map((revision) => ({ id: "rev-1", createdAt: new Date(), ...revision })),
  };

  return {
    milestoneRepo,
    updateRepo,
    campaignRepo,
    donationRepo,
    mediaRepo,
    attachmentRepo,
    revisionRepo,
    savedRevisions,
    mockCampaign,
    mockMilestone,
    mockReceipt,
  };
}

describe("ProgressService", () => {
  let service: ProgressService;
  let repos: ReturnType<typeof createMockRepos>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;

  beforeEach(() => {
    repos = createMockRepos();
    audit = makeAuditRecorder();
    notifier = makeNotifierRecorder();
    service = new ProgressService(
      repos.milestoneRepo,
      repos.updateRepo,
      repos.campaignRepo,
      repos.donationRepo,
      repos.mediaRepo,
      repos.attachmentRepo,
      repos.revisionRepo,
      audit.service,
      notifier.service,
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
    it("should update a milestone and record a public revision", async () => {
      const milestone = await service.updateMilestone(
        MILESTONE_ID,
        { title: "Đổi tên", changeReason: "Gộp hai hạng mục khảo sát" },
        makeUser(),
      );
      equal(milestone.title, "Đổi tên");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone.update");
      equal(audit.entries[0].oldValues?.title, "Khảo sát");
      equal(audit.entries[0].newValues?.title, "Đổi tên");
      equal(repos.savedRevisions.length, 1);
      equal(repos.savedRevisions[0].reason, "Gộp hai hạng mục khảo sát");
      // Chỉ đổi tên: không thông báo đổi lịch
      equal(notifier.backerNotices.length, 0);
    });

    it("should require a reason after the campaign is published", async () => {
      await service
        .updateMilestone(MILESTONE_ID, { title: "Đổi tên" }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 400);
        });
    });

    it("should allow edits without a reason while the campaign is a draft", async () => {
      repos.campaignRepo.findOne = async () => ({ ...repos.mockCampaign, status: CampaignStatus.DRAFT });
      const milestone = await service.updateMilestone(MILESTONE_ID, { title: "Bản nháp" }, makeUser());
      equal(milestone.title, "Bản nháp");
      equal(repos.savedRevisions.length, 0);
    });

    it("should notify backers and reset the overdue reminder when rescheduling", async () => {
      repos.mockMilestone.overdueNotifiedAt = new Date();
      const milestone = await service.updateMilestone(
        MILESTONE_ID,
        { targetDate: "2026-12-01T00:00:00.000Z", changeReason: "Nhà cung cấp giao hàng chậm hai tuần" },
        makeUser(),
      );
      equal(milestone.overdueNotifiedAt, null);
      equal(repos.savedRevisions[0].newValues.targetDate, "2026-12-01T00:00:00.000Z");
      equal(notifier.backerNotices.length, 1);
      equal(notifier.backerNotices[0].base.type, "milestone_rescheduled");
      ok(notifier.backerNotices[0].base.message.includes("Nhà cung cấp giao hàng chậm hai tuần"));
    });

    it("should not reschedule a completed milestone", async () => {
      repos.mockMilestone.isCompleted = true;
      await service
        .updateMilestone(MILESTONE_ID, { budget: 1, changeReason: "Điều chỉnh ngân sách sau quyết toán" }, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });

    it("should ignore values that did not change", async () => {
      await service.updateMilestone(MILESTONE_ID, { title: "Khảo sát", budget: 5000000 }, makeUser());
      equal(audit.entries.length, 0);
      equal(repos.savedRevisions.length, 0);
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
    it("should block removing milestones after the campaign is published", async () => {
      await service
        .removeMilestone(MILESTONE_ID, makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });

    it("should remove a milestone and record an audit entry", async () => {
      repos.campaignRepo.findOne = async () => ({ ...repos.mockCampaign, status: CampaignStatus.DRAFT });
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
    const expectStatus = (promise: Promise<unknown>, status: number) =>
      promise
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, status);
        });

    it("should add an expense update with receipts", async () => {
      const update = await service.addMilestoneUpdate(
        MILESTONE_ID,
        {
          content: "Đã mua vật tư đợt 1",
          expenseAmount: 300000,
          receipts: [{ mediaId: RECEIPT_ID, caption: "Hóa đơn vật tư" }],
        },
        makeUser(),
      );
      equal(update.milestoneId, MILESTONE_ID);
      equal(update.attachments?.length, 1);
      equal(update.attachments?.[0].url, `/api/v1/media/receipts/${RECEIPT_ID}.jpg`);
      equal(update.attachments?.[0].caption, "Hóa đơn vật tư");
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "milestone_update.create");
      deepEqual(audit.entries[0].newValues?.receiptMediaIds, [RECEIPT_ID]);
    });

    it("should allow a text-only update without receipts", async () => {
      const update = await service.addMilestoneUpdate(
        MILESTONE_ID,
        { content: "Đã khảo sát xong 3 điểm trường" },
        makeUser(),
      );
      equal(update.expenseAmount, undefined);
      equal(update.attachments?.length, 0);
    });

    it("should require receipts when reporting an expense", async () => {
      await expectStatus(
        service.addMilestoneUpdate(MILESTONE_ID, { content: "Đã chi tiền", expenseAmount: 300000 }, makeUser()),
        400,
      );
    });

    it("should reject expenses beyond the confirmed raised amount", async () => {
      // Đã chi 1.000.000, đã huy động 5.000.000 → còn tối đa 4.000.000
      await expectStatus(
        service.addMilestoneUpdate(
          MILESTONE_ID,
          { content: "Chi vượt quỹ", expenseAmount: 4_000_001, receipts: [{ mediaId: RECEIPT_ID }] },
          makeUser(),
        ),
        409,
      );
    });

    it("should reject receipts uploaded by someone else", async () => {
      repos.mediaRepo.find = async () => [{ ...repos.mockReceipt, ownerId: "someone-else" }];
      await expectStatus(
        service.addMilestoneUpdate(
          MILESTONE_ID,
          { content: "Chứng từ của người khác", expenseAmount: 1000, receipts: [{ mediaId: RECEIPT_ID }] },
          makeUser(),
        ),
        403,
      );
    });

    it("should reject media that is not an expense receipt", async () => {
      repos.mediaRepo.find = async () => [{ ...repos.mockReceipt, purpose: MediaPurpose.CAMPAIGN_IMAGE }];
      await expectStatus(
        service.addMilestoneUpdate(
          MILESTONE_ID,
          { content: "Ảnh chiến dịch", expenseAmount: 1000, receipts: [{ mediaId: RECEIPT_ID }] },
          makeUser(),
        ),
        400,
      );
    });

    it("should reject a receipt already attached to another update", async () => {
      repos.attachmentRepo.count = async () => 1;
      await expectStatus(
        service.addMilestoneUpdate(
          MILESTONE_ID,
          { content: "Dùng lại chứng từ", expenseAmount: 1000, receipts: [{ mediaId: RECEIPT_ID }] },
          makeUser(),
        ),
        409,
      );
    });

    it("should allow reporting after the campaign succeeded", async () => {
      repos.campaignRepo.findOne = async () => ({ ...repos.mockCampaign, status: CampaignStatus.SUCCESS });
      const update = await service.addMilestoneUpdate(
        MILESTONE_ID,
        { content: "Giải ngân sau khi gây quỹ thành công" },
        makeUser(),
      );
      equal(update.milestoneId, MILESTONE_ID);
    });

    it("should reject updates for draft or failed campaigns", async () => {
      for (const status of [CampaignStatus.DRAFT, CampaignStatus.FAILED]) {
        repos.campaignRepo.findOne = async () => ({ ...repos.mockCampaign, status });
        await expectStatus(
          service.addMilestoneUpdate(MILESTONE_ID, { content: "Không được phép" }, makeUser()),
          409,
        );
      }
    });

    it("should deny non-owner, non-admin", async () => {
      await expectStatus(
        service.addMilestoneUpdate(
          MILESTONE_ID,
          { content: "Không phải chủ dự án" },
          makeUser(UserRole.USER, "other-user"),
        ),
        403,
      );
    });
  });

  describe("listCampaignUpdates", () => {
    it("should list updates with milestone titles", async () => {
      const result = await service.listCampaignUpdates(CAMPAIGN_ID);
      equal(result.total, 1);
      equal(result.items[0].milestoneTitle, "Khảo sát");
    });

    it("should throw NotFoundException for missing campaign", async () => {
      repos.campaignRepo.findOne = async () => null;
      await service
        .listCampaignUpdates("missing")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("getCampaignProgress", () => {
    it("should compute progress summary from transactions", async () => {
      const summary = await service.getCampaignProgress(CAMPAIGN_ID);
      equal(summary.totalMilestones, 1);
      equal(summary.completedMilestones, 0);
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

  describe("transparency status", () => {
    const NOW = new Date("2026-10-07T00:00:00.000Z");
    const PAST = new Date("2026-10-01T00:00:00.000Z");

    it("should flag an unfinished milestone past its date as overdue", async () => {
      repos.mockMilestone.targetDate = PAST;
      repos.updateRepo.find = async () => [];
      const summary = await service.getCampaignProgress(CAMPAIGN_ID, NOW);
      equal(summary.milestoneStates[0].state, "overdue");
      equal(summary.transparency, "late");
      equal(summary.overdueMilestones, 1);
      equal(summary.lastUpdateAt, null);
    });

    it("should count an update posted after the deadline as an explanation", async () => {
      repos.mockMilestone.targetDate = PAST;
      const explainedAt = new Date("2026-10-03T00:00:00.000Z");
      repos.updateRepo.find = async () => [
        { id: UPDATE_ID, milestoneId: MILESTONE_ID, content: "Giải trình", createdAt: explainedAt },
      ];
      const summary = await service.getCampaignProgress(CAMPAIGN_ID, NOW);
      equal(summary.milestoneStates[0].state, "overdue_explained");
      equal(summary.transparency, "late_explained");
      equal(summary.lastUpdateAt?.toISOString(), explainedAt.toISOString());
    });

    it("should treat completed and future milestones as on track", async () => {
      repos.mockMilestone.targetDate = new Date("2026-12-01T00:00:00.000Z");
      const summary = await service.getCampaignProgress(CAMPAIGN_ID, NOW);
      equal(summary.milestoneStates[0].state, "on_track");
      equal(summary.transparency, "on_track");

      repos.mockMilestone.targetDate = PAST;
      repos.mockMilestone.isCompleted = true;
      const done = await service.getCampaignProgress(CAMPAIGN_ID, NOW);
      equal(done.milestoneStates[0].state, "completed");
      equal(done.completedMilestones, 1);
    });
  });

  describe("listMilestoneRevisions", () => {
    it("should list revisions with milestone titles", async () => {
      await service.updateMilestone(
        MILESTONE_ID,
        { budget: 6000000, changeReason: "Giá vật tư tăng so với dự toán" },
        makeUser(),
      );
      const revisions = await service.listMilestoneRevisions(CAMPAIGN_ID);
      equal(revisions.length, 1);
      equal(revisions[0].milestoneTitle, "Khảo sát");
      equal(revisions[0].newValues.budget, 6000000);
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