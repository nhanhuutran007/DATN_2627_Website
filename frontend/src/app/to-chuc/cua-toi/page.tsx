import type { Metadata } from "next";
import { Suspense } from "react";

import { MyOrganizations } from "@/features/organizations/MyOrganizations";

export const metadata: Metadata = {
  title: "Tổ chức của tôi",
  robots: { index: false },
};

export default function MyOrganizationsPage() {
  return (
    <Suspense fallback={null}>
      <MyOrganizations />
    </Suspense>
  );
}
