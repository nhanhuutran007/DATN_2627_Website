import type { Metadata } from "next";

import { AccountDashboard } from "@/features/dashboard/AccountDashboard";

export const metadata: Metadata = {
  title: "Trang của tôi",
  robots: { index: false },
};

export default function DashboardPage() {
  return <AccountDashboard />;
}
