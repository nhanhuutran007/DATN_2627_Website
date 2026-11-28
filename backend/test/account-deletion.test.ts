import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { hashIdentity, normalizeIdentity } from "../src/common/identity-hash";
import { RiskAlertLevel, RiskEntityType } from "../src/modules/admin/entities/risk-alert.entity";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { computePledgeStanding } from "../src/modules/donations/pledge-policy";
import { AccountDeletionService, DELETED_USER_NAME } from "../src/modules/users/account-deletion.service";
import { AccountTombstone } from "../src/modules/users/entities/account-tombstone.entity";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function makeUser(extra: Partial<User> = {}): User {
  return {
    id: USER_ID,
    name: "Nguyễn An",
    email: "An@Example.com",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    googleId: "google-123",
    phone: "0901 234 567",
    contactPhone: "+84 901234567",
    createdAt: new Date("2025-01-01"),
    ...extra,
  } as User;
}

type Counts = Partial<Record<"campaigns" | "donations" | "refund_requests" | "organizations", number>>;

/** DataSource/EntityManager giả: trả số đếm cấu hình sẵn, ghi lại câu lệnh và bản ghi lưu. */
function makeDeps(opts: { counts?: Counts; banks?: string[]; payouts?: string[]; tombstones?: Partial<AccountTombstone>[] } = {}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const saved: any[] = [];
  const updates: Array<{ entity: unknown; where: any; patch: any }> = [];
  const manager: any = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      const table = /FROM (\w+)/.exec(sql)?.[1] as keyof Counts | undefined;
      if (sql.includes("campaign_payout_accounts")) return (opts.payouts ?? []).map((n) => ({ n }));
      if (sql.startsWith("SELECT COUNT(*)") && table) return [{ n: opts.counts?.[table] ?? 0 }];
      return [];
    },
    find: async () => (opts.banks ?? []).map((bankAccountNumber) => ({ bankAccountNumber })),
    create: (_entity: unknown, value: any) => value,
    save: async (value: any) => (saved.push(value), value),
    update: async (entity: unknown, where: any, patch: any) => (updates.push({ entity, where, patch }), { affected: 1 }),
    getRepository: () => ({
      count: async ({ where }: any) => (where.status === DonationStatus.EXPIRED ? 2 : 0),
      find: async () => [],
    }),
  };
  const dataSource: any = {
    manager,
    transaction: async (fn: (m: any) => Promise<unknown>) => fn(manager),
    getRepository: () => ({ update: async (where: any, patch: any) => (updates.push({ entity: User, where, patch }), { affected: 1 }) }),
    query: async () => [],
  };
  const tombstones = [...(opts.tombstones ?? [])];
  const tombstoneRepo: any = {
    findOne: async ({ where }: any) => {
      const list = Array.isArray(where) ? where : [where];
      return tombstones.find((t) => list.some((w: any) => Object.entries(w).every(([k, v]) => (t as any)[k] === v))) ?? null;
    },
    update: async (where: any, patch: any) => (updates.push({ entity: AccountTombstone, where, patch }), { affected: 1 }),
    createQueryBuilder: () => {
      let hash = "";
      const qb: any = {
        where: () => qb,
        andWhere: (_sql: string, params: any) => ((hash = params.hash), qb),
        getOne: async () => tombstones.find((t) => t.wasBanned && t.bankHashes?.includes(hash)) ?? null,
      };
      return qb;
    },
  };
  const alerts: any[] = [];
  const riskAlertRepo: any = {
    findOne: async () => null,
    create: (v: any) => v,
    save: async (v: any) => (alerts.push(v), v),
  };
  const audit = makeAuditRecorder();
  const service = new AccountDeletionService(dataSource, tombstoneRepo, audit.service, riskAlertRepo);
  return { service, queries, saved, updates, audit, alerts, dataSource };
}

describe("identity hash", () => {
  it("chuẩn hóa: email chữ thường, SĐT bỏ 0/84 và ký tự thừa, số tài khoản chỉ giữ chữ số", () => {
    equal(normalizeIdentity("email", "  An@Example.COM "), "an@example.com");
    equal(normalizeIdentity("phone", "0901 234 567"), normalizeIdentity("phone", "+84 901234567"));
    equal(normalizeIdentity("bank", "0071-000 123"), "0071000123");
  });

  it("cùng giá trị → cùng mã; không lưu giá trị gốc; rỗng → null", () => {
    equal(hashIdentity("email", "a@b.com"), hashIdentity("email", "A@B.com"));
    ok(!hashIdentity("email", "a@b.com")!.includes("a@b.com"));
    equal(hashIdentity("phone", ""), null);
    equal(hashIdentity("google", null), null);
    ok(hashIdentity("email", "x") !== hashIdentity("google", "x"));
  });
});

describe("AccountDeletionService.check", () => {
  it("không vướng gì → xóa được", async () => {
    const { service } = makeDeps();
    deepEqual(await service.check(makeUser()), { canDelete: true, blockers: [] });
  });

  it("liệt kê việc còn dang dở: chiến dịch mở, cam kết chưa tất toán, yêu cầu hoàn, tổ chức; admin không tự xóa", async () => {
    const { service } = makeDeps({ counts: { campaigns: 1, donations: 2, refund_requests: 1, organizations: 1 } });
    const result = await service.check(makeUser({ role: UserRole.ADMIN }));
    equal(result.canDelete, false);
    equal(result.blockers.length, 5);
  });
});

describe("AccountDeletionService.deleteSelf", () => {
  it("ẩn danh hóa tại chỗ, giải phóng email, xóa dữ liệu cá nhân phụ, thu hồi phiên; để lại tombstone chỉ gồm mã băm", async () => {
    const { service, saved, updates, queries, audit } = makeDeps({ banks: ["0071 000 123"], payouts: ["999888777"] });
    const user = makeUser();
    await service.deleteSelf(user, "Không dùng nữa");

    const tomb = saved[0];
    equal(tomb.userId, USER_ID);
    equal(tomb.emailHash, hashIdentity("email", "an@example.com"));
    equal(tomb.googleHash, hashIdentity("google", "google-123"));
    equal(tomb.phoneHashes.length, 1, "hai số điện thoại giống nhau sau chuẩn hóa → 1 mã");
    deepEqual(tomb.bankHashes.sort(), [hashIdentity("bank", "0071000123"), hashIdentity("bank", "999888777")].sort());
    equal(tomb.wasBanned, false);
    equal(tomb.deletedBy, "self");
    equal(tomb.abandonedPledges, 2);
    ok(!JSON.stringify(tomb).includes("example.com"), "tombstone không chứa email gốc");

    const patch = updates.find((u) => u.entity === User)!.patch;
    equal(patch.name, DELETED_USER_NAME);
    equal(patch.email, `deleted-${USER_ID}@deleted.gopmam.invalid`);
    equal(patch.googleId, null);
    equal(patch.phone, null);
    equal(patch.status, UserStatus.INACTIVE);
    ok(patch.deletedAt instanceof Date);
    ok(patch.sessionsRevokedAt instanceof Date);

    for (const table of ["notifications", "user_bank_accounts", "campaign_follows", "behavior_events"]) {
      ok(queries.some((q) => q.sql.startsWith(`DELETE FROM \`${table}\``)), `xóa ${table}`);
    }
    // Lịch sử giao dịch/bình luận giữ nguyên.
    ok(!queries.some((q) => /DELETE FROM `(donations|campaign_comments|campaigns)`/.test(q.sql)));
    equal(audit.entries.at(-1)?.action, "user.self_delete");
  });

  it("còn việc dang dở thì từ chối (409) và không đụng dữ liệu", async () => {
    const { service, saved, updates } = makeDeps({ counts: { donations: 1 } });
    await rejects(service.deleteSelf(makeUser()), (e: any) => e.status === 409 && /cam kết/.test(e.message));
    equal(saved.length, 0);
    equal(updates.length, 0);
  });

  it("tài khoản đã xóa thì không xóa lần nữa", async () => {
    const { service } = makeDeps();
    await rejects(service.deleteSelf(makeUser({ deletedAt: new Date() })), (e: any) => e.status === 409);
  });
});

describe("AccountDeletionService.deleteBanned (admin xóa tài khoản vi phạm)", () => {
  it("đánh dấu tombstone là vi phạm, giữ trạng thái BANNED", async () => {
    const { service, saved, updates, audit } = makeDeps();
    await service.deleteBanned(makeUser({ status: UserStatus.BANNED }), makeUser({ id: "admin" }), "Lừa đảo");
    equal(saved[0].wasBanned, true);
    equal(saved[0].deletedBy, "admin");
    equal(updates.find((u) => u.entity === User)!.patch.status, UserStatus.BANNED);
    equal(audit.entries.at(-1)?.action, "user.delete.banned");
  });

  it("chỉ áp dụng cho tài khoản đã khóa", async () => {
    const { service } = makeDeps();
    await rejects(service.deleteBanned(makeUser(), makeUser({ id: "admin" }), "x"), (e: any) => e.status === 409);
  });
});

describe("Chống lách lệnh cấm khi đăng ký lại", () => {
  const bannedEmail = { emailHash: hashIdentity("email", "an@example.com")!, wasBanned: true, userId: "old" };

  it("email (hoặc Google ID) của tài khoản vi phạm đã xóa → không đăng ký lại được (403)", async () => {
    const { service, audit } = makeDeps({ tombstones: [bannedEmail] });
    await rejects(service.assertCanRegister({ email: "AN@example.com" }), (e: any) => e.status === 403);
    equal(audit.entries.at(-1)?.action, "auth.register.blocked_banned");

    const byGoogle = makeDeps({ tombstones: [{ emailHash: "x", googleHash: hashIdentity("google", "g-1")!, wasBanned: true, userId: "old" }] });
    await rejects(byGoogle.service.assertCanRegister({ email: "new@example.com", googleId: "g-1" }), (e: any) => e.status === 403);
  });

  it("tài khoản thường đã tự xóa → đăng ký lại được bằng cùng email", async () => {
    const { service } = makeDeps({ tombstones: [{ ...bannedEmail, wasBanned: false }] });
    await service.assertCanRegister({ email: "an@example.com" });
  });

  it("đăng ký lại: mang số lần bỏ cam kết sang tài khoản mới, ghi liên kết tài khoản cũ", async () => {
    const tomb = { id: "t1", emailHash: hashIdentity("email", "an@example.com")!, wasBanned: false, userId: "old", abandonedPledges: 2 };
    const { service, updates, audit } = makeDeps({ tombstones: [tomb] });
    const fresh = makeUser({ id: "new" });
    await service.inheritFromDeleted(fresh);
    equal(fresh.inheritedAbandonedPledges, 2);
    ok(updates.some((u) => u.entity === User && u.patch.inheritedAbandonedPledges === 2));
    ok(updates.some((u) => u.entity === AccountTombstone && u.patch.reusedBy === "new"));
    equal(audit.entries.at(-1)?.newValues?.previousUserId, "old");
  });

  it("số lần bỏ mang sang được tính vào giới hạn cam kết (admin mở lại thì bỏ qua)", async () => {
    const repo: any = { count: async () => 0, find: async () => [] };
    const base = { id: "new", createdAt: new Date("2025-01-01") };
    equal((await computePledgeStanding(repo, { ...base, inheritedAbandonedPledges: 3 })).tier, "blocked");
    equal((await computePledgeStanding(repo, { ...base, inheritedAbandonedPledges: 3, pledgeResetAt: new Date() })).tier, "good");
  });

  it("số tài khoản ngân hàng của tài khoản vi phạm xuất hiện lại → cảnh báo rủi ro HIGH cho admin", async () => {
    const tomb = { emailHash: "x", wasBanned: true, userId: "old", bankHashes: [hashIdentity("bank", "0071000123")!] };
    const { service, alerts } = makeDeps({ tombstones: [tomb] });
    equal(await service.flagBannedBankReuse({ id: "new", name: "Bình", email: "b@x.com" }, "0071-000-123"), true);
    equal(alerts[0].entityType, RiskEntityType.USER);
    equal(alerts[0].entityId, "new");
    equal(alerts[0].level, RiskAlertLevel.HIGH);

    const clean = makeDeps();
    equal(await clean.service.flagBannedBankReuse({ id: "new", name: "Bình", email: "b@x.com" }, "123456789"), false);
    equal(clean.alerts.length, 0);
  });
});
