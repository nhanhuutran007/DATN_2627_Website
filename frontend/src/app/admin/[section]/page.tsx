import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ADMIN_SECTIONS, findAdminSection } from "@/features/admin/sections";

type Props = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ADMIN_SECTIONS.filter((section) => section.slug).map((section) => ({ section: section.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = findAdminSection((await params).section);
  return { title: section ? `${section.title} – Quản trị` : "Quản trị hệ thống" };
}

// Nội dung do AdminDashboard trong layout hiển thị theo URL.
export default async function AdminSectionPage({ params }: Props) {
  if (!findAdminSection((await params).section)) notFound();
  return null;
}
