import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LogoMark } from "@/components/ui/LogoMark";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập Góp Mầm để ủng hộ dự án, theo dõi khoản đóng góp và quản lý chiến dịch của bạn.",
  alternates: { canonical: "/dang-nhap" },
};

/**
 * Trang đăng nhập/đăng ký toàn màn hình (không header/footer — xem ChromeGate):
 * một thẻ ở giữa trên nền họa tiết, các bước email → mật khẩu | tạo tài khoản.
 */
export default function LoginPage() {
  return (
    <main className="signin-page">
      <div className="signin-card">
        <Link className="logo signin-logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>
        <Suspense fallback={<p className="signin-lead">Đang tải…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
