import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";

import type { AuditService } from "../src/common/audit/audit.service";
import type { PaymentGateway } from "../src/integrations/payment/payment.gateway";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationsService } from "../src/modules/donations/donations.service";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { makeNotifierRecorder } from "./helpers/notifications";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174010";

function makeDonation(overrides: Partial<Donation>): Donation {
  return Object.assign(new Donation(), {
    id: "123e4567-e89b-12d3-a456-4266141740aa",
    campaignId: CAMPAIGN_ID,
    amount: "50000.00",
    currency: "VND",
    status: DonationStatus.COMPLETED,
    paymentMethod: "wallet",
    transactionId: "demo_tx_9f8e7d6c5b",
    isAnonymous: false,
    user: { id: "u1", name: "Le Van C", email: "c@example.com" },
    completedAt: new Date("2026-09-25T08:00:00Z"),
    createdAt: new Date("2026-09-25T07:59:00Z"),
    ...overrides,
  });
}

function setup(campaignStatus: CampaignStatus | null, donations: Donation[]) {
  const findCalls: Array<Record<string, unknown>> = [];
  const donationRepo = {
    findAndCount: async (options: Record<string, unknown>) => {
      findCalls.push(options);
      return [donations, donations.length];
    },
  } as unknown as Repository<Donation>;
  const campaignRepo = {
    findOneBy: async () =>
      campaignStatus === null
        ? null
        : Object.assign(new Campaign(), { id: CAMPAIGN_ID, status: campaignStatus }),
  } as unknown as Repository<Campaign>;
  const service = new DonationsService(
    donationRepo,
    campaignRepo,
    {} as DataSource,
    {} as PaymentGateway,
    { record: async () => undefined } as unknown as AuditService,
    makeNotifierRecorder().service,
  );
  return { service, findCalls };
}

describe("DonationsService.listPublicLedger", () => {
  it("should only query completed donations and cap the limit", async () => {
    const { service, findCalls } = setup(CampaignStatus.ACTIVE, []);
    await service.listPublicLedger(CAMPAIGN_ID, 500);
    deepEqual(findCalls[0]?.where, { campaignId: CAMPAIGN_ID, status: DonationStatus.COMPLETED });
    equal(findCalls[0]?.take, 50);
    deepEqual(findCalls[0]?.order, { completedAt: "DESC", createdAt: "DESC" });
  });

  it("should order by amount when sort=top", async () => {
    const { service, findCalls } = setup(CampaignStatus.ACTIVE, []);
    await service.listPublicLedger(CAMPAIGN_ID, 1, "top");
    deepEqual(findCalls[0]?.order, { amount: "DESC", completedAt: "DESC" });
    equal(findCalls[0]?.take, 1);
  });

  it("should hide anonymous donors, emails and full transaction ids", async () => {
    const { service } = setup(CampaignStatus.ACTIVE, [
      makeDonation({}),
      makeDonation({ id: "123e4567-e89b-12d3-a456-4266141740bb", isAnonymous: true }),
    ]);
    const ledger = await service.listPublicLedger(CAMPAIGN_ID);

    equal(ledger.total, 2);
    equal(ledger.items[0]?.donorName, "Le Van C");
    equal(ledger.items[0]?.amount, 50000);
    equal(ledger.items[0]?.reference, "•••7D6C5B");
    equal(ledger.items[1]?.donorName, null);
    const json = JSON.stringify(ledger);
    ok(!json.includes("c@example.com"));
    ok(!json.includes("demo_tx_9f8e7d6c5b"));
  });

  it("should not expose ledgers of campaigns that are not public", async () => {
    const { service } = setup(CampaignStatus.DRAFT, [makeDonation({})]);
    await rejects(service.listPublicLedger(CAMPAIGN_ID), NotFoundException);
    const missing = setup(null, []);
    await rejects(missing.service.listPublicLedger(CAMPAIGN_ID), NotFoundException);
  });
});

describe("DonationsService.listSupportMessages", () => {
  it("should only query completed donations that carry a message, newest first", async () => {
    const { service, findCalls } = setup(CampaignStatus.ACTIVE, []);
    await service.listSupportMessages(CAMPAIGN_ID, 10, 500);
    const where = findCalls[0]?.where as Record<string, unknown>;
    equal(where.campaignId, CAMPAIGN_ID);
    equal(where.status, DonationStatus.COMPLETED);
    ok(where.message, "phải lọc theo lời nhắn khác rỗng");
    deepEqual(findCalls[0]?.order, { completedAt: "DESC", createdAt: "DESC" });
    equal(findCalls[0]?.skip, 10);
    equal(findCalls[0]?.take, 50);
  });

  it("should hide anonymous names and never expose email or transaction id", async () => {
    const { service } = setup(CampaignStatus.SUCCESS, [
      makeDonation({ message: "  Chúc dự án thành công!  " }),
      makeDonation({ id: "123e4567-e89b-12d3-a456-4266141740bb", isAnonymous: true, message: "Cố lên" }),
    ]);
    const page = await service.listSupportMessages(CAMPAIGN_ID);

    equal(page.total, 2);
    equal(page.items[0]?.donorName, "Le Van C");
    equal(page.items[0]?.message, "Chúc dự án thành công!");
    equal(page.items[0]?.amount, 50000);
    equal(page.items[1]?.donorName, null);
    const json = JSON.stringify(page);
    ok(!json.includes("c@example.com"));
    ok(!json.includes("demo_tx_9f8e7d6c5b"));
  });

  it("should not expose messages of campaigns that are not public", async () => {
    const { service } = setup(CampaignStatus.PENDING, [makeDonation({ message: "Hi" })]);
    await rejects(service.listSupportMessages(CAMPAIGN_ID), NotFoundException);
  });
});
