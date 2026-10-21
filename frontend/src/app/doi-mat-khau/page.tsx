import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/ui/LogoMark";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  robots: { index: false, follow: false },
};

/** Cùng khung thẻ toàn màn hình với đăng nhập/quên mật khẩu (không header/footer — xem ChromeGate). */
export default function ChangePasswordPage() {
  return (
    <main className="signin-page">
      <div className="signin-card signin-card-start">
        <Link className="logo signin-logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
