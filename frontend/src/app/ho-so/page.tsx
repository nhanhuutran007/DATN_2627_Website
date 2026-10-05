import type { Metadata } from "next";

import { ProfileForm } from "@/features/profile/ProfileForm";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileForm />;
}
