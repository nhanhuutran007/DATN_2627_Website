import { equal, match, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { ConflictException, ForbiddenException } from "@nestjs/common";

import { DonationsService } from "../src/modules/donations/donations.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { computePledgeStanding, standingNotice, tierFor } from "../src/modules/donations/pledge-policy";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { makeAuditRecorder } from "./helpers/audit";

const OLD = new Date(Date.now() - 400 * 86_400_000);
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";

type Data = { expired?: number; paid?: number; sameCampaign?: number; openCampaigns?: string[] };

function makeRepo(data: Data) {
  const saved: any[] = [];
  const repo: any = {
    saved,
    count: async ({ where }: any) => {
      if (where.status === DonationStatus.EXPIRED) return data.expired ?? 0;
      if (where.status === DonationStatus.COMPLETED) return data.paid ?? 0;
      if (where.campaignId) return data.sameCampaign ?? 0;
      return 0;
    },
    find: async () => (data.openCampaigns ?? []).map((campaignId) => ({ campaignId })),
    findOne: async () => null,
    create: (dto: any) => dto,
    save: async (row: any) => {
      saved.push(row);
      return { id: "new", ...row };
    },
  };
  return repo;
}

const user = (extra: Record<string, unknown> = {}) =>
  ({ id: "u1", emailVerified: true, createdAt: OLD, pledgeResetAt: null, ...extra }) as any;

describe("pledge policy", () => {
  it("bậc xử lý theo số lần bỏ: 0 tốt, 1 nhắc, 2 giới hạn, 3 chặn", () => {
    equal(tierFor(0), "good");
    equal(tierFor(1), "warned");
    equal(tierFor(2), "limited");
    equal(tierFor(3), "blocked");
  });

  it("mỗi cam kết đã trả trừ bớt một lần bỏ", async () => {
    const standing = await computePledgeStanding(makeRepo({ expired: 3, paid: 2 }), user());
    equal(standing.abandoned, 1);
    equal(standing.tier, "warned");
    equal(standing.maxOpenCampaigns, 5);
  });

  it("giới hạn 5 dự án; tài khoản mới 2; bị giới hạn 1; bị chặn 0", async () => {
    equal((await computePledgeStanding(makeRepo({}), user())).maxOpenCampaigns, 5);
    equal((await computePledgeStanding(makeRepo({}), user({ createdAt: new Date() }))).maxOpenCampaigns, 2);
    equal((await computePledgeStanding(makeRepo({ expired: 2 }), user())).maxOpenCampaigns, 1);
    const blocked = await computePledgeStanding(makeRepo({ expired: 3 }), user());
    equal(blocked.maxOpenCampaigns, 0);
    equal(blocked.canPledge, false);
  });

  it("đếm dự án khác nhau, không đếm số khoản", async () => {
    const standing = await computePledgeStanding(makeRepo({ openCampaigns: ["a", "a", "b"] }), user());
    equal(standing.openCampaigns, 2);
    ok(standing.canPledge);
  });

  it("email hủy cam kết nói rõ hậu quả", () => {
    match(standingNotice({ abandoned: 3, tier: "blocked" }), /tài khoản đã bị khóa/);
    match(standingNotice({ abandoned: 2, tier: "limited" }), /1 cam kết/);
    equal(standingNotice({ abandoned: 0, tier: "good" }), "");
  });
});

describe("DonationsService.create áp dụng chính sách cam kết", () => {
  function setup(data: Data) {
    const repo = makeRepo(data);
    const campaign = { id: CAMPAIGN_ID, status: CampaignStatus.ACTIVE, endDate: new Date(Date.now() + 86_400_000) };
    const campaignRepo: any = { findOne: async () => campaign };
    const service = new DonationsService(
      repo,
      campaignRepo,
      { transaction: async () => ({ applied: false, donation: { status: DonationStatus.PLEDGED } }) } as any,
      {} as any,
      makeAuditRecorder().service,
      { notify: async () => undefined } as any,
    );
    return { service, repo };
  }
  const dto = (extra: Record<string, unknown> = {}) =>
    ({ campaignId: CAMPAIGN_ID, amount: 100_000, idempotencyKey: `k-${Math.random()}`, ...extra }) as any;

  it("chưa xác minh email thì không được cam kết", async () => {
    await rejects(setup({}).service.create(dto(), user({ emailVerified: false })), ForbiddenException);
  });

  it("mỗi dự án chỉ 1 cam kết chưa trả", async () => {
    await rejects(setup({ sameCampaign: 1 }).service.create(dto(), user()), ConflictException);
  });

  it("đủ 5 dự án đang cam kết thì từ chối", async () => {
    await rejects(setup({ openCampaigns: ["a", "b", "c", "d", "e"] }).service.create(dto(), user()), ConflictException);
  });

  it("đã tới ngưỡng khóa thì không cam kết được", async () => {
    await rejects(setup({ expired: 3 }).service.create(dto(), user()), ForbiddenException);
  });
});

describe("DonationsService.expireUnpaid khóa tài khoản khi bỏ tới lần thứ 3", () => {
  function setup(expired: number, status = "active") {
    const repo = makeRepo({ expired });
    const open = [
      { id: "p1", userId: "u1", campaignId: "c1", amount: 100_000, status: DonationStatus.PLEDGED },
      { id: "p2", userId: "u1", campaignId: "c2", amount: 50_000, status: DonationStatus.AWAITING_PAYMENT },
    ];
    repo.find = async () => open;
    const transitions: string[] = [];
    const userUpdates: any[] = [];
    const qb: any = { update: () => qb, set: () => qb, where: () => qb, andWhere: () => qb, setParameter: () => qb, execute: async () => ({}) };
    const manager: any = {
      update: async (_e: any, where: any, patch: any) => {
        transitions.push(`${where.id}:${patch.status}`);
        return { affected: 1 };
      },
      createQueryBuilder: () => qb,
    };
    const owner = { id: "u1", role: "user", status, emailVerified: true, createdAt: OLD };
    const dataSource: any = {
      transaction: async (fn: any) => fn(manager),
      getRepository: () => ({
        findOne: async () => owner,
        update: async (_where: any, patch: any) => {
          userUpdates.push(patch);
          return { affected: 1 };
        },
      }),
    };
    const audit = makeAuditRecorder();
    const notified: any[] = [];
    const service = new DonationsService(repo, {} as any, dataSource, {} as any, audit.service, { notify: async (n: any) => notified.push(n) } as any);
    const donation = { id: "d1", userId: "u1", campaignId: "c0", amount: 200_000, status: DonationStatus.AWAITING_PAYMENT } as any;
    return { service, donation, transitions, userUpdates, audit, notified };
  }

  it("lần bỏ thứ 3: báo email, khóa tài khoản, hủy mọi cam kết còn mở", async () => {
    const { service, donation, transitions, userUpdates, audit, notified } = setup(3);
    ok(await service.expireUnpaid(donation, "Giếng nước"));
    match(notified[0].message, /tài khoản đã bị khóa/);
    equal(userUpdates[0].status, "banned");
    ok(transitions.includes("p1:cancelled"));
    ok(transitions.includes("p2:cancelled"));
    ok(audit.entries.some((e: any) => e.action === "user.pledge.banned"));
  });

  it("lần bỏ thứ 2: chỉ giới hạn, không khóa", async () => {
    const { service, donation, userUpdates, notified } = setup(2);
    await service.expireUnpaid(donation, "Giếng nước");
    match(notified[0].message, /1 cam kết/);
    equal(userUpdates.length, 0);
  });
});
