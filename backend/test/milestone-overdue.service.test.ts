import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { MilestoneOverdueService } from "../src/modules/progress/milestone-overdue.service";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const NOW = new Date("2026-10-07T00:00:00.000Z");
const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";

function makeMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174002",
    campaignId: CAMPAIGN_ID,
    title: "Khảo sát",
    isCompleted: false,
    targetDate: new Date("2026-10-01T00:00:00.000Z"),
    overdueNotifiedAt: null,
    ...overrides,
  };
}

describe("MilestoneOverdueService", () => {
  let milestones: any[];
  let campaignStatus: CampaignStatus;
  let updateAffected: number;
  let updateCalls: Array<{ criteria: any; partial: any }>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: MilestoneOverdueService;

  beforeEach(() => {
    milestones = [makeMilestone()];
    campaignStatus = CampaignStatus.ACTIVE;
    updateAffected = 1;
    updateCalls = [];
    audit = makeAuditRecorder();
    notifier = makeNotifierRecorder();
    const milestoneRepo: any = {
      find: async () => milestones,
      update: async (criteria: any, partial: any) => {
        updateCalls.push({ criteria, partial });
        return { affected: updateAffected };
      },
    };
    const campaignRepo: any = {
      // Repository thật lọc theo status IN (...); mock trả rỗng khi trạng thái không được theo dõi
      find: async () =>
        [CampaignStatus.DRAFT, CampaignStatus.FAILED, CampaignStatus.CANCELLED].includes(campaignStatus)
          ? []
          : [{ id: CAMPAIGN_ID, ownerId: OWNER_ID, title: "Thư viện xanh", status: campaignStatus }],
    };
    service = new MilestoneOverdueService(milestoneRepo, campaignRepo, audit.service, notifier.service);
  });

  it("should remind the owner once and stamp the milestone", async () => {
    const result = await service.remindOverdueMilestones(NOW);
    equal(result.reminded, 1);
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, OWNER_ID);
    equal(notifier.notified[0].type, "milestone_overdue");
    ok(notifier.notified[0].message.includes("quá hạn 6 ngày"));
    equal(updateCalls[0].partial.overdueNotifiedAt, NOW);
    equal(audit.entries[0].action, "milestone.overdue_reminder");
  });

  it("should skip when another run already claimed the milestone", async () => {
    updateAffected = 0;
    const result = await service.remindOverdueMilestones(NOW);
    equal(result.reminded, 0);
    equal(notifier.notified.length, 0);
    equal(audit.entries.length, 0);
  });

  it("should not remind for campaigns that failed or were cancelled", async () => {
    campaignStatus = CampaignStatus.FAILED;
    const result = await service.remindOverdueMilestones(NOW);
    equal(result.reminded, 0);
    equal(updateCalls.length, 0);
  });

  it("should keep reminding campaigns that already succeeded", async () => {
    campaignStatus = CampaignStatus.SUCCESS;
    const result = await service.remindOverdueMilestones(NOW);
    equal(result.reminded, 1);
  });

  it("should do nothing when no milestone is overdue", async () => {
    milestones = [];
    const result = await service.remindOverdueMilestones(NOW);
    equal(result.reminded, 0);
    equal(notifier.notified.length, 0);
  });
});
