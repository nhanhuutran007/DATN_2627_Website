import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/ui/LogoMark";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  description: "Nhận liên kết đặt lại mật khẩu tài khoản Góp Mầm qua email.",
  alternates: { canonical: "/quen-mat-khau" },
  robots: { index: false },
};

/** Cùng khung toàn màn hình với trang đăng nhập (không header/footer — xem ChromeGate). */
export default function ForgotPasswordPage() {
  return (
    <main className="signin-page">
      <div className="signin-card signin-card-start">
        <Link className="logo signin-logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
