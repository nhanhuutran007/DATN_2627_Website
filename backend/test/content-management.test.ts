import { deepEqual, equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ContentService, MAX_FEATURED } from "../src/modules/admin/content.service";
import { ExportService, ownerPseudonym } from "../src/modules/admin/export.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { CategoriesService } from "../src/modules/categories/categories.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { makeAuditRecorder } from "./helpers/audit";

const ADMIN = { id: "admin-1" } as never;
const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";

const expectStatus = (promise: Promise<unknown>, status: number) =>
  promise
    .then(() => {
      throw new Error("should have thrown");
    })
    .catch((err) => {
      equal(err.status, status);
    });

describe("ContentService.setFeatured", () => {
  let campaign: any;
  let featuredCount: number;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: ContentService;

  beforeEach(() => {
    campaign = { id: CAMPAIGN_ID, status: CampaignStatus.ACTIVE, isFeatured: false, featuredAt: null };
    featuredCount = 0;
    audit = makeAuditRecorder();
    const repo: any = {
      findOneBy: async () => campaign,
      count: async () => featuredCount,
      save: async (value: any) => value,
    };
    service = new ContentService(repo, audit.service);
  });

  it("should feature an active campaign and audit it", async () => {
    const saved = await service.setFeatured(CAMPAIGN_ID, true, ADMIN);
    equal(saved.isFeatured, true);
    ok(saved.featuredAt);
    equal(audit.entries[0].action, "campaign.feature");
  });

  it("should refuse campaigns that are not public", async () => {
    campaign.status = CampaignStatus.PENDING;
    await expectStatus(service.setFeatured(CAMPAIGN_ID, true, ADMIN), 400);
  });

  it("should cap the number of featured campaigns", async () => {
    featuredCount = MAX_FEATURED;
    await expectStatus(service.setFeatured(CAMPAIGN_ID, true, ADMIN), 409);
  });

  it("should unfeature and clear the timestamp", async () => {
    campaign.isFeatured = true;
    campaign.featuredAt = new Date();
    const saved = await service.setFeatured(CAMPAIGN_ID, false, ADMIN);
    equal(saved.isFeatured, false);
    equal(saved.featuredAt, null);
    equal(audit.entries[0].action, "campaign.unfeature");
  });

  it("should be a no-op when nothing changes", async () => {
    await service.setFeatured(CAMPAIGN_ID, false, ADMIN);
    equal(audit.entries.length, 0);
  });
});

describe("ExportService", () => {
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: ExportService;

  beforeEach(() => {
    audit = makeAuditRecorder();
    const campaignRepo: any = {
      find: async (opts: any) =>
        opts?.select
          ? [{ id: CAMPAIGN_ID, category: "Giáo dục" }]
          : [
              {
                id: CAMPAIGN_ID,
                title: "=HYPERLINK(\"x\")",
                category: "Giáo dục",
                location: "Huế",
                status: CampaignStatus.ACTIVE,
                isFeatured: true,
                ownerId: OWNER_ID,
                goalAmount: "1000000.00",
                currentAmount: "250000.00",
                backerCount: 3,
                viewCount: 40,
                createdAt: new Date("2026-09-01T00:00:00Z"),
                startDate: new Date("2026-09-02T00:00:00Z"),
                endDate: new Date("2026-11-01T00:00:00Z"),
              },
            ],
    };
    const donationRepo: any = {
      find: async () => [
        // 23:30 UTC ngày 05/10 = 06:30 ngày 06/10 giờ VN
        { campaignId: CAMPAIGN_ID, amount: "100000.00", status: DonationStatus.COMPLETED, completedAt: new Date("2026-10-05T23:30:00Z") },
        { campaignId: CAMPAIGN_ID, amount: "50000.00", status: DonationStatus.COMPLETED, completedAt: new Date("2026-10-06T02:00:00Z") },
        { campaignId: CAMPAIGN_ID, amount: "20000.00", status: DonationStatus.REFUNDED, completedAt: new Date("2026-10-06T03:00:00Z") },
      ],
    };
    const milestoneRepo: any = {
      find: async () => [
        { id: "m1", campaignId: CAMPAIGN_ID, isCompleted: true },
        { id: "m2", campaignId: CAMPAIGN_ID, isCompleted: false },
      ],
    };
    const updateRepo: any = { find: async () => [{ milestoneId: "m1", expenseAmount: "70000.00" }] };
    service = new ExportService(campaignRepo, donationRepo, milestoneRepo, updateRepo, audit.service);
  });

  it("should export campaigns without personal data and with a pseudonymous owner", async () => {
    const file = await service.exportCampaigns(ADMIN, new Date("2026-10-07T00:00:00Z"));
    equal(file.filename, "thong-ke-chien-dich_2026-10-07.csv");
    equal(file.rows, 1);
    ok(file.content.startsWith("﻿"), "UTF-8 BOM cho Excel");
    ok(file.content.includes(ownerPseudonym(OWNER_ID)));
    ok(!file.content.includes(OWNER_ID), "không lộ id chủ dự án");
    // Chặn CSV injection ở tên chiến dịch
    ok(file.content.includes(`"'=HYPERLINK(""x"")"`));
    // 25%, 2 mốc (1 xong), chi 70.000
    ok(file.content.includes(`"25","3","40","2","1","70000"`));
    deepEqual(audit.entries[0].newValues, { kind: "campaigns", rows: 1 });
  });

  it("should aggregate donations per Vietnam day and category", async () => {
    const file = await service.exportDailyDonations({ from: "2026-10-01", to: "2026-10-07" }, ADMIN);
    const lines = file.content.replace("﻿", "").trim().split("\r\n");
    equal(lines.length, 2, "header + 1 ngày (cả 3 giao dịch rơi vào 06/10 giờ VN)");
    equal(lines[1], `"2026-10-06","Giáo dục","2","150000","1","20000"`);
    equal(audit.entries[0].action, "admin.export");
  });
});

describe("CategoriesService", () => {
  let categories: any[];
  let audit: ReturnType<typeof makeAuditRecorder>;
  let campaignUpdates: Array<{ criteria: any; partial: any }>;
  let service: CategoriesService;

  beforeEach(() => {
    categories = [
      { id: "c1", name: "Giáo dục", description: null, sortOrder: 0, isActive: true },
      { id: "c2", name: "Y tế", description: null, sortOrder: 1, isActive: true },
    ];
    campaignUpdates = [];
    audit = makeAuditRecorder();
    const manager: any = {
      transaction: async (work: (em: any) => Promise<unknown>) =>
        work({
          save: async (_entity: unknown, value: any) => value,
          update: async (_entity: unknown, criteria: any, partial: any) => {
            campaignUpdates.push({ criteria, partial });
            return { affected: 4 };
          },
        }),
    };
    const categoryRepo: any = {
      manager,
      find: async () => categories,
      findOne: async (opts: any) => categories.find((c) => c.name === opts.where.name) ?? null,
      findOneBy: async (where: any) => categories.find((c) => c.id === where.id) ?? null,
      count: async () => categories.filter((c) => c.isActive).length,
      maximum: async () => 1,
      create: (value: any) => ({ id: "c3", ...value }),
      save: async (value: any) => value,
    };
    service = new CategoriesService(categoryRepo, {} as never, audit.service);
  });

  it("should create a category at the end of the list", async () => {
    const saved = await service.create({ name: "Văn hóa" }, ADMIN);
    equal(saved.sortOrder, 2);
    equal(audit.entries[0].action, "category.create");
  });

  it("should reject duplicate names ignoring case", async () => {
    await expectStatus(service.create({ name: "y tế" }, ADMIN), 409);
  });

  it("should rename and move campaigns to the new name", async () => {
    const saved = await service.update("c2", { name: "Y tế cộng đồng" }, ADMIN);
    equal(saved.name, "Y tế cộng đồng");
    deepEqual(campaignUpdates[0], { criteria: { category: "Y tế" }, partial: { category: "Y tế cộng đồng" } });
    equal(audit.entries[0].newValues?.movedCampaigns, 4);
  });

  it("should keep at least one active category", async () => {
    categories[0].isActive = false;
    await expectStatus(service.update("c2", { isActive: false }, ADMIN), 409);
  });

  it("should reject inactive or unknown categories for new campaigns", async () => {
    categories[1].isActive = false;
    await expectStatus(service.assertUsable("Y tế"), 400);
    await expectStatus(service.assertUsable("Không tồn tại"), 400);
    await service.assertUsable("Giáo dục");
  });
});
