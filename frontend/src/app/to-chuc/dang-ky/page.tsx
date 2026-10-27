import type { Metadata } from "next";

import { OrganizationRegister } from "@/features/organizations/OrganizationRegister";

export const metadata: Metadata = {
  title: "Đăng ký tổ chức",
  robots: { index: false },
};

export default function OrganizationRegisterPage() {
  return <OrganizationRegister />;
}
