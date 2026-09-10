import type { Metadata } from "next";

import { OwnerDashboard } from "@/features/dashboard/OwnerDashboard";

export const metadata: Metadata = { title: "Trung tâm chủ dự án" };

export default function DashboardPage() {
  return <OwnerDashboard />;
}