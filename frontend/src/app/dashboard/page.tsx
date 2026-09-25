import type { Metadata } from "next";

import { OwnerDashboard } from "@/features/dashboard/OwnerDashboard";

export const metadata: Metadata = {
  title: "Quản lý chiến dịch",
  robots: { index: false },
};

export default function DashboardPage() {
  return <OwnerDashboard />;
}
