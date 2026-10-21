"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

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
const CODE_LENGTH = 6;
const EMPTY_CODE: string[] = Array.from({ length: CODE_LENGTH }, () => "");

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

  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const code = digits.join("");
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
      <form className="app-dialog-body step-up-body" onSubmit={submit} noValidate>
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

        <CodeInput
          digits={digits}
          invalid={Boolean(error)}
          describedBy={error ? `${id}-error` : undefined}
          onChange={(next) => {
            setDigits(next);
            if (error) setError("");
          }}
        />

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
          <button className="button button-primary" type="submit" disabled={status !== "sent" || code.length !== CODE_LENGTH}>
            {status === "verifying" ? "Đang xác minh…" : "Xác nhận"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

type CodeInputProps = {
  digits: string[];
  invalid: boolean;
  describedBy?: string;
  onChange: (digits: string[]) => void;
};

/**
 * Mã OTP dạng 6 ô, mỗi ô một chữ số: gõ tự sang ô kế, Backspace ở ô trống lùi về ô trước,
 * dán (hoặc trình duyệt tự điền `one-time-code`) cả mã thì rải đều vào các ô.
 */
function CodeInput({ digits, invalid, describedBy, onChange }: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    const box = inputs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))];
    box?.focus();
    box?.select();
  };

  /** Ghi các chữ số `text` bắt đầu từ ô `start`, rồi đưa con trỏ tới ô kế tiếp. */
  const fill = (start: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, CODE_LENGTH - start);
    if (!incoming) return;
    const next = [...digits];
    [...incoming].forEach((digit, offset) => {
      next[start + offset] = digit;
    });
    onChange(next);
    focusBox(start + incoming.length);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      onChange(next);
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  };

  return (
    <div className="step-up-code" role="group" aria-label="Mã xác minh 6 chữ số" aria-describedby={describedBy}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          className="step-up-digit"
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? CODE_LENGTH : 1}
          aria-label={`Chữ số thứ ${index + 1}`}
          aria-invalid={invalid}
          autoFocus={index === 0}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, "");
            if (!value) {
              const next = [...digits];
              next[index] = "";
              onChange(next);
            } else if (value.length > 1 && index === 0) {
              // Tự điền mã từ email/SMS rơi cả chuỗi vào ô đầu.
              fill(0, value);
            } else {
              fill(index, value.slice(-1));
            }
          }}
        />
      ))}
    </div>
  );
}
