import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/AuthShell";
import { RegisterForm } from "@/features/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description: "Tạo tài khoản Góp Mầm để ủng hộ các dự án cộng đồng hoặc gây quỹ cho dự án của bạn.",
  alternates: { canonical: "/dang-ky" },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Tạo tài khoản"
      lead="Dùng một tài khoản để ủng hộ dự án và, nếu muốn, gây quỹ cho dự án của chính bạn."
      image={{ src: "/images/cover-startup.webp", alt: "" }}
    >
      <Suspense fallback={<p className="hint">Đang tải biểu mẫu…</p>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
