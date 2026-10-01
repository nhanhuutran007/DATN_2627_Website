import type { Metadata } from "next";

import { ReceiptView } from "@/features/finance/ReceiptView";

export const metadata: Metadata = {
  title: "Biên nhận ủng hộ",
  robots: { index: false, follow: false },
};

type ReceiptPageProps = { params: Promise<{ id: string }> };

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  return <ReceiptView donationId={id} />;
}
