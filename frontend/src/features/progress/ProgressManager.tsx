"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { ImageUploader } from "@/features/media/ImageUploader";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import type { ApiMilestone } from "@/lib/api/campaigns";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile } from "@/lib/api/media";
import {
  CHANGE_REASON_MIN,
  MAX_RECEIPTS_PER_UPDATE,
  MILESTONE_STATE_LABEL,
  MILESTONE_STATE_TONE,
  addMilestoneUpdate,
  completeMilestone,
  fetchCampaignMilestones,
  fetchCampaignProgress,
  updateMilestone,
  type CampaignProgress,
  type MilestoneState,
} from "@/lib/api/progress";
import { formatDay, formatVnd } from "@/lib/format";

import { ProgressTimeline } from "./ProgressTimeline";

type Receipt = { mediaId: string; url: string; caption: string };

type Loaded = { milestones: ApiMilestone[]; progress: CampaignProgress };

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Loaded };

const CONTENT_MIN = 10;
const CONTENT_MAX = 5000;

function errorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 413) return "Ảnh tối đa 5 MB.";
    if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    return error.message;
  }
  return fallback;
}

type ProgressManagerProps = {
  campaignId: string;
  /** Chiến dịch thất bại/bị hủy: chỉ xem nhật ký, không đăng thêm. */
  readOnly?: boolean;
};

/** Chủ dự án báo cáo tiến độ: đánh dấu mốc hoàn thành, đăng cập nhật kèm khoản chi và chứng từ. */
export function ProgressManager({ campaignId, readOnly = false }: ProgressManagerProps) {
  const dialog = useDialog();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyMilestone, setBusyMilestone] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [requestKey, setRequestKey] = useState(0);
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCampaignMilestones(campaignId), fetchCampaignProgress(campaignId)])
      .then(([milestones, progress]) => {
        if (active) setState({ status: "ready", data: { milestones: milestones.items, progress } });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: errorText(error, "Không tải được tiến độ.") });
      });
    return () => {
      active = false;
    };
  }, [campaignId, requestKey]);

  const reload = () => setRequestKey((key) => key + 1);

  const complete = async (milestone: ApiMilestone) => {
    const ok = await dialog.confirm({
      title: "Đánh dấu mốc hoàn thành?",
      message: <>Người ủng hộ và người theo dõi sẽ nhận thông báo mốc <b>{milestone.title}</b> đã hoàn thành.</>,
      confirmLabel: "Đánh dấu hoàn thành",
    });
    if (!ok) return;
    setBusyMilestone(milestone.id);
    setNotice(null);
    try {
      await completeMilestone(milestone.id);
      reload();
      setNotice({ tone: "ok", text: `Đã đánh dấu “${milestone.title}” hoàn thành.` });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, "Không cập nhật được mốc.") });
    } finally {
      setBusyMilestone(null);
    }
  };

  const onRescheduled = (title: string) => {
    setRescheduling(null);
    reload();
    setNotice({ tone: "ok", text: `Đã đổi kế hoạch mốc “${title}”. Lý do được công khai và người ủng hộ nhận thông báo.` });
  };

  const onPosted = () => {
    reload();
    setTimelineKey((key) => key + 1);
    setNotice({ tone: "ok", text: "Đã đăng cập nhật. Người ủng hộ và người theo dõi sẽ nhận thông báo." });
  };

  if (state.status === "loading") return <div className="progress-manager"><p className="hint" role="status">Đang tải tiến độ…</p></div>;
  if (state.status === "error") {
    return (
      <div className="progress-manager">
        <p className="form-error" role="alert">
          {state.message}{" "}
          <button className="link-inline" type="button" onClick={() => { setState({ status: "loading" }); reload(); }}>Thử lại</button>
        </p>
      </div>
    );
  }

  const { milestones, progress } = state.data;
  const remaining = Math.max(0, progress.totalRaised - progress.totalExpense);
  const stateById = new Map<string, MilestoneState>(progress.milestoneStates.map((item) => [item.id, item.state]));
  const lateCount = progress.milestoneStates.filter((item) => item.state === "overdue").length;

  return (
    <div className="progress-manager">
      <dl className="stats-tiles">
        <div><dt>Mốc hoàn thành</dt><dd className="num">{progress.completedMilestones}/{progress.totalMilestones}</dd></div>
        <div><dt>Đã huy động</dt><dd className="num">{formatVnd(progress.totalRaised)}</dd></div>
        <div><dt>Đã báo cáo chi</dt><dd className="num">{formatVnd(progress.totalExpense)}</dd></div>
        <div><dt>Chưa giải trình</dt><dd className="num">{formatVnd(remaining)}</dd></div>
      </dl>

      {notice && (
        <p className={notice.tone === "ok" ? "form-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>
          {notice.text}
        </p>
      )}

      {lateCount > 0 && !readOnly && (
        <p className="progress-alert" role="status">
          <Icon name="clock" size={16} /> {lateCount} mốc đã quá hạn mà chưa có giải trình — trang dự án đang hiển thị{" "}
          <b>Chậm tiến độ</b>. Hãy đăng cập nhật cho mốc đó (nêu lý do và kế hoạch mới) hoặc đổi hạn kèm lý do.
        </p>
      )}

      {milestones.length === 0 ? (
        <p className="hint">Chiến dịch chưa có mốc công việc nên chưa thể báo cáo tiến độ.</p>
      ) : (
        <>
          <ul className="milestone-checklist">
            {milestones.map((milestone) => {
              const milestoneState = stateById.get(milestone.id) ?? (milestone.isCompleted ? "completed" : "on_track");
              return (
                <li key={milestone.id}>
                  <span className={`milestone-dot ${milestone.isCompleted ? "done" : ""}`} aria-hidden="true">
                    {milestone.isCompleted && <Icon name="check" size={12} />}
                  </span>
                  <span className="milestone-name">
                    <b>{milestone.title}</b>
                    <small>
                      {milestone.targetDate ? `Hạn ${formatDay(milestone.targetDate)}` : "Chưa đặt hạn"}
                      {milestone.budget ? ` · Ngân sách ${formatVnd(Number(milestone.budget))}` : ""}
                    </small>
                  </span>
                  <span className={`tag ${MILESTONE_STATE_TONE[milestoneState]}`}>{MILESTONE_STATE_LABEL[milestoneState]}</span>
                  {!milestone.isCompleted && !readOnly && (
                    <span className="milestone-actions">
                      <button
                        className="button button-ghost button-sm"
                        type="button"
                        aria-expanded={rescheduling === milestone.id}
                        onClick={() => setRescheduling((id) => (id === milestone.id ? null : milestone.id))}
                      >
                        Đổi hạn
                      </button>
                      <button className="button button-ghost button-sm" type="button" disabled={busyMilestone === milestone.id} onClick={() => complete(milestone)}>
                        Hoàn thành
                      </button>
                    </span>
                  )}
                  {rescheduling === milestone.id && (
                    <RescheduleForm milestone={milestone} onDone={() => onRescheduled(milestone.title)} onCancel={() => setRescheduling(null)} />
                  )}
                </li>
              );
            })}
          </ul>

          {readOnly ? (
            <p className="hint">Chiến dịch đã kết thúc không thành công nên không đăng thêm cập nhật.</p>
          ) : (
            <UpdateForm milestones={milestones} states={stateById} remaining={remaining} onPosted={onPosted} />
          )}
        </>
      )}

      <div className="progress-manager-timeline">
        <h3>Đã đăng</h3>
        <ProgressTimeline key={timelineKey} campaignId={campaignId} />
      </div>
    </div>
  );
}

/** `yyyy-mm-dd` theo giờ máy người dùng, cho `<input type="date">`. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type RescheduleFormProps = {
  milestone: ApiMilestone;
  onDone: () => void;
  onCancel: () => void;
};

/** Đổi hạn/ngân sách một mốc sau khi phát hành — lý do bắt buộc và được công khai. */
function RescheduleForm({ milestone, onDone, onCancel }: RescheduleFormProps) {
  const id = useId();
  const [date, setDate] = useState(toDateInput(milestone.targetDate));
  const [budgetText, setBudgetText] = useState(milestone.budget ? String(Math.round(Number(milestone.budget))) : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const budget = Number(budgetText.replace(/\D/g, "")) || 0;
  const today = toDateInput(new Date().toISOString());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!date) return setError("Chọn hạn mới.");
    if (date < today) return setError("Hạn mới không được ở trong quá khứ.");
    if (reason.trim().length < CHANGE_REASON_MIN) return setError(`Lý do cần ít nhất ${CHANGE_REASON_MIN} ký tự.`);
    setBusy(true);
    setError("");
    try {
      await updateMilestone(milestone.id, {
        // Cuối ngày theo giờ Việt Nam: mốc chỉ tính quá hạn khi đã hết ngày hạn.
        targetDate: `${date}T23:59:59+07:00`,
        ...(budget > 0 ? { budget } : {}),
        changeReason: reason.trim(),
      });
      onDone();
    } catch (err) {
      setError(errorText(err, "Không đổi được kế hoạch. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="reschedule-form" onSubmit={submit} noValidate>
      <div className="progress-form-row">
        <label className="field">
          <span>Hạn mới</span>
          <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Ngân sách (₫)</span>
          <input inputMode="numeric" value={budget > 0 ? budget.toLocaleString("vi-VN") : ""} onChange={(event) => setBudgetText(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Lý do thay đổi (công khai)</span>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Vd. Nhà cung cấp giao vật tư chậm 2 tuần do mưa lũ"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-describedby={`${id}-reason-hint`}
        />
        <small id={`${id}-reason-hint`}>Người ủng hộ và người theo dõi sẽ nhận thông báo kèm lý do; thay đổi được lưu vào lịch sử kế hoạch.</small>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="progress-form-actions">
        <button className="button button-ghost button-sm" type="button" onClick={onCancel} disabled={busy}>Hủy</button>
        <button className="button button-primary button-sm" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </div>
    </form>
  );
}

type UpdateFormProps = {
  milestones: ApiMilestone[];
  states: Map<string, MilestoneState>;
  remaining: number;
  onPosted: () => void;
};

function UpdateForm({ milestones, states, remaining, onPosted }: UpdateFormProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  // Ưu tiên mốc đang chậm chưa giải trình, sau đó mốc chưa hoàn thành đầu tiên.
  const firstOpen =
    milestones.find((milestone) => states.get(milestone.id) === "overdue") ??
    milestones.find((milestone) => !milestone.isCompleted) ??
    milestones[0];
  const [milestoneId, setMilestoneId] = useState(firstOpen.id);
  const [content, setContent] = useState("");
  const [expenseText, setExpenseText] = useState("");
  const [photo, setPhoto] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expense = Number(expenseText.replace(/\D/g, "")) || 0;
  const length = content.trim().length;

  const pickReceipts = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const room = MAX_RECEIPTS_PER_UPDATE - receipts.length;
    if (files.length > room) {
      setError(`Mỗi cập nhật tối đa ${MAX_RECEIPTS_PER_UPDATE} chứng từ.`);
      return;
    }
    const invalid = files.map(validateImageFile).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadImage(file, "expense_receipt")));
      setReceipts((current) => [...current, ...uploaded.map((item) => ({ mediaId: item.id, url: item.url, caption: "" }))]);
    } catch (err) {
      setError(errorText(err, "Không tải được chứng từ. Kiểm tra kết nối rồi thử lại."));
    } finally {
      setUploading(false);
    }
  };

  const validate = (): string | null => {
    if (length < CONTENT_MIN) return `Nội dung cập nhật cần ít nhất ${CONTENT_MIN} ký tự.`;
    if (length > CONTENT_MAX) return `Nội dung tối đa ${CONTENT_MAX.toLocaleString("vi-VN")} ký tự.`;
    if (expense > 0 && receipts.length === 0) return "Khoản chi cần kèm ít nhất một ảnh chứng từ (hóa đơn, biên lai).";
    if (expense > remaining) return `Khoản chi vượt số tiền chưa giải trình (${formatVnd(remaining)}).`;
    return null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || uploading) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addMilestoneUpdate(milestoneId, {
        content: content.trim(),
        ...(photo ? { imageUrl: photo } : {}),
        ...(expense > 0 ? { expenseAmount: expense } : {}),
        ...(receipts.length > 0
          ? { receipts: receipts.map((receipt) => ({ mediaId: receipt.mediaId, ...(receipt.caption.trim() ? { caption: receipt.caption.trim() } : {}) })) }
          : {}),
      });
      setContent("");
      setExpenseText("");
      setPhoto("");
      setReceipts([]);
      onPosted();
    } catch (err) {
      setError(errorText(err, "Không đăng được cập nhật. Vui lòng thử lại."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="progress-form" onSubmit={submit} noValidate>
      <h3>Đăng cập nhật tiến độ</h3>
      <div className="progress-form-row">
        <label className="field">
          <span>Mốc công việc</span>
          <select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}{milestone.isCompleted ? " (đã hoàn thành)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Khoản chi trong đợt này (₫)</span>
          <input
            inputMode="numeric"
            placeholder="0 nếu chỉ cập nhật tiến độ"
            value={expense > 0 ? expense.toLocaleString("vi-VN") : ""}
            onChange={(event) => setExpenseText(event.target.value)}
            aria-describedby={`${id}-expense-hint`}
          />
          <small id={`${id}-expense-hint`}>Còn {formatVnd(remaining)} chưa giải trình. Có khoản chi thì phải kèm chứng từ.</small>
        </label>
      </div>

      <label className="field">
        <span>Nội dung</span>
        <textarea
          rows={4}
          maxLength={CONTENT_MAX}
          placeholder="Đã làm được gì, tiền được chi vào việc gì, bước tiếp theo…"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <small>{length.toLocaleString("vi-VN")}/{CONTENT_MAX.toLocaleString("vi-VN")} ký tự</small>
      </label>

      <ImageUploader label="Ảnh hiện trường (tùy chọn)" value={photo} onChange={setPhoto} purpose="progress_image" disabled={busy} />

      <fieldset className="expense-receipt-field">
        <legend>Chứng từ chi tiêu {expense > 0 && <span className="required-mark">*</span>}</legend>
        {receipts.length > 0 && (
          <ul className="expense-receipt-edit">
            {receipts.map((receipt, index) => (
              <li key={receipt.mediaId}>
                <span className="expense-thumb">
                  <Image src={resolveMediaUrl(receipt.url)} alt={`Chứng từ ${index + 1}`} fill sizes="72px" unoptimized />
                </span>
                <input
                  aria-label={`Ghi chú chứng từ ${index + 1}`}
                  placeholder="Vd. Hóa đơn mua sách, phiếu chi số 12"
                  maxLength={200}
                  value={receipt.caption}
                  onChange={(event) => setReceipts((current) => current.map((item) => (item.mediaId === receipt.mediaId ? { ...item, caption: event.target.value } : item)))}
                />
                <button
                  className="button button-ghost button-sm"
                  type="button"
                  aria-label={`Bỏ chứng từ ${index + 1}`}
                  onClick={() => setReceipts((current) => current.filter((item) => item.mediaId !== receipt.mediaId))}
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {receipts.length < MAX_RECEIPTS_PER_UPDATE && (
          <button className="button button-outline button-sm" type="button" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={16} /> {uploading ? "Đang tải chứng từ…" : "Thêm ảnh chứng từ"}
          </button>
        )}
        <small>Ảnh hóa đơn, biên lai, phiếu chi (JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh, {MAX_RECEIPTS_PER_UPDATE} ảnh mỗi cập nhật). Che thông tin cá nhân không liên quan trước khi tải lên.</small>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          tabIndex={-1}
          aria-hidden="true"
          onChange={pickReceipts}
        />
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="progress-form-actions">
        <button className="button button-primary" type="submit" disabled={busy || uploading}>
          {busy ? "Đang đăng…" : "Đăng cập nhật"}
        </button>
      </div>
    </form>
  );
}
