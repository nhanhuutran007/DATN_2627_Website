import { In, IsNull, MoreThan, Not, Repository } from "typeorm";

import type { User } from "../users/entities/user.entity";
import { Donation, DonationStatus } from "./entities/donation.entity";

/**
 * Chính sách "cam kết trả sau": giới hạn số cam kết chưa trả và xử lý tăng dần người hay bỏ
 * cam kết (dự án đạt mục tiêu, được mời thanh toán mà quá hạn không trả): nhắc → giới hạn 1
 * cam kết → khóa tài khoản (bỏ cam kết làm phồng tiến độ dự án).
 */

const intFromEnv = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const pledgePolicy = () => ({
  /** Số dự án tối đa đang có cam kết chưa trả cùng lúc. */
  maxOpenCampaigns: intFromEnv("PLEDGE_MAX_OPEN_CAMPAIGNS", 5),
  /** Mức thấp hơn cho tài khoản mới. */
  maxOpenCampaignsNewAccount: intFromEnv("PLEDGE_MAX_OPEN_CAMPAIGNS_NEW_ACCOUNT", 2),
  newAccountDays: intFromEnv("PLEDGE_NEW_ACCOUNT_DAYS", 30),
  /** Từ số lần bỏ này: chỉ còn 1 cam kết chưa trả cùng lúc. */
  limitedAfter: intFromEnv("PLEDGE_LIMITED_AFTER_ABANDONS", 2),
  /** Từ số lần bỏ này: khóa tài khoản (hủy các cam kết còn mở). */
  blockedAfter: intFromEnv("PLEDGE_BLOCKED_AFTER_ABANDONS", 3),
  /** Chỉ đếm các lần bỏ trong chừng này ngày gần nhất. */
  windowDays: intFromEnv("PLEDGE_ABANDON_WINDOW_DAYS", 365),
});

/** Cam kết chưa trả: chưa kết thúc chiến dịch, hoặc đang trong hạn thanh toán. */
export const OPEN_PLEDGE_STATUSES = [DonationStatus.PLEDGED, DonationStatus.AWAITING_PAYMENT];

export type PledgeTier = "good" | "warned" | "limited" | "blocked";

export type PledgeStanding = {
  /** Số lần bỏ cam kết (đã trừ số cam kết đã trả) trong cửa sổ tính. */
  abandoned: number;
  /** Số cam kết hết hạn vì không trả (chưa trừ). */
  expiredCount: number;
  /** Số cam kết đã được mời thanh toán và trả đủ. */
  paidCount: number;
  tier: PledgeTier;
  /** Số dự án tối đa được cam kết chưa trả cùng lúc (0 = không được cam kết trả sau). */
  maxOpenCampaigns: number;
  /** Số dự án đang có cam kết chưa trả. */
  openCampaigns: number;
  canPledge: boolean;
  /** Đang dùng mức của tài khoản mới. */
  newAccount: boolean;
};

const DAY_MS = 86_400_000;

export function tierFor(abandoned: number, policy = pledgePolicy()): PledgeTier {
  if (policy.blockedAfter > 0 && abandoned >= policy.blockedAfter) return "blocked";
  if (policy.limitedAfter > 0 && abandoned >= policy.limitedAfter) return "limited";
  if (abandoned >= 1) return "warned";
  return "good";
}

/** Đếm từ bảng donations; `pledgeResetAt` (admin mở lại) bỏ qua các lần bỏ trước mốc đó. */
export async function computePledgeStanding(
  donationRepo: Repository<Donation>,
  user: Pick<User, "id" | "createdAt"> & { pledgeResetAt?: Date | null },
  now = new Date(),
): Promise<PledgeStanding> {
  const policy = pledgePolicy();
  const windowStart = new Date(now.getTime() - policy.windowDays * DAY_MS);
  const since = user.pledgeResetAt && new Date(user.pledgeResetAt) > windowStart ? new Date(user.pledgeResetAt) : windowStart;
  // Chỉ khoản đã được mời thanh toán (`payment_requested_at`) — đơn SePay chờ trả hết hạn 30 phút không tính.
  const requested = { userId: user.id, paymentRequestedAt: MoreThan(since) };
  const [expiredCount, paidCount, openRows] = await Promise.all([
    donationRepo.count({ where: { ...requested, status: DonationStatus.EXPIRED } }),
    donationRepo.count({ where: { ...requested, status: DonationStatus.COMPLETED } }),
    donationRepo.find({
      select: { campaignId: true },
      where: { userId: user.id, status: In(OPEN_PLEDGE_STATUSES), campaignId: Not(IsNull()) },
    }),
  ]);
  const abandoned = Math.max(0, expiredCount - paidCount);
  const tier = tierFor(abandoned, policy);
  const newAccount =
    !!user.createdAt && now.getTime() - new Date(user.createdAt).getTime() < policy.newAccountDays * DAY_MS;
  const baseMax = newAccount ? Math.min(policy.maxOpenCampaigns, policy.maxOpenCampaignsNewAccount) : policy.maxOpenCampaigns;
  const maxOpenCampaigns = tier === "blocked" ? 0 : tier === "limited" ? Math.min(1, baseMax) : baseMax;
  const openCampaigns = new Set(openRows.map((row) => row.campaignId)).size;
  return {
    abandoned,
    expiredCount,
    paidCount,
    tier,
    maxOpenCampaigns,
    openCampaigns,
    canPledge: maxOpenCampaigns > 0 && openCampaigns < maxOpenCampaigns,
    newAccount,
  };
}

/** Câu gửi kèm email "cam kết đã bị hủy", theo bậc sau lần bỏ này. */
export function standingNotice(standing: Pick<PledgeStanding, "abandoned" | "tier">, policy = pledgePolicy()): string {
  switch (standing.tier) {
    case "blocked":
      return ` Bạn đã bỏ ${standing.abandoned} cam kết không thanh toán nên tài khoản đã bị khóa và các cam kết còn lại bị hủy. Liên hệ quản trị viên Góp Mầm nếu muốn mở lại.`;
    case "limited":
      return ` Bạn đã bỏ ${standing.abandoned} cam kết nên từ nay chỉ giữ được 1 cam kết chưa thanh toán cùng lúc. Bỏ thêm ${Math.max(1, policy.blockedAfter - standing.abandoned)} lần nữa, tài khoản sẽ bị khóa.`;
    case "warned":
      return " Lưu ý: bỏ nhiều cam kết sẽ bị giới hạn rồi khóa tài khoản. Mỗi cam kết bạn thanh toán đủ sẽ xóa bớt một lần bỏ.";
    default:
      return "";
  }
}
