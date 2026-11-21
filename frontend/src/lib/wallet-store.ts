"use client";

import { useEffect, useSyncExternalStore } from "react";

import { api, AUTH_EVENT, getStoredUser } from "./api";

export type WalletSummary = { balance: number; held: number; withdrawing: number };

/**
 * Số dư ví dùng chung cho header và các trang (một lần tải cho cả trang). Làm mới khi
 * đăng nhập/đăng xuất, khi quay lại tab, và khi trang khác báo ví vừa đổi
 * (`refreshWallet()` sau khi ủng hộ/rút cam kết, `publishWallet()` khi đã có số liệu mới).
 * `null` = khách, admin (không có ví) hoặc chưa tải xong.
 */
let snapshot: WalletSummary | null = null;
let loadedFor: string | null = null;
let inFlight: Promise<void> | null = null;
let lastLoadedAt = 0;
const listeners = new Set<() => void>();
/** Quay lại tab: chỉ tải lại nếu số liệu đã cũ hơn chừng này. */
const FOCUS_REFRESH_MS = 30_000;

function emit(next: WalletSummary | null): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function eligibleUserId(): string | null {
  const user = getStoredUser();
  return user && user.role !== "admin" ? user.id : null;
}

/** Tải lại số dư từ máy chủ (bỏ qua nếu là khách/admin). */
export function refreshWallet(): Promise<void> {
  const userId = eligibleUserId();
  if (!userId) {
    loadedFor = null;
    if (snapshot !== null) emit(null);
    return Promise.resolve();
  }
  if (inFlight && loadedFor === userId) return inFlight;
  loadedFor = userId;
  inFlight = api
    .get<WalletSummary>("/wallet/summary")
    .then((summary) => {
      if (loadedFor !== userId) return;
      lastLoadedAt = Date.now();
      emit({ balance: Number(summary.balance), held: Number(summary.held), withdrawing: Number(summary.withdrawing ?? 0) });
    })
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Trang ví đã có số liệu mới: cập nhật header luôn, không cần gọi lại máy chủ. */
export function publishWallet(summary: WalletSummary): void {
  lastLoadedAt = Date.now();
  emit({ balance: Number(summary.balance), held: Number(summary.held), withdrawing: Number(summary.withdrawing ?? 0) });
}

let windowListening = false;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!windowListening && typeof window !== "undefined") {
    windowListening = true;
    const reset = () => {
      loadedFor = null;
      emit(null);
      void refreshWallet();
    };
    window.addEventListener(AUTH_EVENT, reset);
    window.addEventListener("storage", reset);
    window.addEventListener("focus", () => {
      if (Date.now() - lastLoadedAt > FOCUS_REFRESH_MS) void refreshWallet();
    });
  }
  return () => listeners.delete(listener);
}

/** Số dư ví của người đang đăng nhập (null nếu khách/admin hoặc đang tải). */
export function useWalletSummary(): WalletSummary | null {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => null);
  useEffect(() => {
    if (eligibleUserId() !== loadedFor || snapshot === null) void refreshWallet();
  }, []);
  return value;
}
