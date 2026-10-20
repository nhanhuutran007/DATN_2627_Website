"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "@/lib/api";
import type { RefundBankAccount } from "@/lib/api/finance";
import { uploadImage, validateImageFile } from "@/lib/api/media";

export type ManualRefundOptions = {
  title: string;
  /** Số tiền đã định dạng, vd. "300.000 ₫". */
  amount: string;
  /** Nhãn ô ghi chú/lý do (lưu nhật ký và gửi người ủng hộ). */
  notesLabel: string;
  confirmLabel: string;
  /** Tài khoản nhận do người ủng hộ khai; null với hoàn trực tiếp không qua yêu cầu. */
  bank?: RefundBankAccount | null;
  /** Mã nội dung chuyển khoản của khoản ủng hộ gốc, để admin đối chiếu. */
  transferCode?: string | null;
};

export type ManualRefundResult = { notes: string; transferReference: string; proofMediaId?: string };

type Pending = { id: number; options: ManualRefundOptions; resolve: (result: ManualRefundResult | null) => void };

const REFERENCE_PATTERN = /^[A-Za-z0-9._/ -]{4,100}$/;

/**
 * Hộp thoại hoàn tiền thủ công cho khoản qua SePay (SePay không có API hoàn tiền): admin chuyển khoản
 * trả lại trước, rồi nhập mã giao dịch chuyển khoản thật và (tùy chọn) ảnh chứng từ.
 * Trả về `[phần tử cần render, hàm mở hộp thoại]`.
 */
export function useManualRefundDialog(): [ReactNode, (options: ManualRefundOptions) => Promise<ManualRefundResult | null>] {
  const [pending, setPending] = useState<Pending | null>(null);
  const sequence = useRef(0);
  const open = useCallback(
    (options: ManualRefundOptions) =>
      new Promise<ManualRefundResult | null>((resolve) => {
        sequence.current += 1;
        setPending({ id: sequence.current, options, resolve });
      }),
    [],
  );
  const element = pending ? (
    <ManualRefundView key={pending.id} pending={pending} onDone={() => setPending(null)} />
  ) : null;
  return [element, open];
}

function ManualRefundView({ pending, onDone }: { pending: Pending; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const settled = useRef(false);
  const id = useId();
  const { options } = pending;
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const finish = useCallback(
    (result: ManualRefundResult | null) => {
      if (settled.current) return;
      settled.current = true;
      pending.resolve(result);
      ref.current?.close();
      onDone();
    },
    [pending, onDone],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      finish(null);
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [finish]);

  const pickProof = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, "refund_proof");
      setProof({ id: uploaded.id, name: file.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được ảnh chứng từ.");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReference = reference.trim();
    if (!REFERENCE_PATTERN.test(trimmedReference)) {
      setError("Nhập mã giao dịch chuyển khoản hoàn (4–100 ký tự: chữ, số và . _ / -).");
      return;
    }
    if (notes.trim().length < 5) {
      setError("Ghi chú cần tối thiểu 5 ký tự.");
      return;
    }
    finish({ notes: notes.trim(), transferReference: trimmedReference, proofMediaId: proof?.id });
  };

  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={`${id}-title`}
      onClick={(event) => {
        if (event.target === event.currentTarget) finish(null);
      }}
    >
      <form className="app-dialog-body" onSubmit={submit} noValidate>
        <h2 id={`${id}-title`} className="app-dialog-title">{options.title}</h2>
        <div className="app-dialog-message">
          <p>
            Khoản ủng hộ qua SePay không hoàn được qua cổng thanh toán. Hãy <b>chuyển khoản trả {options.amount}</b> cho người
            ủng hộ trước, rồi nhập mã giao dịch chuyển khoản để ghi nhận <b>Hoàn thủ công qua chuyển khoản</b>. Số tiền của
            chiến dịch sẽ giảm tương ứng; thao tác không hoàn tác được.
          </p>
        </div>

        {options.bank ? (
          <dl className="manual-refund-bank">
            <div><dt>Ngân hàng</dt><dd>{options.bank.bankName}</dd></div>
            <div><dt>Số tài khoản</dt><dd className="mono">{options.bank.bankAccountNumber}</dd></div>
            <div><dt>Chủ tài khoản</dt><dd>{options.bank.bankAccountName}</dd></div>
            <div><dt>Số tiền</dt><dd className="num">{options.amount}</dd></div>
            {options.transferCode && <div><dt>Mã ủng hộ gốc</dt><dd className="mono">{options.transferCode}</dd></div>}
          </dl>
        ) : (
          <p className="hint">Người ủng hộ chưa khai tài khoản nhận hoàn — liên hệ họ để lấy thông tin trước khi chuyển khoản.</p>
        )}

        <label className="field">
          <span>Mã giao dịch chuyển khoản hoàn</span>
          <input
            className="mono"
            maxLength={100}
            autoComplete="off"
            placeholder="Vd. FT26293012345678"
            value={reference}
            autoFocus
            onChange={(event) => {
              setReference(event.target.value);
              if (error) setError("");
            }}
          />
        </label>

        <label className="field">
          <span>{options.notesLabel}</span>
          <textarea
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              if (error) setError("");
            }}
          />
        </label>

        <label className="field">
          <span>Ảnh chứng từ chuyển khoản (không bắt buộc)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(event) => void pickProof(event.target.files?.[0])}
          />
          <small className="app-dialog-count">
            {uploading ? "Đang tải ảnh…" : proof ? `Đã tải: ${proof.name}` : "JPEG, PNG hoặc WebP, tối đa 5 MB"}
          </small>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="app-dialog-actions">
          <button className="button button-outline" type="button" onClick={() => finish(null)}>Hủy</button>
          <button className="button button-danger" type="submit" disabled={uploading}>{options.confirmLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
