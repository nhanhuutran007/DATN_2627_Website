import { equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import { CampaignPayoutService } from "../src/modules/campaigns/campaign-payout.service";
import { UserBankAccountService } from "../src/modules/users/user-bank-account.service";
import { makeAuditRecorder } from "./helpers/audit";

const USER = { id: "user-1" } as any;
const INPUT = { bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" };

function makeRepo() {
  const rows = new Map<string, any>();
  const repo: any = {
    rows,
    create: (dto: any) => dto,
    findOne: async ({ where }: any) => rows.get(where.userId) ?? null,
    findOneOrFail: async ({ where }: any) => rows.get(where.userId),
    save: async (row: any) => {
      rows.set(row.userId, { ...row, updatedAt: new Date() });
      return row;
    },
    delete: async ({ userId }: any) => rows.delete(userId),
  };
  return repo;
}

function setup() {
  const repo = makeRepo();
  const audit = makeAuditRecorder();
  const notified: any[] = [];
  const service = new UserBankAccountService(repo, audit.service, { notify: async (n: any) => notified.push(n) } as any);
  return { service, repo, audit, notified };
}

describe("UserBankAccountService", () => {
  it("lưu, đổi và xóa tài khoản ngân hàng của chính mình, có nhật ký và email", async () => {
    const { service, audit, notified } = setup();
    equal(await service.get(USER), null);
    await service.set(USER, INPUT);
    equal((await service.get(USER))?.bankAccountNumber, "0123456789");
    await service.set(USER, { ...INPUT, bankAccountNumber: "9999888877" });
    await service.remove(USER);
    equal(await service.get(USER), null);
    equal(audit.entries.map((e: any) => e.action).join(","), "user.bank_account.create,user.bank_account.update,user.bank_account.delete");
    // Nhật ký chỉ lưu 4 số cuối.
    ok(!JSON.stringify(audit.entries).includes("0123456789"));
    ok(notified.every((n) => n.email === true));
  });

  it("xóa khi chưa lưu báo lỗi", async () => {
    await rejects(setup().service.remove(USER), NotFoundException);
  });

  it("gợi ý tài khoản nhận tiền khi tạo chiến dịch đặt tài khoản hồ sơ lên đầu", async () => {
    const bankRepo = makeRepo();
    bankRepo.rows.set(USER.id, { userId: USER.id, ...INPUT });
    const old = { bankName: "ACB", bankAccountNumber: "111222333", bankAccountName: "NGUYEN VAN A" };
    const qb: any = { innerJoin: () => qb, where: () => qb, orderBy: () => qb, take: () => qb, getMany: async () => [old, { ...INPUT }] };
    const payoutRepo: any = { createQueryBuilder: () => qb };
    const payout = new CampaignPayoutService(payoutRepo, {} as any, {} as any, {} as any, null, bankRepo);
    const list = await payout.listMine(USER);
    equal(list.length, 2);
    equal(list[0].bankName, "Vietcombank");
    equal(list[1].bankName, "ACB");
  });
});
