import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LogoMark } from "@/components/ui/LogoMark";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  robots: { index: false, follow: false },
  // URL chứa token đặt lại mật khẩu: không gửi nó sang trang khác qua Referer.
  referrer: "no-referrer",
};

/** Mở từ link trong email; cùng khung thẻ với đăng nhập/quên mật khẩu (không header/footer). */
export default function ResetPasswordPage() {
  return (
    <main className="signin-page">
      <div className="signin-card signin-card-start">
        <Link className="logo signin-logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>
        <Suspense fallback={<p className="signin-lead">Đang tải…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
