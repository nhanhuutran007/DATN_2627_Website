import { equal } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { CampaignExpiryService } from "../src/modules/campaigns/campaign-expiry.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { makeAuditRecorder } from "./helpers/audit";

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test campaign",
    status: CampaignStatus.ACTIVE,
    goalAmount: 10_000_000,
    currentAmount: 0,
    endDate: new Date(Date.now() - 86_400_000),
    ...overrides,
  };
}

describe("CampaignExpiryService", () => {
  let repo: any;
  let audit: ReturnType<typeof makeAuditRecorder>;
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
    service = new CampaignExpiryService(repo, audit.service);
  });

  it("should mark an expired campaign that reached its goal as success", async () => {
    const campaign = makeCampaign({ currentAmount: 12_000_000 });
    repo.find = async () => [campaign];

    const result = await service.expireCampaigns();

    equal(result.succeeded, 1);
    equal(result.failed, 0);
    equal(updateCalls.length, 1);
    equal(updateCalls[0].criteria.status, CampaignStatus.ACTIVE);
    equal(updateCalls[0].partial.status, CampaignStatus.SUCCESS);
    equal(audit.entries.length, 1);
    equal(audit.entries[0].action, "campaign.expire");
    equal(audit.entries[0].newValues?.status, CampaignStatus.SUCCESS);
    equal(audit.entries[0].userId, undefined);
  });

  it("should mark an expired campaign that missed its goal as failed", async () => {
    const campaign = makeCampaign({ currentAmount: 1_000_000 });
    repo.find = async () => [campaign];

    const result = await service.expireCampaigns();

    equal(result.succeeded, 0);
    equal(result.failed, 1);
    equal(updateCalls[0].partial.status, CampaignStatus.FAILED);
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
