"use client";

import { useId } from "react";

/** Tài khoản ngân hàng nhận tiền (hoàn tiền SePay, rút tiền ví): ô nhập + kiểm tra giống máy chủ. */

/** Gợi ý tên ngân hàng phổ biến cho ô nhập (vẫn gõ tự do được). */
export const COMMON_BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank", "MB Bank", "ACB", "VPBank", "Sacombank",
  "TPBank", "VIB", "HDBank", "SHB", "OCB", "MSB", "SeABank", "Eximbank", "LPBank", "Nam A Bank", "Bac A Bank",
];

/** Số tài khoản: bỏ khoảng trắng, dấu chấm, gạch ngang — khớp chuẩn hóa ở server. */
export const accountDigits = (value: string) => value.replace(/[\s.-]/g, "");
export const ACCOUNT_PATTERN = /^\d{6,19}$/;
export const maskAccount = (value: string) => `•••• ${value.slice(-4)}`;

export type BankDraft = { bankName: string; accountNumber: string; accountName: string };

export const EMPTY_BANK: BankDraft = { bankName: "", accountNumber: "", accountName: "" };

/** Lỗi đầu tiên của tài khoản nhận hoàn (khớp kiểm tra ở server), hoặc "". */
export function bankDraftError(bank: BankDraft): string {
  if (bank.bankName.trim().length < 2) return "Vui lòng nhập tên ngân hàng.";
  if (!ACCOUNT_PATTERN.test(accountDigits(bank.accountNumber))) return "Số tài khoản chỉ gồm 6–19 chữ số.";
  if (bank.accountName.trim().length < 2) return "Vui lòng nhập tên chủ tài khoản.";
  return "";
}

export function bankPayload(bank: BankDraft) {
  return {
    bankName: bank.bankName.trim(),
    bankAccountNumber: accountDigits(bank.accountNumber),
    bankAccountName: bank.accountName.trim().toUpperCase(),
  };
}

export function BankFields({ value, onChange, hint }: { value: BankDraft; onChange: (next: BankDraft) => void; hint: string }) {
  const banksId = useId();
  return (
    <fieldset className="refund-bank">
      <legend>Tài khoản nhận hoàn tiền</legend>
      <p className="hint">{hint}</p>
      <label className="field">
        <span>Ngân hàng</span>
        <input
          list={banksId}
          maxLength={100}
          autoComplete="off"
          placeholder="Vd. Vietcombank"
          value={value.bankName}
          onChange={(e) => onChange({ ...value, bankName: e.target.value })}
        />
        <datalist id={banksId}>
          {COMMON_BANKS.map((bank) => <option key={bank} value={bank} />)}
        </datalist>
      </label>
      <label className="field">
        <span>Số tài khoản</span>
        <input
          inputMode="numeric"
          maxLength={30}
          autoComplete="off"
          placeholder="Chỉ gồm chữ số"
          value={value.accountNumber}
          onChange={(e) => onChange({ ...value, accountNumber: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Tên chủ tài khoản</span>
        <input
          maxLength={100}
          autoComplete="off"
          placeholder="Vd. NGUYEN VAN A"
          value={value.accountName}
          onChange={(e) => onChange({ ...value, accountName: e.target.value.toUpperCase() })}
        />
      </label>
    </fieldset>
  );
}
