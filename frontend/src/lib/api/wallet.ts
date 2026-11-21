import { api } from "../api";
import type { SepayCheckoutForm } from "./donations";

export type WalletTxType =
  | "topup"
  | "hold"
  | "capture"
  | "release"
  | "refund"
  | "withdraw_request"
  | "withdraw_paid"
  | "withdraw_cancel";

export type WalletTransaction = {
  id: string;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  heldAfter: number;
  withdrawingAfter: number;
  donationId: string | null;
  topupId: string | null;
  withdrawalId: string | null;
  note: string | null;
  createdAt: string;
};

export type WalletView = {
  /** Số dư dùng được để ủng hộ. */
  balance: number;
  /** Đang giữ cho các cam kết (chờ chiến dịch kết thúc). */
  held: number;
  /** Đã gửi yêu cầu rút, chờ admin chuyển khoản. */
  withdrawing: number;
  transactions: WalletTransaction[];
  /** Cho phép nạp thử không qua SePay (môi trường demo). */
  demoTopup: boolean;
  /** SePay đã cấu hình (nạp thật bằng chuyển khoản). */
  sepay: boolean;
};

export type TopupStatus = "pending" | "completed" | "expired" | "cancelled";

export type WalletTopup = {
  id: string;
  amount: number | string;
  status: TopupStatus;
  transferCode: string;
  completedAt: string | null;
  createdAt: string;
};

export const MIN_TOPUP = 10_000;

/** Nhãn và chiều (+ cộng số dư, − trừ số dư, 0 chỉ đổi tiền giữ) của từng loại giao dịch. */
export const WALLET_TX_LABEL: Record<WalletTxType, { label: string; sign: "+" | "−" | "" }> = {
  topup: { label: "Nạp tiền", sign: "+" },
  hold: { label: "Giữ cho cam kết ủng hộ", sign: "−" },
  capture: { label: "Trừ khoản đang giữ (dự án đạt mục tiêu)", sign: "" },
  release: { label: "Hoàn về ví (dự án không đạt / rút cam kết)", sign: "+" },
  refund: { label: "Hoàn tiền ủng hộ về ví", sign: "+" },
  withdraw_request: { label: "Yêu cầu rút về ngân hàng (chờ chuyển khoản)", sign: "−" },
  withdraw_paid: { label: "Đã chuyển khoản tiền rút", sign: "" },
  withdraw_cancel: { label: "Hủy/từ chối yêu cầu rút: trả về số dư", sign: "+" },
};

export type WithdrawalStatus = "pending" | "completed" | "rejected" | "cancelled";

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, { label: string; tone: string }> = {
  pending: { label: "Chờ chuyển khoản", tone: "tag-amber" },
  completed: { label: "Đã chuyển khoản", tone: "tag-green" },
  rejected: { label: "Bị từ chối", tone: "tag-red" },
  cancelled: { label: "Đã hủy", tone: "" },
};

export type Withdrawal = {
  id: string;
  amount: number;
  bankName: string;
  /** Người dùng chỉ thấy 4 số cuối; admin thấy đủ để chuyển khoản. */
  bankAccountNumber: string;
  bankAccountName: string;
  status: WithdrawalStatus;
  transferReference: string | null;
  proofUrl: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
};

export type WithdrawalPage = { items: Withdrawal[]; total: number; offset: number; limit: number };

export const MIN_WITHDRAW = 50_000;

export function fetchMyWithdrawals(): Promise<Withdrawal[]> {
  return api.get<Withdrawal[]>("/wallet/withdrawals");
}

export function requestWithdrawal(input: {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}): Promise<Withdrawal> {
  return api.post<Withdrawal>("/wallet/withdrawals", input);
}

export function cancelWithdrawal(id: string): Promise<Withdrawal> {
  return api.post<Withdrawal>(`/wallet/withdrawals/${encodeURIComponent(id)}/cancel`);
}

export function fetchAdminWithdrawals(status?: WithdrawalStatus, offset = 0, limit = 20): Promise<WithdrawalPage> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (status) params.set("status", status);
  return api.get<WithdrawalPage>(`/admin/wallet-withdrawals?${params.toString()}`);
}

export function approveWithdrawal(
  id: string,
  input: { adminNotes: string; transferReference: string; proofMediaId?: string },
): Promise<Withdrawal> {
  return api.patch<Withdrawal>(`/admin/wallet-withdrawals/${encodeURIComponent(id)}/approve`, input);
}

export function rejectWithdrawal(id: string, adminNotes: string): Promise<Withdrawal> {
  return api.patch<Withdrawal>(`/admin/wallet-withdrawals/${encodeURIComponent(id)}/reject`, { adminNotes });
}

export function fetchWallet(): Promise<WalletView> {
  return api.get<WalletView>("/wallet/me");
}

export function createTopup(amount: number): Promise<{ topup: WalletTopup; checkout: SepayCheckoutForm | null }> {
  return api.post<{ topup: WalletTopup; checkout: SepayCheckoutForm | null }>("/wallet/topups", { amount });
}

export function topupCheckout(id: string): Promise<SepayCheckoutForm> {
  return api.post<SepayCheckoutForm>(`/wallet/topups/${encodeURIComponent(id)}/checkout`);
}

export function syncTopup(id: string): Promise<WalletTopup> {
  return api.post<WalletTopup>(`/wallet/topups/${encodeURIComponent(id)}/sync`);
}

export function confirmDemoTopup(id: string): Promise<WalletTopup> {
  return api.post<WalletTopup>(`/wallet/topups/${encodeURIComponent(id)}/demo-confirm`);
}

export function cancelTopup(id: string): Promise<WalletTopup> {
  return api.post<WalletTopup>(`/wallet/topups/${encodeURIComponent(id)}/cancel`);
}
