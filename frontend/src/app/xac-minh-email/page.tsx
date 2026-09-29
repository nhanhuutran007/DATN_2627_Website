import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/AuthShell";
import { VerifyEmailView } from "@/features/auth/VerifyEmailView";

export const metadata: Metadata = {
  title: "Xác minh email",
  robots: { index: false, follow: false },
  // URL chứa token xác minh: không gửi nó sang trang khác qua Referer.
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Xác minh email"
      lead="Xác nhận địa chỉ email giúp bảo vệ tài khoản và tăng độ tin cậy cho dự án của bạn."
      image={{ src: "/images/cover-mangrove.webp", alt: "" }}
    >
      <Suspense fallback={<p className="hint">Đang tải…</p>}>
        <VerifyEmailView />
      </Suspense>
    </AuthShell>
  );
}
