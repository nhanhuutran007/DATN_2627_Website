"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { RISK_LEVEL_LABEL } from "@/features/admin/labels";
import type { AdminDonation } from "@/lib/api/admin";
import { paymentMethodLabel } from "@/lib/format";

const money = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

const RISK_SOURCE_LABEL: Record<NonNullable<AdminDonation["riskSource"]>, string> = {
  campaign: "chiến dịch",
  user: "người ủng hộ",
  both: "chiến dịch và người ủng hộ",
};

type Props = {
  donation: AdminDonation;
  statusLabel: string;
  /** Thao tác (hoàn tiền, đối soát…) do trang quản trị cung cấp. */
  actions: ReactNode;
  onClose: () => void;
};

/** Mã (giao dịch, chuyển khoản) hiện đầy đủ kèm nút sao chép để đối soát với ngân hàng. */
export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard: mã vẫn hiện đầy đủ để chép tay
    }
  };

  return (
    <span className="tx-code">
      <code>{value}</code>
      <button type="button" className="tx-copy" title={copied ? "Đã sao chép" : "Sao chép"} onClick={() => void copy()}>
        <Icon name={copied ? "check" : "copy"} size={14} />
        <span className="sr-only">{copied ? "Đã sao chép" : "Sao chép"}</span>
      </button>
    </span>
  );
}

/** Toàn bộ thông tin một giao dịch; thao tác tài chính chỉ nằm ở đây để tránh bấm nhầm ngoài bảng. */
export function DonationDetailDialog({ donation, statusLabel, actions, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="app-dialog review-dialog"
      aria-labelledby="donation-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="review-head">
        <div>
          <p className="eyebrow">Chi tiết giao dịch</p>
          <h2 id="donation-detail-title">{money(donation.amount)}</h2>
        </div>
        <button className="review-close" type="button" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </header>

      <div className="review-body">
        <dl className="review-facts">
          <div>
            <dt>Người ủng hộ</dt>
            <dd>
              {donation.user?.name ?? "Người ủng hộ"}
              {donation.isAnonymous && <small>Hiển thị công khai: Ẩn danh</small>}
              {donation.user?.email && <small>{donation.user.email}</small>}
            </dd>
          </div>
          <div>
            <dt>Chiến dịch</dt>
            <dd>
              {donation.campaign ? (
                <a href={`/du-an/${donation.campaign.id}`} target="_blank" rel="noreferrer">{donation.campaign.title}</a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div><dt>Trạng thái</dt><dd>{statusLabel}</dd></div>
          <div><dt>Phương thức</dt><dd>{paymentMethodLabel(donation.paymentMethod)}</dd></div>
          <div>
            <dt>Mã giao dịch</dt>
            <dd>
              {donation.transactionId ? <CopyableCode value={donation.transactionId} /> : "—"}
            </dd>
          </div>
          {donation.transferCode && <div><dt>Nội dung chuyển khoản</dt><dd><CopyableCode value={donation.transferCode} /></dd></div>}
          <div><dt>Tạo lúc</dt><dd>{dateTime(donation.createdAt)}</dd></div>
          <div><dt>Hoàn tất lúc</dt><dd>{dateTime(donation.completedAt)}</dd></div>
          <div>
            <dt>Rủi ro</dt>
            <dd>
              {donation.riskLevel ? (
                <>
                  <span className={`risk-level ${donation.riskLevel}`}>{RISK_LEVEL_LABEL[donation.riskLevel]}</span>
                  {donation.riskSource && <small>Cảnh báo đang mở của {RISK_SOURCE_LABEL[donation.riskSource]}</small>}
                </>
              ) : (
                "Không có cảnh báo"
              )}
            </dd>
          </div>
        </dl>

        {donation.message && (
          <section>
            <h3>Lời nhắn</h3>
            <p className="report-quote">{donation.message}</p>
          </section>
        )}
      </div>

      <footer className="review-foot">
        <span />
        {actions}
      </footer>
    </dialog>
  );
}
