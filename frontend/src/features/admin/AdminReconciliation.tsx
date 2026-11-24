"use client";

import { useState } from "react";

import { AdminFinance } from "@/features/admin/AdminFinance";
import { AdminWalletReconciliation } from "@/features/admin/AdminWalletReconciliation";

type ReconTab = "campaigns" | "wallets";

const TABS: Array<{ id: ReconTab; label: string }> = [
  { id: "campaigns", label: "Giao dịch chiến dịch" },
  { id: "wallets", label: "Ví người dùng" },
];

/** Tab mở đầu: `?tab=vi` (link trong thông báo "Phát hiện ví lệch sổ") mở thẳng phần ví. */
function initialTab(): ReconTab {
  if (typeof window === "undefined") return "campaigns";
  return new URLSearchParams(window.location.search).get("tab") === "vi" ? "wallets" : "campaigns";
}

/**
 * Mục "Đối soát" gồm hai phần trong cùng một trang: sổ giao dịch theo chiến dịch và ví người
 * dùng. Gộp chung để sidebar không thêm mục ít dùng; badge của mục đếm cả hai loại lệch.
 */
export function AdminReconciliation({
  walletMismatches,
  onChanged,
}: {
  walletMismatches: number;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<ReconTab>(initialTab);

  const select = (next: ReconTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "wallets") url.searchParams.set("tab", "vi");
    else url.searchParams.delete("tab");
    url.searchParams.delete("user");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <>
      <div className="recon-presets recon-tabs" role="tablist" aria-label="Loại đối soát">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : undefined}
            onClick={() => select(item.id)}
          >
            {item.label}
            {item.id === "wallets" && walletMismatches > 0 && (
              <span className="recon-tab-badge" title={`${walletMismatches} ví lệch sổ`}>{walletMismatches}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "campaigns" ? (
        <AdminFinance view="reconciliation" onChanged={onChanged} />
      ) : (
        <AdminWalletReconciliation onChanged={onChanged} />
      )}
    </>
  );
}
