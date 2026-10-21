"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import {
  ApiError,
  getStoredUser,
  requestStepUpCode,
  setStepUpHandler,
  verifyStepUpCode,
  type StepUpResult,
} from "@/lib/api";

const ACTION_LABELS: Record<string, string> = {
  change_password: "đổi mật khẩu",
  refund_request: "gửi yêu cầu hoàn tiền",
  admin_refund: "xử lý hoàn tiền",
};

const RESEND_SECONDS = 60;

/** Kết quả gửi mã: còn bao lâu mới được gửi lại, hoặc lỗi để hiện trong hộp. */
type SendOutcome = { cooldown: number; error: string };

type Pending = {
  id: number;
  purpose: string;
  firstSend: SendOutcome;
  resolve: (result: StepUpResult | null) => void;
};

async function sendCode(purpose: string): Promise<SendOutcome> {
  try {
    await requestStepUpCode(purpose);
    return { cooldown: RESEND_SECONDS, error: "" };
  } catch (err) {
    // 429 = mã vừa gửi trong 1 phút trước vẫn còn dùng được.
    if (err instanceof ApiError && err.status === 429) return { cooldown: RESEND_SECONDS, error: "" };
    return { cooldown: 0, error: err instanceof Error ? err.message : "Không gửi được mã, vui lòng thử lại." };
  }
}

/**
 * Hộp nhập mã OTP khi server yêu cầu xác minh bổ sung (thao tác nhạy cảm). `apiFetch` gọi
 * handler đăng ký ở đây rồi tự gửi lại request kèm step-up token, nên các form không cần biết.
 */
export function StepUpDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const sequence = useRef(0);

  useEffect(
    () =>
      setStepUpHandler(async (purpose) => {
        // Gửi mã trước rồi mới mở hộp, để hộp mở ra là đã có mã trong email.
        const firstSend = await sendCode(purpose);
        return new Promise<StepUpResult | null>((resolve) => {
          sequence.current += 1;
          setPending({ id: sequence.current, purpose, firstSend, resolve });
        });
      }),
    [],
  );

  if (!pending) return null;
  return <StepUpView key={pending.id} pending={pending} onDone={() => setPending(null)} />;
}

function StepUpView({ pending, onDone }: { pending: Pending; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const settled = useRef(false);
  const id = useId();
  const email = getStoredUser()?.email;
  const action = ACTION_LABELS[pending.purpose] ?? "tiếp tục";

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"sending" | "sent" | "verifying">("sent");
  const [error, setError] = useState(pending.firstSend.error);
  const [cooldown, setCooldown] = useState(pending.firstSend.cooldown);

  const finish = useCallback(
    (result: StepUpResult | null) => {
      if (settled.current) return;
      settled.current = true;
      pending.resolve(result);
      ref.current?.close();
      onDone();
    },
    [pending, onDone],
  );

  const resend = async () => {
    setStatus("sending");
    setError("");
    const outcome = await sendCode(pending.purpose);
    setCooldown(outcome.cooldown);
    setError(outcome.error);
    setStatus("sent");
  };

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      finish(null);
    };
    dialog?.addEventListener("cancel", onCancel);
    return () => dialog?.removeEventListener("cancel", onCancel);
  }, [finish]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Mã xác minh gồm 6 chữ số.");
      return;
    }
    setStatus("verifying");
    setError("");
    try {
      finish(await verifyStepUpCode(pending.purpose, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xác minh được mã, vui lòng thử lại.");
      setStatus("sent");
    }
  };

  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onClick={(event) => {
        if (event.target === event.currentTarget) finish(null);
      }}
    >
      <form className="app-dialog-body" onSubmit={submit} noValidate>
        <h2 id={`${id}-title`} className="app-dialog-title">Xác minh để {action}</h2>
        <p id={`${id}-message`} className="app-dialog-message">
          {status === "sending" ? (
            "Đang gửi mã xác minh…"
          ) : (
            <>
              Chúng tôi đã gửi mã 6 số tới {email ? <b>{email}</b> : "email của bạn"}. Mã hết hạn sau 10 phút.
            </>
          )}
        </p>

        <label className="field">
          <span>Mã xác minh</span>
          <input
            className="step-up-code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            autoFocus
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError("");
            }}
          />
        </label>

        {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}

        <button
          className="link-button step-up-resend"
          type="button"
          disabled={cooldown > 0 || status !== "sent"}
          onClick={() => void resend()}
        >
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown} giây` : "Gửi lại mã"}
        </button>

        <div className="app-dialog-actions">
          <button className="button button-outline" type="button" onClick={() => finish(null)}>
            Hủy
          </button>
          <button className="button button-primary" type="submit" disabled={status !== "sent" || code.length !== 6}>
            {status === "verifying" ? "Đang xác minh…" : "Xác nhận"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
