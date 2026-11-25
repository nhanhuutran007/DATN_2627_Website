import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import { RiskAlertLevel, RiskAlertStatus } from "../src/modules/admin/entities/risk-alert.entity";
import {
  densestWindow,
  integrityRules,
  isPublicIp,
  PledgeIntegrityService,
} from "../src/modules/admin/pledge-integrity.service";
import { RiskAlertService } from "../src/modules/admin/risk-alert.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { makeAuditRecorder } from "./helpers/audit";

const CAMPAIGN_ID = "44444444-4444-4444-8444-444444444444";
const OWNER = "owner-1";
const DAY = 86_400_000;
const NOW = new Date("2026-11-20T12:00:00Z");

type Backer = { userId: string; createdAt: Date; firstAt: Date; amount?: number; open?: number; expired?: number };

/** DataSource giả: trả kết quả theo câu SQL. */
function fakeDataSource(data: {
  backers: Backer[];
  campaignsOf?: Record<string, number>;
  ips?: Array<{ userId: string; ip: string }>;
  ownerBanks?: string[];
  backerBanks?: Array<{ userId: string; number: string }>;
  unpaid?: { expired: number; paid: number };
}) {
  return {
    query: async (sql: string) => {
      if (sql.includes("SELECT owner_id")) return [{ ownerId: OWNER }];
      if (sql.includes("MIN(COALESCE")) {
        return data.backers.map((b) => ({
          userId: b.userId,
          name: b.userId,
          email: `${b.userId}@x.vn`,
          createdAt: b.createdAt,
          firstAt: b.firstAt,
          amount: b.amount ?? 100_000,
          openPledges: b.open ?? 1,
          expired: b.expired ?? 0,
        }));
      }
      if (sql.includes("COUNT(DISTINCT campaign_id)")) {
        return Object.entries(data.campaignsOf ?? {}).map(([userId, campaigns]) => ({ userId, campaigns }));
      }
      if (sql.includes("FROM audit_logs")) return data.ips ?? [];
      if (sql.includes("WHERE user_id = ?")) return (data.ownerBanks ?? []).map((number) => ({ number }));
      if (sql.includes("user_id IN (?)") && sql.includes("user_bank_accounts")) return data.backerBanks ?? [];
      if (sql.includes("payment_requested_at IS NOT NULL")) return [data.unpaid ?? { expired: 0, paid: 0 }];
      return [];
    },
  } as any;
}

describe("pledge integrity rules", () => {
  it("bỏ qua IP nội bộ/loopback", () => {
    ok(isPublicIp("203.113.10.5"));
    ok(isPublicIp("::ffff:14.161.2.3"));
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.2", "172.18.0.4", "::1", "fd00::1", ""]) ok(!isPublicIp(ip), ip);
  });

  it("cửa sổ 1 giờ đông nhất", () => {
    const base = NOW.getTime();
    deepEqual(densestWindow([base, base + 60_000, base + 120_000, base + 5 * 3_600_000]).size, 3);
  });

  it("trùng IP/ngân hàng với chủ dự án là tín hiệu mạnh; tỷ lệ cần đủ người", () => {
    const groups = integrityRules({ integrity_backer_count: 2, backers_shared_ip_owner: 2, backers_same_bank_owner: 1 }).map((r) => r.group);
    deepEqual(groups.sort(), ["RULE_SAME_BANK_AS_OWNER", "RULE_SHARED_IP_WITH_OWNER"]);
    equal(integrityRules({ integrity_backer_count: 3, new_account_backer_ratio: 1, single_campaign_backer_ratio: 1 }).length, 0);
    const pattern = integrityRules({ integrity_backer_count: 6, new_account_backer_ratio: 0.8, single_campaign_backer_ratio: 1 });
    ok(pattern.some((r) => r.group === "RULE_CLONE_PATTERN" && r.weight >= 0.8));
  });
});

describe("PledgeIntegrityService.analyze", () => {
  const fresh = (i: number, minutes = i): Backer => ({
    userId: `clone-${i}`,
    createdAt: new Date(NOW.getTime() - DAY),
    firstAt: new Date(NOW.getTime() + minutes * 60_000),
  });

  it("nhận ra nhóm clone: tài khoản mới, chỉ cam kết dự án này, dồn dập, chung IP với chủ dự án", async () => {
    const backers = [1, 2, 3, 4, 5].map((i) => fresh(i));
    const real: Backer = { userId: "real", createdAt: new Date(NOW.getTime() - 400 * DAY), firstAt: new Date(NOW.getTime() - 20 * DAY) };
    const service = new PledgeIntegrityService(
      fakeDataSource({
        backers: [...backers, real],
        campaignsOf: { real: 4 },
        ips: [
          { userId: OWNER, ip: "203.113.10.5" },
          { userId: "clone-1", ip: "203.113.10.5" },
          { userId: "clone-2", ip: "203.113.10.5" },
          { userId: "clone-3", ip: "203.113.10.5" },
          { userId: "real", ip: "14.161.2.3" },
        ],
      }),
    );
    const result = await service.analyze(CAMPAIGN_ID, NOW);
    equal(result.features.integrity_backer_count, 6);
    equal(result.features.backers_shared_ip_owner, 3);
    equal(result.features.backers_shared_ip_max_group, 3);
    ok(result.score >= 0.7);
    const suspectIds = result.suspects.map((s) => s.userId);
    ok(!suspectIds.includes("real"));
    ok(suspectIds.includes("clone-1") && suspectIds.includes("clone-5"));
    ok(result.suspects[0].signals.includes("shared_ip_owner"));
  });

  it("trùng tài khoản ngân hàng với chủ dự án", async () => {
    const service = new PledgeIntegrityService(
      fakeDataSource({
        backers: [{ userId: "b1", createdAt: new Date(NOW.getTime() - 300 * DAY), firstAt: NOW }],
        campaignsOf: { b1: 3 },
        ownerBanks: ["0123456789"],
        backerBanks: [{ userId: "b1", number: "0123456789" }],
      }),
    );
    const result = await service.analyze(CAMPAIGN_ID, NOW);
    equal(result.features.backers_same_bank_owner, 1);
    deepEqual(result.suspects.map((s) => s.signals), [["same_bank_owner"]]);
  });

  it("dự án bình thường không bị gắn cờ", async () => {
    const backers = [1, 2, 3, 4, 5, 6].map((i) => ({
      userId: `u${i}`,
      createdAt: new Date(NOW.getTime() - 200 * DAY),
      firstAt: new Date(NOW.getTime() - i * DAY),
    }));
    const service = new PledgeIntegrityService(
      fakeDataSource({ backers, campaignsOf: Object.fromEntries(backers.map((b) => [b.userId, 3])) }),
    );
    const result = await service.analyze(CAMPAIGN_ID, NOW);
    equal(result.reasons.length, 0);
    equal(result.suspects.length, 0);
  });
});

describe("RiskAlertService gộp dấu hiệu tài khoản clone", () => {
  it("AI không chạy vẫn tạo cảnh báo mức cao từ dấu hiệu clone", async () => {
    const campaign = { id: CAMPAIGN_ID, title: "Giếng nước", status: CampaignStatus.ACTIVE } as any;
    const created: any[] = [];
    const riskAlertRepo: any = {
      findOneBy: async () => null,
      findBy: async () => [],
      create: (dto: any) => ({ id: "alert-1", ...dto }),
      save: async (alert: any) => {
        created.push(alert);
        return alert;
      },
    };
    const donationRepo: any = { count: async () => 0, find: async () => [] };
    const integrity: any = {
      disbursedIds: async () => new Set(),
      analyze: async () => ({
        features: { integrity_backer_count: 6, backers_shared_ip_owner: 3 },
        reasons: [{ group: "RULE_SHARED_IP_WITH_OWNER", label: "Người cam kết dùng chung địa chỉ IP với chủ dự án", weight: 1 }],
        score: 1,
        suspects: [],
      }),
    };
    const service = new RiskAlertService(
      { find: async () => [campaign] } as any,
      donationRepo,
      riskAlertRepo,
      { getFraudScore: async () => ({ available: false }) } as any,
      makeAuditRecorder().service,
      integrity,
    );
    const summary = await service.generateWarnings(null);
    equal(summary.flagged, 1);
    equal(created[0].level, RiskAlertLevel.HIGH);
    equal(created[0].status ?? RiskAlertStatus.OPEN, RiskAlertStatus.OPEN);
    ok(created[0].reasons.some((r: any) => r.group === "RULE_SHARED_IP_WITH_OWNER"));
    equal(created[0].evidences.backers_shared_ip_owner, 3);
  });
});
