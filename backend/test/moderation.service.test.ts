import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Repository } from "typeorm";

import type { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import type { ModerateCampaignDto } from "../src/modules/campaigns/dto/campaign.dto";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import {
  Report,
  ReportReason,
  ReportStatus,
} from "../src/modules/moderation/entities/report.entity";
import { ModerationService } from "../src/modules/moderation/moderation.service";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174010";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174002";
const REPORTER_ID = "123e4567-e89b-12d3-a456-426614174003";
const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174001";
const REPORT_ID = "123e4567-e89b-12d3-a456-426614174099";

function makeUser(id: string, role: UserRole): User {
  return Object.assign(new User(), {
    id,
    name: role,
    email: `${role}@example.com`,
    role,
    status: UserStatus.ACTIVE,
  });
}

const reporter = makeUser(REPORTER_ID, UserRole.USER);
const owner = makeUser(OWNER_ID, UserRole.CAMPAIGN_OWNER);
const admin = makeUser(ADMIN_ID, UserRole.ADMIN);

function makeCampaign(status = CampaignStatus.ACTIVE): Campaign {
  return Object.assign(new Campaign(), {
    id: CAMPAIGN_ID,
    title: "Thư viện vùng cao",
    ownerId: OWNER_ID,
    status,
  });
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return Object.assign(new Report(), {
    id: REPORT_ID,
    reporterId: REPORTER_ID,
    campaignId: CAMPAIGN_ID,
    reason: ReportReason.FRAUD,
    description: "Hình ảnh lấy từ một chiến dịch khác.",
    status: ReportStatus.PENDING,
    campaignPaused: false,
    ...overrides,
  });
}

type Setup = {
  campaign?: Campaign;
  existingOpenReport?: Report | null;
  report?: Report | null;
  moderateError?: Error;
};

function setup(opts: Setup = {}) {
  const saved: Report[] = [];
  const moderateCalls: Array<{ id: string; dto: ModerateCampaignDto; user: User }> = [];
  const lookups: Array<Record<string, unknown>> = [];

  const reportRepo = {
    create: (data: Partial<Report>) => Object.assign(new Report(), data),
    save: async (report: Report) => {
      const withId = Object.assign(report, { id: report.id ?? REPORT_ID });
      saved.push(withId);
      return withId;
    },
    findOneBy: async (where: Record<string, unknown>) => {
      lookups.push(where);
      if ("id" in where) return opts.report ?? null;
      return opts.existingOpenReport ?? null;
    },
  } as unknown as Repository<Report>;

  const campaignsService = {
    findById: async (id: string) => {
      if (id !== CAMPAIGN_ID) throw new NotFoundException("Campaign not found");
      return opts.campaign ?? makeCampaign();
    },
    moderate: async (id: string, dto: ModerateCampaignDto, user: User) => {
      if (opts.moderateError) throw opts.moderateError;
      moderateCalls.push({ id, dto, user });
      return makeCampaign(dto.status);
    },
  } as unknown as CampaignsService;

  const audit = makeAuditRecorder();
  const service = new ModerationService(reportRepo, campaignsService, audit.service);
  return { service, saved, moderateCalls, lookups, audit };
}

const validReport = {
  campaignId: CAMPAIGN_ID,
  reason: ReportReason.FRAUD,
  description: "Hình ảnh lấy từ một chiến dịch khác.",
};

describe("ModerationService", () => {
  describe("createReport", () => {
    it("should create a pending report and audit it", async () => {
      const { service, saved, audit } = setup();
      const report = await service.createReport(validReport, reporter);

      equal(report.status, ReportStatus.PENDING);
      equal(report.reporterId, REPORTER_ID);
      equal(report.campaignId, CAMPAIGN_ID);
      equal(saved.length, 1);
      equal(audit.entries[0]?.action, "report.create");
      equal(audit.entries[0]?.userId, REPORTER_ID);
    });

    it("should reject reporting your own campaign", async () => {
      const { service, saved } = setup();
      await rejects(service.createReport(validReport, owner), ForbiddenException);
      equal(saved.length, 0);
    });

    it("should hide campaigns that are not public yet", async () => {
      const { service } = setup({ campaign: makeCampaign(CampaignStatus.DRAFT) });
      await rejects(service.createReport(validReport, reporter), NotFoundException);
    });

    it("should reject a duplicate open report from the same user", async () => {
      const { service, saved } = setup({ existingOpenReport: makeReport() });
      await rejects(service.createReport(validReport, reporter), ConflictException);
      equal(saved.length, 0);
    });
  });

  describe("review", () => {
    it("should move a pending report to reviewing without notes", async () => {
      const { service, moderateCalls } = setup({ report: makeReport() });
      const report = await service.review(REPORT_ID, { status: ReportStatus.REVIEWING }, admin);

      equal(report.status, ReportStatus.REVIEWING);
      equal(report.resolvedBy, ADMIN_ID);
      equal(report.resolvedAt, null);
      equal(moderateCalls.length, 0);
    });

    it("should require admin notes to resolve or dismiss", async () => {
      const { service, saved } = setup({ report: makeReport() });
      await rejects(
        service.review(REPORT_ID, { status: ReportStatus.DISMISSED, adminNotes: " ok " }, admin),
        BadRequestException,
      );
      equal(saved.length, 0);
    });

    it("should dismiss with notes and record the decision in audit", async () => {
      const { service, audit } = setup({ report: makeReport() });
      const report = await service.review(
        REPORT_ID,
        { status: ReportStatus.DISMISSED, adminNotes: "Đã đối chiếu, ảnh do chủ dự án tự chụp." },
        admin,
      );

      equal(report.status, ReportStatus.DISMISSED);
      ok(report.resolvedAt instanceof Date);
      const entry = audit.entries.find((e) => e.action === "report.review");
      deepEqual(entry?.oldValues, { status: ReportStatus.PENDING, adminNotes: null });
      equal(entry?.newValues?.status, ReportStatus.DISMISSED);
      equal(entry?.newValues?.campaignPaused, false);
    });

    it("should pause the campaign when resolving with pauseCampaign", async () => {
      const { service, moderateCalls } = setup({ report: makeReport({ status: ReportStatus.REVIEWING }) });
      const report = await service.review(
        REPORT_ID,
        { status: ReportStatus.RESOLVED, adminNotes: "Xác nhận ảnh sao chép", pauseCampaign: true },
        admin,
      );

      equal(report.status, ReportStatus.RESOLVED);
      equal(report.campaignPaused, true);
      equal(moderateCalls.length, 1);
      equal(moderateCalls[0]?.id, CAMPAIGN_ID);
      equal(moderateCalls[0]?.dto.status, CampaignStatus.PAUSED);
      ok(moderateCalls[0]?.dto.reason?.includes("Xác nhận ảnh sao chép"));
      equal(moderateCalls[0]?.user.id, ADMIN_ID);
    });

    it("should not save the report when pausing the campaign fails", async () => {
      const { service, saved } = setup({
        report: makeReport(),
        moderateError: new ConflictException('Cannot move campaign from "ended" to "paused"'),
      });
      await rejects(
        service.review(
          REPORT_ID,
          { status: ReportStatus.RESOLVED, adminNotes: "Xác nhận vi phạm", pauseCampaign: true },
          admin,
        ),
        ConflictException,
      );
      equal(saved.length, 0);
    });

    it("should only allow pauseCampaign when resolving", async () => {
      const { service, moderateCalls } = setup({ report: makeReport() });
      await rejects(
        service.review(
          REPORT_ID,
          { status: ReportStatus.DISMISSED, adminNotes: "Không vi phạm", pauseCampaign: true },
          admin,
        ),
        BadRequestException,
      );
      equal(moderateCalls.length, 0);
    });

    it("should not reopen a concluded report", async () => {
      const { service } = setup({ report: makeReport({ status: ReportStatus.RESOLVED }) });
      await rejects(
        service.review(REPORT_ID, { status: ReportStatus.REVIEWING }, admin),
        ConflictException,
      );
    });

    it("should return 404 for an unknown report", async () => {
      const { service } = setup({ report: null });
      await rejects(
        service.review(REPORT_ID, { status: ReportStatus.REVIEWING }, admin),
        NotFoundException,
      );
    });
  });
});
