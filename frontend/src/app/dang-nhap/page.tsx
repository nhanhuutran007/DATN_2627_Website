import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/AuthShell";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập Góp Mầm để ủng hộ dự án, theo dõi khoản đóng góp và quản lý chiến dịch của bạn.",
  alternates: { canonical: "/dang-nhap" },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Đăng nhập"
      lead="Tiếp tục theo dõi các dự án bạn ủng hộ và quản lý chiến dịch của mình."
      image={{ src: "/images/cover-mangrove.webp", alt: "" }}
    >
      <Suspense fallback={<p className="hint">Đang tải biểu mẫu…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
