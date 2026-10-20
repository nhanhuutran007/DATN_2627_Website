"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { AUTH_EVENT, AuthUser, getStoredUser, hasSession } from "./api";

export type { AuthUser };

function subscribe(onChange: () => void): () => void {
  window.addEventListener(AUTH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// getStoredUser() parse JSON mỗi lần gọi; giữ nguyên tham chiếu khi nội dung
// không đổi để useSyncExternalStore không render lại vô hạn.
let cachedUserJson: string | null = null;
let cachedUser: AuthUser | null = null;

function getUserSnapshot(): AuthUser | null {
  const user = getStoredUser();
  const json = user ? JSON.stringify(user) : null;
  if (json !== cachedUserJson) {
    cachedUserJson = json;
    cachedUser = user;
  }
  return cachedUser;
}

// Server không có localStorage: render lần đầu luôn là "chưa đăng nhập", React
// chuyển sang trạng thái thật sau hydrate (tránh lỗi hydration mismatch #418).
const getServerUser = (): AuthUser | null => null;
const getServerLoggedIn = (): boolean => false;

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, getUserSnapshot, getServerUser);
}

/** Tài khoản quản trị chỉ dùng để quản trị: không ủng hộ, tạo chiến dịch, bình luận, theo dõi hay báo cáo. */
export function useIsAdmin(): boolean {
  return useAuthUser()?.role === "admin";
}

/** Đưa tài khoản quản trị về /admin khi mở trang chỉ dành cho người dùng thường; trả về true khi đang chuyển. */
export function useRedirectAdmin(): boolean {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  useEffect(() => {
    if (isAdmin) router.replace("/admin");
  }, [isAdmin, router]);
  return isAdmin;
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, hasSession, getServerLoggedIn);
}
