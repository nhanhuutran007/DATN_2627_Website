"use client";

import { useEffect, useId } from "react";

import { fetchMyBankAccount } from "@/lib/api/users";

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
/** Tên chủ tài khoản: chỉ chữ cái và khoảng trắng (không chữ số), 3–70 ký tự — khớp kiểm tra ở server. */
export const ACCOUNT_NAME_MIN = 3;
export const ACCOUNT_NAME_MAX = 70;
const ACCOUNT_NAME_PATTERN = /^[\p{L} ]+$/u;
const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");

/** Lỗi của riêng tên chủ tài khoản, hoặc "" (để hiện ngay dưới ô khi đang nhập). */
export function accountNameError(value: string): string {
  const name = normalizeName(value);
  if (!name) return "Vui lòng nhập tên chủ tài khoản.";
  if (/\d/.test(name)) return "Tên chủ tài khoản không được chứa chữ số.";
  if (!ACCOUNT_NAME_PATTERN.test(name)) return "Tên chủ tài khoản chỉ gồm chữ cái và khoảng trắng.";
  if (name.length < ACCOUNT_NAME_MIN || name.length > ACCOUNT_NAME_MAX) {
    return `Tên chủ tài khoản cần từ ${ACCOUNT_NAME_MIN} đến ${ACCOUNT_NAME_MAX} ký tự.`;
  }
  return "";
}

export type BankDraft = { bankName: string; accountNumber: string; accountName: string };

export const EMPTY_BANK: BankDraft = { bankName: "", accountNumber: "", accountName: "" };

/** Lỗi đầu tiên của tài khoản nhận hoàn (khớp kiểm tra ở server), hoặc "". */
export function bankDraftError(bank: BankDraft): string {
  if (bank.bankName.trim().length < 2) return "Vui lòng nhập tên ngân hàng.";
  if (!ACCOUNT_PATTERN.test(accountDigits(bank.accountNumber))) return "Số tài khoản chỉ gồm 6–19 chữ số.";
  return accountNameError(bank.accountName);
}

export function bankPayload(bank: BankDraft) {
  return {
    bankName: bank.bankName.trim(),
    bankAccountNumber: accountDigits(bank.accountNumber),
    bankAccountName: normalizeName(bank.accountName).toUpperCase(),
  };
}

/** Điền sẵn tài khoản ngân hàng trong hồ sơ (Cài đặt › Tài khoản) nếu ô nhập còn trống. */
export function usePrefillBankFromProfile(setBank: (update: (current: BankDraft) => BankDraft) => void) {
  useEffect(() => {
    let active = true;
    fetchMyBankAccount()
      .then((account) => {
        if (!active || !account) return;
        setBank((current) =>
          current.bankName || current.accountNumber || current.accountName
            ? current
            : { bankName: account.bankName, accountNumber: account.bankAccountNumber, accountName: account.bankAccountName },
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setBank]);
}

export function BankFields({
  value,
  onChange,
  hint,
  legend = "Tài khoản nhận hoàn tiền",
}: {
  value: BankDraft;
  onChange: (next: BankDraft) => void;
  hint: string;
  legend?: string;
}) {
  const banksId = useId();
  // Báo lỗi tên ngay khi đã nhập (ô trống thì chờ tới lúc lưu mới báo).
  const nameError = value.accountName.trim() ? accountNameError(value.accountName) : "";
  return (
    <fieldset className="refund-bank">
      <legend>{legend}</legend>
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
          maxLength={ACCOUNT_NAME_MAX}
          autoComplete="off"
          placeholder="Vd. NGUYEN VAN A"
          value={value.accountName}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${banksId}-name-error` : undefined}
          onChange={(e) => onChange({ ...value, accountName: e.target.value.toUpperCase() })}
        />
        {nameError && <small className="field-error" id={`${banksId}-name-error`}>{nameError}</small>}
      </label>
    </fieldset>
  );
}
