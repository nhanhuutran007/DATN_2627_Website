import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/AuthShell";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return (
    <AuthShell
      title="Đổi mật khẩu"
      lead="Nhập mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản của bạn."
      image={{ src: "/images/cover-startup.webp", alt: "" }}
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
