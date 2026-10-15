import type { Metadata } from "next";

import { ProfileForm } from "@/features/profile/ProfileForm";

export const metadata: Metadata = {
  title: "Cài đặt tài khoản",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileForm />;
}
