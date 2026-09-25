"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  REPORT_REASON_LABEL,
  submitReport,
  type ReportReason,
} from "@/lib/api/reports";
import { useAuthUser } from "@/lib/auth";

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 2000;

type ReportCampaignButtonProps = {
  campaignId: string;
  campaignSlug: string;
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return "Nội dung báo cáo chưa hợp lệ. Vui lòng kiểm tra lại lý do và mô tả.";
      case 403:
        return "Bạn không thể báo cáo chiến dịch của chính mình.";
      case 404:
        return "Chiến dịch này hiện không nhận báo cáo (chưa công khai hoặc là dữ liệu mẫu).";
      case 409:
        return "Bạn đã có một báo cáo đang chờ xử lý cho chiến dịch này.";
      case 429:
        return "Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau ít phút.";
      default:
        return err.message;
    }
  }
  return "Không gửi được báo cáo. Vui lòng thử lại.";
}

export function ReportCampaignButton({ campaignId, campaignSlug }: ReportCampaignButtonProps) {
  const user = useAuthUser();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fraud");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmedLength = description.trim().length;
  const tooShort = trimmedLength < MIN_DESCRIPTION;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooShort || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({ campaignId, reason, description: description.trim() });
      setSent(true);
      setDescription("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="button button-outline report-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="shield" size={17} /> Báo cáo vi phạm
      </button>

      {open && (
        <div className="report-panel" id={panelId}>
          {!user ? (
            <p>
              Bạn cần <Link href={`/dang-nhap?next=/du-an/${encodeURIComponent(campaignSlug)}`}>đăng nhập</Link> để gửi
              báo cáo vi phạm.
            </p>
          ) : sent ? (
            <div role="status">
              <p className="report-success"><Icon name="check" size={16} /> Đã gửi báo cáo. Quản trị viên sẽ xem xét và quyết định; chiến dịch không bị ẩn tự động.</p>
              <button className="button button-outline" type="button" onClick={() => { setSent(false); setOpen(false); }}>
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label className="form-field">
                <span>Lý do</span>
                <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
                  {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((value) => (
                    <option key={value} value={value}>{REPORT_REASON_LABEL[value]}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Mô tả chi tiết</span>
                <textarea
                  rows={4}
                  maxLength={MAX_DESCRIPTION}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Nêu rõ điều bạn thấy chưa đúng, kèm đường dẫn/bằng chứng nếu có."
                  aria-invalid={description.length > 0 && tooShort}
                  required
                />
                <small>{trimmedLength}/{MAX_DESCRIPTION} ký tự (tối thiểu {MIN_DESCRIPTION})</small>
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="report-actions">
                <button className="button button-primary" type="submit" disabled={tooShort || submitting}>
                  {submitting ? "Đang gửi…" : "Gửi báo cáo"}
                </button>
                <button className="button button-outline" type="button" onClick={() => setOpen(false)}>
                  Huỷ
                </button>
              </div>
              <p className="report-note">Báo cáo chỉ gửi tới quản trị viên, không hiển thị công khai. Vui lòng không báo cáo sai sự thật.</p>
            </form>
          )}
        </div>
      )}
    </>
  );
}
