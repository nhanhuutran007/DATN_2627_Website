"use client";

import { useEffect, useRef, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { fetchPledgeSuspects, voidSuspectPledges, type PledgeIntegrity, type PledgeSuspectSignal } from "@/lib/api/admin";
import { formatDateTime, formatVnd } from "@/lib/format";

const SIGNAL_LABEL: Record<PledgeSuspectSignal, string> = {
  shared_ip_owner: "Chung IP với chủ dự án",
  same_bank_owner: "Trùng tài khoản ngân hàng với chủ dự án",
  shared_ip_group: "Chung IP với nhiều người cam kết khác",
  new_account: "Tài khoản tạo dưới 7 ngày trước khi cam kết",
  single_campaign: "Chưa ủng hộ dự án nào khác",
  burst: "Cam kết trong đợt dồn dập",
  unpaid: "Đã bỏ cam kết không thanh toán",
};

const STRONG: PledgeSuspectSignal[] = ["shared_ip_owner", "same_bank_owner"];

const STATUS_LABEL = { open: "Đang cam kết", expired: "Đã bỏ (hết hạn)", paid: "Đã thanh toán" } as const;

type Props = {
  campaignId: string;
  campaignTitle: string;
  onClose: () => void;
  onViewUser: (userId: string) => void;
  onChanged: () => void;
};

/**
 * Danh sách tài khoản nghi là clone cam kết thổi phồng một chiến dịch, kèm dấu hiệu của từng
 * tài khoản. Admin tự quyết: hủy cam kết chưa trả của các tài khoản đã chọn, có thể khóa luôn.
 */
export function PledgeSuspectsDialog({ campaignId, campaignTitle, onClose, onViewUser, onChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const dialog = useDialog();
  const [data, setData] = useState<PledgeIntegrity | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    fetchPledgeSuspects(campaignId)
      .then((loaded) => {
        if (!active) return;
        setError("");
        setData(loaded);
        // Chọn sẵn tài khoản có tín hiệu mạnh và còn cam kết để hủy.
        setSelected(new Set(loaded.suspects.filter((s) => s.openPledges > 0 && s.signals.some((x) => STRONG.includes(x))).map((s) => s.userId)));
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Không tải được danh sách."));
    return () => {
      active = false;
    };
  }, [campaignId, reloadKey]);

  const toggle = (userId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  async function handleVoid() {
    if (selected.size === 0) return;
    const result = await dialog.prompt({
      title: `Hủy cam kết của ${selected.size} tài khoản`,
      message: (
        <>
          Các cam kết <b>chưa thanh toán</b> của những tài khoản đã chọn cho “{campaignTitle}” sẽ bị hủy và trừ khỏi tiến độ. Khoản
          đã thanh toán không bị ảnh hưởng. Cần nhập mã xác minh gửi qua email.
        </>
      ),
      label: "Lý do (lưu nhật ký kiểm toán)",
      placeholder: "VD: Cùng IP và tạo cùng ngày với chủ dự án, không thanh toán…",
      minLength: 5,
      maxLength: 500,
      checkbox: { label: "Khóa luôn các tài khoản này", hint: "Thu hồi phiên đăng nhập; mở khóa được ở trang người dùng." },
      confirmLabel: "Hủy cam kết",
      tone: "danger",
    });
    if (!result) return;
    setBusy(true);
    setMessage(null);
    try {
      const done = await voidSuspectPledges(campaignId, { userIds: [...selected], lockAccounts: result.checked, reason: result.value });
      setMessage({
        tone: "ok",
        text: `Đã hủy ${done.cancelled} cam kết (${formatVnd(done.amount)})${result.checked ? `, khóa ${done.locked} tài khoản` : ""}.`,
      });
      onChanged();
      setReloadKey((key) => key + 1);
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Không hủy được cam kết." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="app-dialog review-dialog user-detail-dialog"
      aria-labelledby="pledge-suspects-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="review-head">
        <div>
          <p className="eyebrow">Tài khoản nghi vấn</p>
          <h2 id="pledge-suspects-title">{campaignTitle}</h2>
        </div>
        <button className="review-close" type="button" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </header>

      <div className="review-body">
        {error && <p className="form-error" role="alert">{error}</p>}
        {!data && !error && <p className="hint">Đang phân tích…</p>}
        {data && (
          <>
            <p className="hint">
              {data.features.integrity_backer_count ?? 0} người cam kết · {data.suspects.length} tài khoản có dấu hiệu bất thường. Đây là
              gợi ý để kiểm tra, không phải kết luận: người nhà hay bạn bè ủng hộ chung wifi cũng có thể trùng IP.
            </p>
            {data.reasons.length > 0 && (
              <ul className="review-tiers">
                {data.reasons.map((reason) => (
                  <li key={reason.group}>{reason.label}</li>
                ))}
              </ul>
            )}
            {data.suspects.length === 0 ? (
              <p className="table-muted">Không có tài khoản nào đủ dấu hiệu nghi vấn.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col"><span className="sr-only">Chọn</span></th>
                      <th scope="col">Tài khoản</th>
                      <th scope="col">Cam kết</th>
                      <th scope="col">Dấu hiệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.suspects.map((suspect) => (
                      <tr key={suspect.userId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${suspect.name}`}
                            disabled={suspect.openPledges === 0}
                            checked={selected.has(suspect.userId)}
                            onChange={() => toggle(suspect.userId)}
                          />
                        </td>
                        <td>
                          <button className="link-inline" type="button" onClick={() => onViewUser(suspect.userId)}>{suspect.name}</button>
                          <small className="table-muted"> {suspect.email}</small>
                          <br />
                          <small className="table-muted">Tạo {formatDateTime(suspect.accountCreatedAt)}</small>
                        </td>
                        <td>
                          {formatVnd(suspect.amount)}
                          <br />
                          <small className="table-muted">{STATUS_LABEL[suspect.status]} · {formatDateTime(suspect.firstPledgeAt)}</small>
                        </td>
                        <td>
                          {suspect.signals.map((signal) => (
                            <span key={signal} className={`tag ${STRONG.includes(signal) ? "tag-red" : "tag-amber"}`}>
                              {SIGNAL_LABEL[signal]}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {message && (
              <p className={message.tone === "ok" ? "form-notice" : "form-error"} role={message.tone === "ok" ? "status" : "alert"}>
                {message.text}
              </p>
            )}
            <div className="admin-actions">
              <button type="button" disabled={busy || selected.size === 0} onClick={() => void handleVoid()}>
                {busy ? "Đang xử lý…" : `Hủy cam kết đã chọn (${selected.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
