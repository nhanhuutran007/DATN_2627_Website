import type { Metadata } from "next";
import { Suspense } from "react";

import { WalletPage } from "@/features/wallet/WalletPage";

export const metadata: Metadata = {
  title: "Ví Góp Mầm",
  robots: { index: false },
};

export default function WalletRoute() {
  return (
    <Suspense fallback={null}>
      <WalletPage />
    </Suspense>
  );
}
