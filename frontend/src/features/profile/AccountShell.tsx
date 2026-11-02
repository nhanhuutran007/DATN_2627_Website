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

/**
 * Khung trang "Cài đặt" (theo GoFundMe /account): tiêu đề lớn + tab dạng nút bo tròn.
 * Màn hình rộng: tiêu đề và tab thành cột trái dính, nội dung chiếm phần còn lại.
 */
export function AccountShell({ active, children }: AccountShellProps) {
  return (
    <main className="account-page">
      <div className="account-wrap">
        <aside className="account-aside">
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
        </aside>
        <div className="account-content">{children}</div>
      </div>
    </main>
  );
}
