import type { Metadata } from "next";

import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Quản trị hệ thống" };

export default function AdminPage() {
  return <AdminDashboard />;
}