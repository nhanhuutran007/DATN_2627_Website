"use client";

import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import {
  createCampaignFaq,
  deleteCampaignFaq,
  FAQ_ANSWER_MAX,
  FAQ_QUESTION_MAX,
  faqDraftError,
  fetchManagedCampaignFaqs,
  MAX_FAQS,
  updateCampaignFaq,
  type CampaignFaq,
  type CampaignFaqPayload,
} from "@/lib/api/campaign-faqs";

type LoadState = "loading" | "ready" | "error";

const EMPTY: CampaignFaqPayload = { question: "", answer: "" };

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function FaqFields({ value, onChange }: { value: CampaignFaqPayload; onChange: (next: CampaignFaqPayload) => void }) {
  return (
    <div className="faq-fields">
      <label className="field">
        <span>Câu hỏi</span>
        <input
          value={value.question}
          maxLength={FAQ_QUESTION_MAX}
          placeholder="Ví dụ: Khi nào tôi nhận được quà?"
          onChange={(e) => onChange({ ...value, question: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Câu trả lời</span>
        <textarea
          rows={4}
          value={value.answer}
          maxLength={FAQ_ANSWER_MAX}
          placeholder="Trả lời ngắn gọn, rõ ràng"
          onChange={(e) => onChange({ ...value, answer: e.target.value })}
        />
        <small className="hint">{value.answer.length}/{FAQ_ANSWER_MAX}</small>
      </label>
    </div>
  );
}

/**
 * Mục FAQ trong trình quản lý dự án (như Kickstarter): chủ dự án tự nhập từng câu hỏi và câu trả lời,
 * sửa hoặc bổ sung bất kỳ lúc nào khi dự án chưa kết thúc. Hiện ở tab "Hỏi đáp" trên trang dự án.
 */
export function FaqManager({ campaignId, closed }: { campaignId: string; closed: boolean }) {
  const [faqs, setFaqs] = useState<CampaignFaq[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<CampaignFaqPayload>(EMPTY);
  const [editing, setEditing] = useState<{ id: string; draft: CampaignFaqPayload } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchManagedCampaignFaqs(campaignId)
      .then((list) => {
        if (cancelled) return;
        setFaqs(list);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reloadKey]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = faqDraftError(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy("new");
    setError("");
    try {
      const created = await createCampaignFaq(campaignId, { question: draft.question.trim(), answer: draft.answer.trim(), sortOrder: faqs.length });
      setFaqs((prev) => [...prev, created]);
      setDraft(EMPTY);
      setNotice("Đã thêm câu hỏi.");
    } catch (err) {
      setError(message(err, "Không thêm được câu hỏi."));
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const invalid = faqDraftError(editing.draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(editing.id);
    setError("");
    try {
      const updated = await updateCampaignFaq(editing.id, { question: editing.draft.question.trim(), answer: editing.draft.answer.trim() });
      setFaqs((prev) => prev.map((faq) => (faq.id === updated.id ? updated : faq)));
      setEditing(null);
      setNotice("Đã lưu câu hỏi.");
    } catch (err) {
      setError(message(err, "Không lưu được câu hỏi."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (faq: CampaignFaq) => {
    if (!window.confirm(`Xóa câu hỏi “${faq.question}”?`)) return;
    setBusy(faq.id);
    setError("");
    try {
      await deleteCampaignFaq(faq.id);
      setFaqs((prev) => prev.filter((item) => item.id !== faq.id));
      setNotice("Đã xóa câu hỏi.");
    } catch (err) {
      setError(message(err, "Không xóa được câu hỏi."));
    } finally {
      setBusy(null);
    }
  };

  /** Đổi chỗ hai câu hỏi liền nhau rồi lưu thứ tự mới. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= faqs.length) return;
    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    setFaqs(next);
    setBusy("order");
    setError("");
    try {
      await Promise.all([
        updateCampaignFaq(next[index].id, { sortOrder: index }),
        updateCampaignFaq(next[target].id, { sortOrder: target }),
      ]);
    } catch (err) {
      setError(message(err, "Không đổi được thứ tự."));
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(null);
    }
  };

  if (state === "loading") return <p className="hint" role="status">Đang tải câu hỏi thường gặp…</p>;
  if (state === "error") {
    return (
      <p className="form-error" role="alert">
        Không tải được câu hỏi thường gặp.{" "}
        <button className="link-button" type="button" onClick={() => { setState("loading"); setReloadKey((k) => k + 1); }}>Thử lại</button>
      </p>
    );
  }

  return (
    <div className="faq-manager">
      <p className="hint">
        Trả lời trước những câu người ủng hộ hay hỏi (giao quà, cách dùng tiền, tiến độ…). Câu hỏi hiện ở tab <b>Hỏi đáp</b> trên
        trang dự án; bạn sửa hoặc bổ sung được bất kỳ lúc nào khi dự án chưa kết thúc.
      </p>

      {faqs.length === 0 ? (
        <p className="hint">Chưa có câu hỏi nào.</p>
      ) : (
        <ol className="faq-manager-list">
          {faqs.map((faq, index) => (
            <li key={faq.id}>
              {editing?.id === faq.id ? (
                <form onSubmit={saveEdit}>
                  <FaqFields value={editing.draft} onChange={(next) => setEditing({ id: faq.id, draft: next })} />
                  <div className="own-actions">
                    <button className="button button-primary button-sm" type="submit" disabled={busy === faq.id}>
                      {busy === faq.id ? "Đang lưu…" : "Lưu"}
                    </button>
                    <button className="button button-ghost button-sm" type="button" onClick={() => setEditing(null)}>Hủy</button>
                  </div>
                </form>
              ) : (
                <>
                  <b>{faq.question}</b>
                  <p>{faq.answer}</p>
                  {!closed && (
                    <div className="own-actions">
                      <button className="button button-outline button-sm" type="button" onClick={() => { setEditing({ id: faq.id, draft: { question: faq.question, answer: faq.answer } }); setError(""); }}>
                        Sửa
                      </button>
                      <button className="button button-ghost button-sm" type="button" disabled={busy !== null || index === 0} onClick={() => void move(index, -1)} aria-label={`Đưa câu ${index + 1} lên trên`}>
                        ↑
                      </button>
                      <button className="button button-ghost button-sm" type="button" disabled={busy !== null || index === faqs.length - 1} onClick={() => void move(index, 1)} aria-label={`Đưa câu ${index + 1} xuống dưới`}>
                        ↓
                      </button>
                      <button className="link-danger" type="button" disabled={busy === faq.id} onClick={() => void remove(faq)}>
                        Xóa
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {closed ? (
        <p className="hint">Dự án đã kết thúc nên không thêm hoặc sửa câu hỏi được nữa.</p>
      ) : faqs.length < MAX_FAQS ? (
        <form className="faq-manager-add" onSubmit={add}>
          <p className="reward-add-title">Thêm câu hỏi</p>
          <FaqFields value={draft} onChange={(next) => { setDraft(next); setNotice(""); }} />
          <button className="button button-primary button-sm" type="submit" disabled={busy === "new"}>
            {busy === "new" ? "Đang thêm…" : "Thêm câu hỏi"}
          </button>
        </form>
      ) : (
        <p className="hint">Đã đủ {MAX_FAQS} câu hỏi.</p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
    </div>
  );
}
