import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { href: "/ho-so", label: "Tài khoản", key: "account" },
  { href: "/thong-bao", label: "Thông báo", key: "notifications" },
] as const;

type AccountShellProps = {
  active: (typeof TABS)[number]["key"];
  children: ReactNode;
};

/** Khung trang "Cài đặt" (theo GoFundMe /account): tiêu đề lớn + tab dạng nút bo tròn. */
export function AccountShell({ active, children }: AccountShellProps) {
  return (
    <main className="account-page">
      <div className="account-wrap">
        <h1>Cài đặt</h1>
        <nav className="account-tabs" aria-label="Mục cài đặt">
          {TABS.map((tab) => (
            <Link
              aria-current={tab.key === active ? "page" : undefined}
              className={`account-tab${tab.key === active ? " is-active" : ""}`}
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}
