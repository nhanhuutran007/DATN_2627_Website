import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  description: "Nhận liên kết đặt lại mật khẩu tài khoản Góp Mầm qua email.",
  alternates: { canonical: "/quen-mat-khau" },
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Quên mật khẩu"
      lead="Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      image={{ src: "/images/cover-mangrove.webp", alt: "" }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
