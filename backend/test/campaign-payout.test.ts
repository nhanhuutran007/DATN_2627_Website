import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { CampaignPayoutService } from "../src/modules/campaigns/campaign-payout.service";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const OWNER = { id: "owner-1", role: UserRole.USER } as any;
const STRANGER = { id: "user-2", role: UserRole.USER } as any;
const ADMIN = { id: "admin-1", role: UserRole.ADMIN } as any;
const INPUT = { bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" };

function setup() {
  const rows = new Map<string, any>();
  const payoutRepo: any = {
    create: (dto: any) => dto,
    findOne: async ({ where }: any) => rows.get(where.campaignId) ?? null,
    findOneOrFail: async ({ where }: any) => rows.get(where.campaignId),
    save: async (row: any) => {
      rows.set(row.campaignId, { ...row, updatedAt: new Date() });
      return row;
    },
  };
  const campaignRepo: any = {
    findOne: async ({ where }: any) => (where.id === CAMPAIGN_ID ? { id: CAMPAIGN_ID, ownerId: OWNER.id, title: "Giếng nước" } : null),
  };
  const audit = makeAuditRecorder();
  const notified: any[] = [];
  const notifications: any = { notify: async (input: any) => notified.push(input) };
  const service = new CampaignPayoutService(payoutRepo, campaignRepo, audit.service, notifications);
  return { service, audit, notified };
}

describe("CampaignPayoutService", () => {
  it("chủ dự án lưu được, admin xem đầy đủ số tài khoản", async () => {
    const { service, audit, notified } = setup();
    equal(await service.get(CAMPAIGN_ID, OWNER), null);
    await service.set(CAMPAIGN_ID, INPUT, OWNER);
    const seen = await service.get(CAMPAIGN_ID, ADMIN);
    equal(seen?.bankAccountNumber, "0123456789");
    equal(audit.entries[0].action, "campaign.payout.create");
    // Nhật ký chỉ lưu 4 số cuối.
    ok(!JSON.stringify(audit.entries[0].newValues).includes("0123456789"));
    equal(notified[0].email, true);
  });

  it("đổi tài khoản ghi nhật ký cập nhật kèm giá trị cũ", async () => {
    const { service, audit } = setup();
    await service.set(CAMPAIGN_ID, INPUT, OWNER);
    await service.set(CAMPAIGN_ID, { ...INPUT, bankAccountNumber: "9999888877" }, OWNER);
    equal(audit.entries[1].action, "campaign.payout.update");
    deepEqual(audit.entries[1].oldValues, { account: "Vietcombank •••• 6789 (NGUYEN VAN A)" });
  });

  it("người khác không xem/sửa được; admin không tự đổi tài khoản", async () => {
    const { service } = setup();
    await rejects(service.get(CAMPAIGN_ID, STRANGER), NotFoundException);
    await rejects(service.set(CAMPAIGN_ID, INPUT, STRANGER), ForbiddenException);
    await rejects(service.set(CAMPAIGN_ID, INPUT, ADMIN), ForbiddenException);
  });
});
