import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignExpiryService } from "../src/modules/campaigns/campaign-expiry.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test campaign",
    ownerId: "user-owner-123",
    status: CampaignStatus.ACTIVE,
    goalAmount: 10_000_000,
    currentAmount: 0,
    endDate: new Date(Date.now() - 86_400_000),
    ...overrides,
  };
}

describe("CampaignExpiryService (TC_CAMP_017 & TC_CAMP_018)", () => {
  let repo: any;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: CampaignExpiryService;
  let updateCalls: Array<{ criteria: any; partial: any }>;

  beforeEach(() => {
    updateCalls = [];
    repo = {
      find: async () => [],
      update: async (criteria: any, partial: any) => {
        updateCalls.push({ criteria, partial });
        return { affected: 1 };
      },
    };
    audit = makeAuditRecorder();
    notifier = makeNotifierRecorder();
    service = new CampaignExpiryService(repo, audit.service, notifier.service);
  });

  it("TC_CAMP_017: should mark an expired campaign that reached its goal as success and notify owner and backers", async () => {
    const campaign = makeCampaign({ currentAmount: 12_000_000, goalAmount: 10_000_000 });
    repo.find = async () => [campaign];

    const result = await service.expireCampaigns();

    equal(result.succeeded, 1);
    equal(result.failed, 0);
    equal(updateCalls.length, 1);
    equal(updateCalls[0].criteria.status, CampaignStatus.ACTIVE);
    equal(updateCalls[0].partial.status, CampaignStatus.SUCCESS);

    // Audit log check
    equal(audit.entries.length, 1);
    equal(audit.entries[0].action, "campaign.expire");
    equal(audit.entries[0].newValues?.status, CampaignStatus.SUCCESS);
    equal(audit.entries[0].userId, undefined);

    // Notification check: owner notification
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, campaign.ownerId);
    equal(notifier.notified[0].type, NotificationType.CAMPAIGN_ENDED);
    equal(notifier.notified[0].title, "Chiến dịch đạt mục tiêu");
    ok(notifier.notified[0].message.includes("đạt mục tiêu gây quỹ"));

    // Notification check: backers notification
    equal(notifier.backerNotices.length, 1);
    equal(notifier.backerNotices[0].campaignId, campaign.id);
    equal(notifier.backerNotices[0].base.type, NotificationType.CAMPAIGN_ENDED);
    equal(notifier.backerNotices[0].base.title, "Chiến dịch bạn ủng hộ đã đạt mục tiêu");
    ok(notifier.backerNotices[0].base.message.includes("đã kết thúc và đạt mục tiêu"));
  });

  it("TC_CAMP_018: should mark an expired campaign that missed its goal as failed and notify backers of refund rights", async () => {
    const campaign = makeCampaign({ currentAmount: 1_000_000, goalAmount: 10_000_000 });
    repo.find = async () => [campaign];

    const result = await service.expireCampaigns();

    equal(result.succeeded, 0);
    equal(result.failed, 1);
    equal(updateCalls.length, 1);
    equal(updateCalls[0].criteria.status, CampaignStatus.ACTIVE);
    equal(updateCalls[0].partial.status, CampaignStatus.FAILED);

    // Audit log check
    equal(audit.entries.length, 1);
    equal(audit.entries[0].action, "campaign.expire");
    equal(audit.entries[0].newValues?.status, CampaignStatus.FAILED);

    // Notification check: owner notification
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, campaign.ownerId);
    equal(notifier.notified[0].type, NotificationType.CAMPAIGN_ENDED);
    equal(notifier.notified[0].title, "Chiến dịch kết thúc chưa đạt mục tiêu");
    ok(notifier.notified[0].message.includes("không bị trừ tiền"));

    // Notification check: backers notification with refund information
    equal(notifier.backerNotices.length, 1);
    equal(notifier.backerNotices[0].campaignId, campaign.id);
    equal(notifier.backerNotices[0].base.type, NotificationType.CAMPAIGN_ENDED);
    equal(notifier.backerNotices[0].base.title, "Chiến dịch bạn ủng hộ đã kết thúc");
    ok(notifier.backerNotices[0].base.message.includes("không bị trừ tiền"));
  });

  it("should be idempotent: subsequent run when no active expired campaigns exist does nothing", async () => {
    repo.find = async () => [];
    const result = await service.expireCampaigns();
    equal(result.succeeded, 0);
    equal(result.failed, 0);
    equal(updateCalls.length, 0);
    equal(audit.entries.length, 0);
    equal(notifier.notified.length, 0);
    equal(notifier.backerNotices.length, 0);
  });

  it("should not touch campaigns that are not yet past their deadline", async () => {
    repo.find = async () => [];
    const result = await service.expireCampaigns();
    equal(result.succeeded, 0);
    equal(result.failed, 0);
    equal(updateCalls.length, 0);
    equal(audit.entries.length, 0);
  });

  it("should skip and not double-audit when the conditional update affects no row (race)", async () => {
    const campaign = makeCampaign({ currentAmount: 12_000_000 });
    repo.find = async () => [campaign];
    repo.update = async () => ({ affected: 0 });

    const result = await service.expireCampaigns();

    equal(result.succeeded, 0);
    equal(result.failed, 0);
    equal(audit.entries.length, 0);
  });
});
