"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { RewardTier } from "@/lib/api/rewards";

import { DonationPanel } from "./DonationPanel";

type DonateDialogButtonProps = {
  campaignId: string;
  campaignTitle: string;
  enabled?: boolean;
  rewardTiers?: RewardTier[];
  className?: string;
  label?: string;
};

/** Nút "Ủng hộ ngay" mở form ủng hộ trong hộp thoại (giữ trang chi tiết gọn). */
export function DonateDialogButton({
  campaignId,
  campaignTitle,
  enabled = true,
  rewardTiers = [],
  className = "button button-primary button-block",
  label = "Ủng hộ ngay",
}: DonateDialogButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // Đóng hộp thoại: tải lại số liệu trang (số tiền, lượt ủng hộ) từ server.
    if (!open && wasOpen.current) router.refresh();
    wasOpen.current = open;
  }, [open, router]);

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </button>
      <dialog
        ref={ref}
        className="app-dialog donate-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        // Bấm ra nền mờ = đóng (chỉ khi bấm đúng vào <dialog>, không phải nội dung).
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="donate-dialog-head">
          <p id={titleId} className="donate-dialog-title">{campaignTitle}</p>
          <button className="donate-dialog-close" type="button" aria-label="Đóng" onClick={() => setOpen(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {/* Chỉ gắn form khi mở: mỗi lần mở là một phiên ủng hộ mới. */}
        {open && (
          <DonationPanel campaignId={campaignId} campaignTitle={campaignTitle} enabled={enabled} rewardTiers={rewardTiers} />
        )}
      </dialog>
    </>
  );
}
