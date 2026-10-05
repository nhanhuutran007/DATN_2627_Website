import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/AuthShell";
import { ProfileForm } from "@/features/profile/ProfileForm";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <AuthShell
      title="Hồ sơ cá nhân"
      lead="Cập nhật tên hiển thị, ảnh đại diện và thông tin liên hệ của tài khoản."
      image={{ src: "/images/cover-startup.webp", alt: "" }}
    >
      <ProfileForm />
    </AuthShell>
  );
}
