import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/AuthShell";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  robots: { index: false, follow: false },
  // URL chứa token đặt lại mật khẩu: không gửi nó sang trang khác qua Referer.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      lead="Chọn mật khẩu mới cho tài khoản của bạn."
      image={{ src: "/images/cover-startup.webp", alt: "" }}
    >
      <Suspense fallback={<p className="hint">Đang tải biểu mẫu…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
