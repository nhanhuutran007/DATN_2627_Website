"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { fetchSupportContact, updateSupportContact, type SupportContact } from "@/lib/api/support";

type Draft = Omit<SupportContact, "updatedAt">;

const EMPTY: Draft = { email: "", phone: "", address: "", workingHours: "", socialUrl: "", note: "" };

const toDraft = (contact: SupportContact): Draft => ({
  email: contact.email,
  phone: contact.phone,
  address: contact.address,
  workingHours: contact.workingHours,
  socialUrl: contact.socialUrl,
  note: contact.note,
});

/** Admin cập nhật thông tin liên hệ hỗ trợ hiển thị ở /lien-he, header, footer và chính sách quyền riêng tư. */
export function SupportContactManager() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchSupportContact()
      .then((contact) => {
        if (!active) return;
        setDraft(toDraft(contact));
        setUpdatedAt(contact.updatedAt);
      })
      .catch((err: unknown) => active && setError(err instanceof ApiError ? err.message : "Không tải được thông tin liên hệ."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const set = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateSupportContact(draft);
      setDraft(toDraft(saved));
      setUpdatedAt(saved.updatedAt);
      setNotice("Đã lưu. Thông tin mới hiển thị ngay ở trang Liên hệ hỗ trợ.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card admin-table-card" id="lien-he">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Hệ thống</p>
          <h2>Thông tin liên hệ hỗ trợ</h2>
          {updatedAt && <p className="backup-last">Cập nhật lần cuối {new Date(updatedAt).toLocaleString("vi-VN")}</p>}
        </div>
        <Link className="button button-outline button-sm" href="/lien-he" target="_blank">
          Xem trang công khai
        </Link>
      </div>
      {loading ? (
        <p className="hint">Đang tải…</p>
      ) : (
        <form className="support-form" onSubmit={save} noValidate>
          <label className="field">
            <span>Email hỗ trợ</span>
            <input type="email" value={draft.email} maxLength={120} placeholder="hotro@gopmam.com" onChange={(e) => set("email", e.target.value)} />
          </label>
          <label className="field">
            <span>Số điện thoại / hotline</span>
            <input value={draft.phone} maxLength={20} inputMode="tel" onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="field support-form-wide">
            <span>Địa chỉ</span>
            <input value={draft.address} maxLength={300} onChange={(e) => set("address", e.target.value)} />
          </label>
          <label className="field">
            <span>Giờ làm việc</span>
            <input value={draft.workingHours} maxLength={120} placeholder="8:00–17:00, thứ Hai đến thứ Sáu" onChange={(e) => set("workingHours", e.target.value)} />
          </label>
          <label className="field">
            <span>Trang Facebook/Zalo (https://…)</span>
            <input type="url" value={draft.socialUrl} maxLength={255} onChange={(e) => set("socialUrl", e.target.value)} />
          </label>
          <label className="field support-form-wide">
            <span>Ghi chú cho người dùng</span>
            <textarea rows={3} value={draft.note} maxLength={500} placeholder="Ví dụ: thời gian phản hồi, cách gửi yêu cầu khóa/xóa tài khoản…" onChange={(e) => set("note", e.target.value)} />
          </label>
          <div className="support-form-wide support-form-actions">
            <button className="button button-primary button-sm" type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu thông tin liên hệ"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
    </section>
  );
}
