import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Brackets } from "typeorm";

import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignQueryDto } from "../src/modules/campaigns/dto/campaign.dto";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

type RecordedCondition = { sql: string; params?: Record<string, unknown> };

/**
 * QueryBuilder giả cho `findAll`: ghi lại điều kiện WHERE (kể cả trong Brackets),
 * thứ tự sắp xếp và phân trang; trả các id cấu hình sẵn.
 */
function makeListQueryBuilder(state: { ids: string[]; total: number }) {
  const conditions: RecordedCondition[] = [];
  const orders: Array<[string, string | undefined]> = [];
  const page: { offset?: number; limit?: number } = {};

  const record = (condition: unknown, params?: Record<string, unknown>): void => {
    if (condition instanceof Brackets) {
      const sub: Record<string, unknown> = {};
      const add = (sql: unknown, p?: Record<string, unknown>) => {
        record(sql, p);
        return sub;
      };
      Object.assign(sub, { where: add, orWhere: add, andWhere: add });
      condition.whereFactory(sub as never);
    } else {
      conditions.push({ sql: String(condition), params });
    }
  };

  const qb: Record<string, unknown> = {};
  Object.assign(qb, {
    select: () => qb,
    where: (sql: unknown, params?: Record<string, unknown>) => (record(sql, params), qb),
    andWhere: (sql: unknown, params?: Record<string, unknown>) => (record(sql, params), qb),
    orderBy: (sort: string, dir?: string) => (orders.push([sort, dir]), qb),
    addOrderBy: (sort: string, dir?: string) => (orders.push([sort, dir]), qb),
    clone: () => qb,
    offset: (value: number) => ((page.offset = value), qb),
    limit: (value: number) => ((page.limit = value), qb),
    getRawMany: async () => state.ids.map((id) => ({ id })),
    getCount: async () => state.total,
  });

  const sqlOf = () => conditions.map((condition) => condition.sql);
  const params = (): Record<string, unknown> =>
    Object.assign({}, ...conditions.map((condition) => condition.params ?? {}));
  return { qb, conditions, orders, page, sqlOf, params };
}

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
    createQueryBuilder: () => listQuery.qb,
    findOne: async () => mockCampaign,
    count: async () => 1,
    remove: async () => undefined,
  };

  const listState = { ids: [mockCampaign.id], total: 1 };
  const listQuery = makeListQueryBuilder(listState);
  return { repo, mockCampaign, listState, listQuery };
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
    aiTrackingConsent: false,
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
  let listState: ReturnType<typeof createMockRepo>["listState"];
  let listQuery: ReturnType<typeof createMockRepo>["listQuery"];

  beforeEach(() => {
    const created = createMockRepo();
    repo = created.repo;
    listState = created.listState;
    listQuery = created.listQuery;
    audit = makeAuditRecorder();
    campaignsService = new CampaignsService(repo as any, audit.service, makeNotifierRecorder().service);
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

    it("should reject non-public status filters on the public listing", async () => {
      for (const status of [CampaignStatus.DRAFT, CampaignStatus.PENDING, CampaignStatus.REJECTED]) {
        await rejects(campaignsService.findAll({ status: [status] }), BadRequestException);
        await rejects(
          campaignsService.findAll({ status: [CampaignStatus.ACTIVE, status] }),
          BadRequestException,
        );
      }
    });

    it("should still let owners filter their own drafts", async () => {
      const result = await campaignsService.findAll(
        { status: [CampaignStatus.DRAFT] },
        "123e4567-e89b-12d3-a456-426614174001",
      );
      equal(result.total, 1);
      ok(listQuery.sqlOf().includes("c.ownerId = :ownerId"));
      deepEqual(listQuery.params().statuses, [CampaignStatus.DRAFT]);
    });

    it("mặc định chỉ lấy trạng thái công khai và phân trang ở bước lấy id", async () => {
      await campaignsService.findAll({ limit: 12, offset: 24 });
      deepEqual(listQuery.params().statuses, [
        CampaignStatus.APPROVED,
        CampaignStatus.ACTIVE,
        CampaignStatus.SUCCESS,
        CampaignStatus.ENDED,
      ]);
      deepEqual(listQuery.page, { offset: 24, limit: 12 });
    });

    it("giữ đúng thứ tự id của bước lọc khi nạp quan hệ", async () => {
      listState.ids = ["b", "a", "missing"];
      listState.total = 3;
      repo.find = async () => [{ id: "a", title: "A" }, { id: "b", title: "B" }];
      const result = await campaignsService.findAll({});
      deepEqual(result.items.map((item) => item.id), ["b", "a"]);
      equal(result.total, 3);
    });

    it("trang rỗng thì không truy vấn bước 2", async () => {
      listState.ids = [];
      listState.total = 0;
      repo.find = async () => {
        throw new Error("should not load relations");
      };
      const result = await campaignsService.findAll({ offset: 90 });
      deepEqual(result.items, []);
    });

    it("áp dụng lọc địa điểm, khoảng vốn, tỷ lệ hoàn thành và từ khóa (thoát ký tự LIKE)", async () => {
      await campaignsService.findAll({
        q: "100%_",
        location: "Đà Nẵng",
        minGoal: 10_000_000,
        maxGoal: 200_000_000,
        minProgress: 50,
        maxProgress: 100,
        category: "Giáo dục",
      });
      const sql = listQuery.sqlOf();
      ok(sql.includes("c.title LIKE :q") && sql.includes("c.location LIKE :q"));
      ok(sql.includes("c.location LIKE :location"));
      ok(sql.includes("c.goalAmount >= :minGoal") && sql.includes("c.goalAmount <= :maxGoal"));
      ok(sql.some((item) => item.includes("NULLIF(c.goalAmount, 0)) >= :minProgress")));
      ok(sql.some((item) => item.includes("NULLIF(c.goalAmount, 0)) <= :maxProgress")));
      const params = listQuery.params();
      equal(params.q, "%100\\%\\_%");
      equal(params.location, "%Đà Nẵng%");
      equal(params.category, "Giáo dục");
    });

    it("lọc sắp kết thúc trong N ngày chỉ lấy chiến dịch đang gây quỹ", async () => {
      const before = Date.now();
      await campaignsService.findAll({ endingWithinDays: 7 });
      const params = listQuery.params();
      equal(params.activeStatus, CampaignStatus.ACTIVE);
      const endingBefore = (params.endingBefore as Date).getTime();
      ok(endingBefore >= before + 7 * 86_400_000 && endingBefore <= Date.now() + 7 * 86_400_000);
    });

    it("sắp xếp gần đạt mục tiêu theo tỷ lệ %, sắp hết hạn bỏ chiến dịch đã quá hạn", async () => {
      await campaignsService.findAll({ sort: "progress" });
      ok(listQuery.orders[0][0].includes("c.currentAmount * 100"));
      equal(listQuery.orders[0][1], "DESC");

      const ending = createMockRepo();
      const service = new CampaignsService(ending.repo, audit.service, makeNotifierRecorder().service);
      await service.findAll({ sort: "ending" });
      deepEqual(ending.listQuery.orders[0], ["c.endDate", "ASC"]);
      ok(ending.listQuery.sqlOf().includes("c.endDate >= :now"));
    });

    it("từ chối khoảng lọc ngược", async () => {
      await rejects(campaignsService.findAll({ minGoal: 10, maxGoal: 5 }), BadRequestException);
      await rejects(campaignsService.findAll({ minProgress: 80, maxProgress: 20 }), BadRequestException);
    });
  });

  describe("CampaignQueryDto", () => {
    async function parse(query: Record<string, unknown>) {
      const dto = plainToInstance(CampaignQueryDto, query);
      return { dto, errors: (await validate(dto)).map((error) => error.property) };
    }

    it("nhận nhiều trạng thái qua dấu phẩy hoặc lặp tham số", async () => {
      deepEqual((await parse({ status: "active,success" })).dto.status, ["active", "success"]);
      deepEqual((await parse({ status: ["active", "ended"] })).dto.status, ["active", "ended"]);
      deepEqual((await parse({ status: "active" })).errors, []);
    });

    it("ép kiểu số và từ chối giá trị ngoài phạm vi", async () => {
      const valid = await parse({ minGoal: "1000000", maxProgress: "100", endingWithinDays: "7" });
      deepEqual(valid.errors, []);
      equal(valid.dto.minGoal, 1_000_000);
      deepEqual(
        (await parse({ status: "active,hacked", minGoal: "-1", endingWithinDays: "0" })).errors.sort(),
        ["endingWithinDays", "minGoal", "status"],
      );
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

    it("should refuse to delete a published campaign (it may hold donations)", async () => {
      for (const status of [CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.SUCCESS, CampaignStatus.PENDING]) {
        repo.findOne = async () => ({ ...createMockRepo().mockCampaign, status });
        let removed = false;
        repo.remove = async () => { removed = true; };
        await rejects(
          campaignsService.remove("123e4567-e89b-12d3-a456-426614174000", makeUser(UserRole.ADMIN)),
          (err: { status?: number }) => err.status === 409,
        );
        equal(removed, false);
      }
    });
  });
});