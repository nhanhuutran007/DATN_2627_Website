import { WalletTxType } from "./entities/wallet.entity";

/** Ba ngăn tiền của một ví. */
export type WalletBuckets = { balance: number; held: number; withdrawing: number };

export const BUCKETS = ["balance", "held", "withdrawing"] as const;
export type BucketName = (typeof BUCKETS)[number];

/**
 * Mỗi loại giao dịch làm ngăn nào tăng (+1) / giảm (−1). Đây là nguồn sự thật duy nhất để
 * dựng lại số dư từ sổ: SQL tổng hợp và phép dựng lại từng bước đều sinh từ bảng này.
 */
export const TX_EFFECT: Record<WalletTxType, WalletBuckets> = {
  [WalletTxType.TOPUP]: { balance: 1, held: 0, withdrawing: 0 },
  [WalletTxType.HOLD]: { balance: -1, held: 1, withdrawing: 0 },
  [WalletTxType.CAPTURE]: { balance: 0, held: -1, withdrawing: 0 },
  [WalletTxType.RELEASE]: { balance: 1, held: -1, withdrawing: 0 },
  [WalletTxType.REFUND]: { balance: 1, held: 0, withdrawing: 0 },
  [WalletTxType.WITHDRAW_REQUEST]: { balance: -1, held: 0, withdrawing: 1 },
  [WalletTxType.WITHDRAW_PAID]: { balance: 0, held: 0, withdrawing: -1 },
  [WalletTxType.WITHDRAW_CANCEL]: { balance: 1, held: 0, withdrawing: -1 },
};

/** Đổi sang đơn vị xu (số nguyên) để so sánh tiền DECIMAL(15,2) không sai số. */
export function toCents(value: number | string | null | undefined): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Biểu thức SQL tính tổng một ngăn theo sổ, sinh từ TX_EFFECT (cột `type`, `amount`). */
export function ledgerSumSql(bucket: BucketName, alias = ""): string {
  const prefix = alias ? `${alias}.` : "";
  const cases = (Object.keys(TX_EFFECT) as WalletTxType[])
    .filter((type) => TX_EFFECT[type][bucket] !== 0)
    .map((type) => `WHEN '${type}' THEN ${TX_EFFECT[type][bucket] > 0 ? "" : "-"}${prefix}\`amount\``)
    .join(" ");
  return `COALESCE(SUM(CASE ${prefix}\`type\` ${cases} ELSE 0 END), 0)`;
}

/** Chênh lệch (ví thực tế − sổ) theo xu; mọi ngăn bằng 0 nghĩa là khớp. */
export function bucketDiffCents(actual: WalletBuckets, ledger: WalletBuckets): WalletBuckets {
  return {
    balance: toCents(actual.balance) - toCents(ledger.balance),
    held: toCents(actual.held) - toCents(ledger.held),
    withdrawing: toCents(actual.withdrawing) - toCents(ledger.withdrawing),
  };
}

export function isZero(diff: WalletBuckets): boolean {
  return diff.balance === 0 && diff.held === 0 && diff.withdrawing === 0;
}

export type LedgerTx = {
  id: string;
  type: WalletTxType;
  amount: number | string;
  balanceAfter: number | string;
  heldAfter: number | string;
  withdrawingAfter: number | string;
  createdAt: Date | string;
};

/** Lần đầu tiên số dư ghi trên sổ không khớp phép cộng dồn: tiền đã bị đổi ngoài sổ trước đó. */
export type LedgerBreak = {
  txId: string;
  type: WalletTxType;
  createdAt: Date | string;
  /** Số dư sau giao dịch nếu chỉ cộng dồn từ sổ (VND). */
  expected: WalletBuckets;
  /** Số dư sau giao dịch hệ thống đã ghi lại lúc đó (VND). */
  recorded: WalletBuckets;
  /** recorded − expected (VND): khoản đã bị thêm/bớt ngoài sổ ngay trước giao dịch này. */
  jump: WalletBuckets;
};

export type LedgerReplay = {
  /** Số dư dựng lại từ sổ (VND). */
  ledger: WalletBuckets;
  firstBreak: LedgerBreak | null;
};

/**
 * Cộng dồn sổ theo thứ tự thời gian và so với số dư hệ thống ghi sau mỗi giao dịch.
 * Lần lệch đầu tiên cho biết tiền bị sửa ngoài sổ vào khoảng thời gian nào.
 */
export function replayLedger(transactions: LedgerTx[]): LedgerReplay {
  const running: WalletBuckets = { balance: 0, held: 0, withdrawing: 0 };
  let firstBreak: LedgerBreak | null = null;
  // Sau mỗi lần lệch, tiếp tục dò từ số đã ghi để không báo lặp cùng một lần sửa.
  const recordedBase: WalletBuckets = { balance: 0, held: 0, withdrawing: 0 };
  for (const tx of transactions) {
    const effect = TX_EFFECT[tx.type];
    if (!effect) continue;
    const amount = toCents(tx.amount);
    for (const bucket of BUCKETS) {
      running[bucket] += effect[bucket] * amount;
      recordedBase[bucket] += effect[bucket] * amount;
    }
    const recorded: WalletBuckets = {
      balance: toCents(tx.balanceAfter),
      held: toCents(tx.heldAfter),
      withdrawing: toCents(tx.withdrawingAfter),
    };
    const jump: WalletBuckets = {
      balance: recorded.balance - recordedBase.balance,
      held: recorded.held - recordedBase.held,
      withdrawing: recorded.withdrawing - recordedBase.withdrawing,
    };
    if (!isZero(jump)) {
      if (!firstBreak) {
        firstBreak = {
          txId: tx.id,
          type: tx.type,
          createdAt: tx.createdAt,
          expected: centsToVnd(recordedBase),
          recorded: centsToVnd(recorded),
          jump: centsToVnd(jump),
        };
      }
      Object.assign(recordedBase, recorded);
    }
  }
  return { ledger: centsToVnd(running), firstBreak };
}

export function centsToVnd(buckets: WalletBuckets): WalletBuckets {
  return {
    balance: fromCents(buckets.balance),
    held: fromCents(buckets.held),
    withdrawing: fromCents(buckets.withdrawing),
  };
}

/** Lý do một dòng sổ không khớp chứng từ gốc. */
export type SourceIssueKind =
  | "topup_missing"
  | "topup_not_completed"
  | "topup_mismatch"
  | "topup_unrecorded"
  | "donation_missing"
  | "donation_mismatch"
  | "withdrawal_missing"
  | "withdrawal_mismatch"
  | "withdrawal_not_completed";

export const SOURCE_ISSUE_MESSAGE: Record<SourceIssueKind, string> = {
  topup_missing: "Giao dịch nạp tiền không có đơn nạp SePay tương ứng",
  topup_not_completed: "Giao dịch nạp tiền gắn với đơn nạp chưa thanh toán",
  topup_mismatch: "Giao dịch nạp tiền khác người hoặc khác số tiền so với đơn nạp",
  topup_unrecorded: "Đơn nạp đã thanh toán nhưng chưa được cộng vào sổ ví",
  donation_missing: "Giao dịch giữ/trừ/hoàn không có khoản ủng hộ tương ứng",
  donation_mismatch: "Giao dịch giữ/trừ/hoàn khác người hoặc khác số tiền so với khoản ủng hộ",
  withdrawal_missing: "Giao dịch rút tiền không có yêu cầu rút tương ứng",
  withdrawal_mismatch: "Giao dịch rút tiền khác người hoặc khác số tiền so với yêu cầu rút",
  withdrawal_not_completed: "Ghi nhận đã chuyển tiền rút nhưng yêu cầu rút chưa được duyệt",
};

/** Dòng sổ kèm chứng từ gốc đã nối (LEFT JOIN) để phân loại lỗi. */
export type SourceRow = {
  type: WalletTxType;
  userId: string;
  amount: number | string;
  topupId: string | null;
  topupStatus: string | null;
  topupUser: string | null;
  topupAmount: number | string | null;
  donationId: string | null;
  donationUser: string | null;
  donationAmount: number | string | null;
  withdrawalId: string | null;
  withdrawalUser: string | null;
  withdrawalAmount: number | string | null;
  withdrawalStatus: string | null;
};

const DONATION_TYPES = new Set<WalletTxType>([WalletTxType.HOLD, WalletTxType.CAPTURE, WalletTxType.RELEASE, WalletTxType.REFUND]);
const WITHDRAW_TYPES = new Set<WalletTxType>([
  WalletTxType.WITHDRAW_REQUEST,
  WalletTxType.WITHDRAW_PAID,
  WalletTxType.WITHDRAW_CANCEL,
]);

/** Phân loại một dòng sổ; null nếu khớp chứng từ gốc. */
export function classifySourceRow(row: SourceRow): SourceIssueKind | null {
  const sameAmount = (other: number | string | null) => toCents(other) === toCents(row.amount);
  if (row.type === WalletTxType.TOPUP) {
    if (!row.topupId) return "topup_missing";
    if (row.topupUser !== row.userId || !sameAmount(row.topupAmount)) return "topup_mismatch";
    if (row.topupStatus !== "completed") return "topup_not_completed";
    return null;
  }
  if (DONATION_TYPES.has(row.type)) {
    if (!row.donationId) return "donation_missing";
    if (row.donationUser !== row.userId || !sameAmount(row.donationAmount)) return "donation_mismatch";
    return null;
  }
  if (WITHDRAW_TYPES.has(row.type)) {
    if (!row.withdrawalId) return "withdrawal_missing";
    if (row.withdrawalUser !== row.userId || !sameAmount(row.withdrawalAmount)) return "withdrawal_mismatch";
    if (row.type === WalletTxType.WITHDRAW_PAID && row.withdrawalStatus !== "completed") return "withdrawal_not_completed";
    return null;
  }
  return null;
}

function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function signed(value: number): string {
  return `${value > 0 ? "+" : "−"}${formatVnd(Math.abs(value))}`;
}

const BUCKET_LABEL: Record<BucketName, string> = {
  balance: "số dư",
  held: "tiền đang giữ",
  withdrawing: "tiền chờ rút",
};

/** Mô tả chênh lệch cho admin, vd. "số dư +40.000.000 ₫". */
export function describeDiff(diff: WalletBuckets): string {
  return BUCKETS.filter((bucket) => diff[bucket] !== 0)
    .map((bucket) => `${BUCKET_LABEL[bucket]} ${signed(diff[bucket])}`)
    .join(", ");
}
