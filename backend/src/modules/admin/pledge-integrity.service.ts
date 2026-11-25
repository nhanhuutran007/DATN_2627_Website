import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { COUNTED_DONATION_STATUSES, DonationStatus } from "../donations/entities/donation.entity";
import type { RiskReason } from "./entities/risk-alert.entity";

/**
 * Phát hiện chủ dự án dùng tài khoản clone cam kết để thổi phồng tiến độ (cấp chiến dịch).
 * Tính đặc trưng từ dữ liệu sẵn có: IP trong nhật ký, tài khoản ngân hàng, tuổi tài khoản,
 * lịch sử ủng hộ, thời điểm cam kết, tỷ lệ trả sau khi đạt mục tiêu. Đặc trưng được gửi sang
 * dịch vụ AI (`fraud_detector.py`); `integrityRules` là bản sao luật để dùng khi AI không chạy.
 * Kết quả chỉ để admin xem xét — không tự công khai hay tự xử lý.
 */

export const INTEGRITY_MIN_BACKERS = 5;
const NEW_ACCOUNT_DAYS = 7;
const IP_LOOKBACK_DAYS = 180;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Trạng thái tính là "đã cam kết cho dự án" (gồm cả cam kết đã hết hạn để soi lại sau này). */
const BACKER_STATUSES = [...COUNTED_DONATION_STATUSES, DonationStatus.EXPIRED];
const OPEN_STATUSES = [DonationStatus.PLEDGED, DonationStatus.AWAITING_PAYMENT, DonationStatus.CHARGE_FAILED];

export type SuspectSignal =
  | "shared_ip_owner"
  | "same_bank_owner"
  | "shared_ip_group"
  | "new_account"
  | "single_campaign"
  | "burst"
  | "unpaid";

const STRONG_SIGNALS: SuspectSignal[] = ["shared_ip_owner", "same_bank_owner"];

export type PledgeSuspect = {
  userId: string;
  name: string;
  email: string;
  accountCreatedAt: Date;
  firstPledgeAt: Date;
  amount: number;
  /** Số cam kết chưa trả của người này cho dự án (hủy được). */
  openPledges: number;
  status: "open" | "expired" | "paid";
  signals: SuspectSignal[];
};

export type PledgeIntegrity = {
  features: Record<string, number>;
  reasons: RiskReason[];
  /** 0-1, cùng thang với dịch vụ AI. */
  score: number;
  suspects: PledgeSuspect[];
};

/** IP riêng/loopback (mạng nội bộ, sau proxy Docker) không nói lên điều gì — bỏ qua. */
export function isPublicIp(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const ip = raw.trim().toLowerCase().replace(/^::ffff:/, "");
  if (!ip || ip === "unknown" || ip === "::1" || ip === "localhost") return false;
  if (/^(127|10)\./.test(ip) || /^192\.168\./.test(ip) || /^169\.254\./.test(ip)) return false;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
  if (/^(fc|fd|fe80)/.test(ip)) return false;
  return true;
}

const ignorePrivateIps = () => process.env.RISK_IGNORE_PRIVATE_IPS !== "false";

/** Luật giống hệt `_apply_pledge_integrity_rules` ở ai-service. */
export function integrityRules(f: Record<string, number>): RiskReason[] {
  const reasons: RiskReason[] = [];
  const push = (group: string, label: string, weight: number) =>
    reasons.push({ group, label, weight: Math.round(Math.min(1, weight) * 1e6) / 1e6 });
  const backers = f.integrity_backer_count ?? 0;
  if ((f.backers_shared_ip_owner ?? 0) >= 1) {
    push("RULE_SHARED_IP_WITH_OWNER", "Người cam kết dùng chung địa chỉ IP với chủ dự án", 0.5 + 0.25 * (f.backers_shared_ip_owner - 1));
  }
  if ((f.backers_same_bank_owner ?? 0) >= 1) {
    push("RULE_SAME_BANK_AS_OWNER", "Người cam kết trùng tài khoản ngân hàng với chủ dự án", 1);
  }
  if ((f.backers_shared_ip_max_group ?? 0) >= 3) {
    push("RULE_SHARED_IP_BACKERS", "Nhiều người cam kết dùng chung một địa chỉ IP", 0.2 * f.backers_shared_ip_max_group);
  }
  if (backers >= INTEGRITY_MIN_BACKERS) {
    const fresh = f.new_account_backer_ratio;
    const single = f.single_campaign_backer_ratio;
    if (fresh !== undefined && fresh >= 0.5) {
      push("RULE_NEW_ACCOUNT_BACKERS", "Phần lớn người cam kết là tài khoản mới tạo", fresh * 0.6);
    }
    if (single !== undefined && single >= 0.8) {
      push("RULE_SINGLE_CAMPAIGN_BACKERS", "Phần lớn người cam kết chưa từng ủng hộ dự án nào khác", single * 0.5);
    }
    if ((f.pledge_burst_ratio ?? 0) >= 0.6) {
      push("RULE_PLEDGE_BURST", "Cam kết dồn dập trong một khoảng thời gian ngắn", f.pledge_burst_ratio * 0.7);
    }
    if (fresh !== undefined && single !== undefined && fresh >= 0.5 && single >= 0.8) {
      push("RULE_CLONE_PATTERN", "Nhiều tài khoản mới chỉ cam kết cho riêng dự án này", 0.8);
    }
  }
  if ((f.payment_requested_count ?? 0) >= 3 && (f.unpaid_pledge_ratio ?? 0) >= 0.5) {
    push("RULE_UNPAID_PLEDGES", "Phần lớn cam kết không được thanh toán sau khi dự án đạt mục tiêu", f.unpaid_pledge_ratio);
  }
  return reasons.sort((a, b) => b.weight - a.weight);
}

/** Cửa sổ dài `windowMs` chứa nhiều mốc nhất: [số mốc, mốc bắt đầu]. */
export function densestWindow(times: number[], windowMs = HOUR_MS): { size: number; start: number } {
  const sorted = [...times].sort((a, b) => a - b);
  let best = { size: 0, start: Number.POSITIVE_INFINITY };
  for (let i = 0, j = 0; i < sorted.length; i += 1) {
    while (sorted[i] - sorted[j] > windowMs) j += 1;
    if (i - j + 1 > best.size) best = { size: i - j + 1, start: sorted[j] };
  }
  return best;
}

type BackerRow = {
  userId: string;
  name: string;
  email: string;
  createdAt: Date | string;
  firstAt: Date | string;
  amount: string | number;
  openPledges: string | number;
  expired: string | number;
};

const round = (n: number) => Math.round(n * 1e4) / 1e4;

@Injectable()
export class PledgeIntegrityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async analyze(campaignId: string, now = new Date()): Promise<PledgeIntegrity> {
    const [campaign] = await this.dataSource.query(`SELECT owner_id AS ownerId FROM campaigns WHERE id = ?`, [campaignId]);
    const ownerId: string | undefined = campaign?.ownerId;
    const backers: BackerRow[] = ownerId
      ? await this.dataSource.query(
          `SELECT d.user_id AS userId, u.name AS name, u.email AS email, u.created_at AS createdAt,
                  MIN(COALESCE(d.pledged_at, d.created_at)) AS firstAt, SUM(d.amount) AS amount,
                  SUM(d.status IN (?)) AS openPledges, SUM(d.status = ?) AS expired
             FROM donations d JOIN users u ON u.id = d.user_id
            WHERE d.campaign_id = ? AND d.status IN (?) AND d.user_id <> ?
            GROUP BY d.user_id, u.name, u.email, u.created_at`,
          [OPEN_STATUSES, DonationStatus.EXPIRED, campaignId, BACKER_STATUSES, ownerId],
        )
      : [];
    const n = backers.length;
    const ids = backers.map((b) => b.userId);

    const [otherCampaigns, ips, ownerBanks, backerBanks, unpaidRows] = await Promise.all([
      n
        ? this.dataSource.query(
            `SELECT user_id AS userId, COUNT(DISTINCT campaign_id) AS campaigns FROM donations
              WHERE user_id IN (?) AND status IN (?) GROUP BY user_id`,
            [ids, [...BACKER_STATUSES, DonationStatus.REFUNDED]],
          )
        : [],
      n
        ? this.dataSource.query(
            `SELECT DISTINCT user_id AS userId, ip_address AS ip FROM audit_logs
              WHERE user_id IN (?) AND ip_address IS NOT NULL AND created_at > ?`,
            [[...ids, ownerId], new Date(now.getTime() - IP_LOOKBACK_DAYS * DAY_MS)],
          )
        : [],
      n
        ? this.dataSource.query(
            `SELECT bank_account_number AS number FROM user_bank_accounts WHERE user_id = ?
             UNION SELECT p.bank_account_number FROM campaign_payout_accounts p
               JOIN campaigns c ON c.id = p.campaign_id WHERE c.owner_id = ?`,
            [ownerId, ownerId],
          )
        : [],
      n
        ? this.dataSource.query(
            `SELECT user_id AS userId, bank_account_number AS number FROM user_bank_accounts WHERE user_id IN (?)
             UNION SELECT user_id, bank_account_number FROM refund_requests
               WHERE user_id IN (?) AND bank_account_number IS NOT NULL
             UNION SELECT c.owner_id, p.bank_account_number FROM campaign_payout_accounts p
               JOIN campaigns c ON c.id = p.campaign_id WHERE c.owner_id IN (?)`,
            [ids, ids, ids],
          )
        : [],
      this.dataSource.query(
        `SELECT SUM(status = ?) AS expired, SUM(status = ?) AS paid FROM donations
          WHERE campaign_id = ? AND payment_requested_at IS NOT NULL`,
        [DonationStatus.EXPIRED, DonationStatus.COMPLETED, campaignId],
      ),
    ]);

    const campaignsOf = new Map<string, number>(
      (otherCampaigns as Array<{ userId: string; campaigns: string | number }>).map((r) => [r.userId, Number(r.campaigns)]),
    );
    const filterIp = ignorePrivateIps();
    const ipsOf = new Map<string, Set<string>>();
    for (const row of ips as Array<{ userId: string; ip: string }>) {
      if (filterIp && !isPublicIp(row.ip)) continue;
      const set = ipsOf.get(row.userId) ?? new Set<string>();
      set.add(row.ip.trim().replace(/^::ffff:/, ""));
      ipsOf.set(row.userId, set);
    }
    const ownerIps = (ownerId && ipsOf.get(ownerId)) || new Set<string>();
    const usersByIp = new Map<string, Set<string>>();
    for (const id of ids) {
      for (const ip of ipsOf.get(id) ?? []) {
        const set = usersByIp.get(ip) ?? new Set<string>();
        set.add(id);
        usersByIp.set(ip, set);
      }
    }
    const ownerNumbers = new Set((ownerBanks as Array<{ number: string }>).map((r) => r.number));
    const sameBank = new Set(
      (backerBanks as Array<{ userId: string; number: string }>).filter((r) => ownerNumbers.has(r.number)).map((r) => r.userId),
    );

    const signalsOf = new Map<string, Set<SuspectSignal>>();
    const mark = (id: string, signal: SuspectSignal) => {
      const set = signalsOf.get(id) ?? new Set<SuspectSignal>();
      set.add(signal);
      signalsOf.set(id, set);
    };

    let maxGroup = 0;
    for (const group of usersByIp.values()) {
      maxGroup = Math.max(maxGroup, group.size);
      if (group.size >= 3) for (const id of group) mark(id, "shared_ip_group");
    }

    const firstAt = (b: BackerRow) => new Date(b.firstAt).getTime();
    const burst = densestWindow(backers.map(firstAt));
    const burstRatio = n ? burst.size / n : 0;
    const isBurst = n >= INTEGRITY_MIN_BACKERS && burstRatio >= 0.6;

    let sharedOwner = 0;
    let fresh = 0;
    let single = 0;
    for (const b of backers) {
      if ([...(ipsOf.get(b.userId) ?? [])].some((ip) => ownerIps.has(ip))) {
        sharedOwner += 1;
        mark(b.userId, "shared_ip_owner");
      }
      if (sameBank.has(b.userId)) mark(b.userId, "same_bank_owner");
      // Tuổi âm (dữ liệu nhập lùi ngày) không nói lên điều gì: chỉ tính tài khoản tạo ngay trước khi cam kết.
      const age = firstAt(b) - new Date(b.createdAt).getTime();
      if (age >= 0 && age < NEW_ACCOUNT_DAYS * DAY_MS) {
        fresh += 1;
        mark(b.userId, "new_account");
      }
      if ((campaignsOf.get(b.userId) ?? 1) <= 1) {
        single += 1;
        mark(b.userId, "single_campaign");
      }
      if (isBurst && firstAt(b) >= burst.start && firstAt(b) <= burst.start + HOUR_MS) mark(b.userId, "burst");
      if (Number(b.expired) > 0) mark(b.userId, "unpaid");
    }

    const expired = Number(unpaidRows?.[0]?.expired ?? 0);
    const paid = Number(unpaidRows?.[0]?.paid ?? 0);
    const requested = expired + paid;
    const features: Record<string, number> = {
      integrity_backer_count: n,
      backers_shared_ip_owner: sharedOwner,
      backers_shared_ip_max_group: maxGroup,
      backers_same_bank_owner: sameBank.size,
      ...(n
        ? {
            new_account_backer_ratio: round(fresh / n),
            single_campaign_backer_ratio: round(single / n),
            pledge_burst_ratio: round(burstRatio),
          }
        : {}),
      payment_requested_count: requested,
      ...(requested ? { unpaid_pledge_ratio: round(expired / requested) } : {}),
    };
    const reasons = integrityRules(features);
    const score = reasons.reduce((max, r) => Math.max(max, r.weight), 0);

    const suspects = backers
      .map((b): PledgeSuspect => ({
        userId: b.userId,
        name: b.name,
        email: b.email,
        accountCreatedAt: new Date(b.createdAt),
        firstPledgeAt: new Date(b.firstAt),
        amount: Number(b.amount),
        openPledges: Number(b.openPledges),
        status: Number(b.openPledges) > 0 ? "open" : Number(b.expired) > 0 ? "expired" : "paid",
        signals: [...(signalsOf.get(b.userId) ?? [])],
      }))
      // Tín hiệu mạnh (IP/ngân hàng trùng chủ dự án) hoặc từ 2 tín hiệu yếu trở lên.
      .filter((s) => s.signals.some((x) => STRONG_SIGNALS.includes(x)) || s.signals.length >= 2)
      .sort((a, b) => b.signals.length - a.signals.length || b.amount - a.amount);

    return { features, reasons, score, suspects };
  }

  /** Chiến dịch đã giải ngân (không cần quét nữa). */
  async disbursedIds(campaignIds: string[]): Promise<Set<string>> {
    if (campaignIds.length === 0) return new Set();
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT campaign_id AS id FROM campaign_disbursements WHERE campaign_id IN (?)`,
      [campaignIds],
    );
    return new Set(rows.map((r) => r.id));
  }
}
