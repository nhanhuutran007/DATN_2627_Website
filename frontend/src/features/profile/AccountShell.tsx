"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useIsAuthenticated } from "@/lib/auth";

const TABS = [
  { href: "/ho-so", label: "Tài khoản" },
  { href: "/thong-bao", label: "Thông báo" },
] as const;

/** Các tab của trang Cài đặt: chuyển qua lại giữa chúng không bật hiệu ứng chuyển trang/cuộn về đầu. */
export const SETTINGS_TAB_PATHS: readonly string[] = TABS.map((tab) => tab.href);

export function isSettingsTabSwitch(from: string, to: string): boolean {
  return from !== to && SETTINGS_TAB_PATHS.includes(from) && SETTINGS_TAB_PATHS.includes(to);
}

/**
 * Khung trang "Cài đặt" (theo GoFundMe /account): tiêu đề lớn + tab dạng nút bo tròn.
 * Đặt trong layout chung của nhóm route `(cai-dat)` nên tiêu đề và tab đứng yên khi đổi tab,
 * chỉ phần nội dung bên dưới đổi và hiện dần. Chưa đăng nhập thì để trang tự hiện màn hình đăng nhập.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const loggedIn = useIsAuthenticated();

  if (!loggedIn) return <>{children}</>;

  return (
    <main className="account-page">
      <div className="account-wrap">
        <h1>Cài đặt</h1>
        <nav className="account-tabs" aria-label="Mục cài đặt">
          {TABS.map((tab) => {
            const active = tab.href === pathname;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`account-tab${active ? " is-active" : ""}`}
                href={tab.href}
                key={tab.href}
                scroll={false}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="fade-swap" key={pathname}>
          {children}
        </div>
      </div>
    </main>
  );
}
