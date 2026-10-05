"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type Tone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger`: thao tác khó hoàn tác (xóa, hoàn tiền…) — nút chính màu cảnh báo, focus mặc định vào nút Hủy. */
  tone?: Tone;
};

export type PromptOptions = ConfirmOptions & {
  /** Nhãn ô nhập (hiển thị phía trên ô). */
  label: string;
  placeholder?: string;
  defaultValue?: string;
  /** Số ký tự tối thiểu sau khi cắt khoảng trắng (mặc định 1 = bắt buộc). */
  minLength?: number;
  maxLength?: number;
  /** Lựa chọn kèm theo (vd. "Tạm dừng chiến dịch"), trả về ở `checked`. */
  checkbox?: { label: string; hint?: string; defaultChecked?: boolean };
};

export type PromptResult = { value: string; checked: boolean };

type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<PromptResult | null>;
};

type Pending =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (result: PromptResult | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/** Hộp thoại xác nhận/nhập liệu theo giao diện của web, thay `window.confirm/prompt`. */
export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog phải nằm trong <DialogProvider>");
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const sequence = useRef(0);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        sequence.current += 1;
        setPending({ id: sequence.current, kind: "confirm", options, resolve });
      }),
    [],
  );
  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<PromptResult | null>((resolve) => {
        sequence.current += 1;
        setPending({ id: sequence.current, kind: "prompt", options, resolve });
      }),
    [],
  );
  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {pending && <DialogView key={pending.id} pending={pending} onDone={() => setPending(null)} />}
    </DialogContext.Provider>
  );
}

function DialogView({ pending, onDone }: { pending: Pending; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const settled = useRef(false);
  const id = useId();
  const { options } = pending;
  const isPrompt = pending.kind === "prompt";
  const promptOptions = isPrompt ? (pending.options as PromptOptions) : null;
  const minLength = promptOptions?.minLength ?? 1;

  const [value, setValue] = useState(promptOptions?.defaultValue ?? "");
  const [checked, setChecked] = useState(Boolean(promptOptions?.checkbox?.defaultChecked));
  const [error, setError] = useState("");

  const finish = useCallback(
    (result: { ok: false } | { ok: true; value?: string; checked?: boolean }) => {
      if (settled.current) return;
      settled.current = true;
      if (pending.kind === "confirm") pending.resolve(result.ok);
      else pending.resolve(result.ok ? { value: result.value ?? "", checked: Boolean(result.checked) } : null);
      ref.current?.close();
      onDone();
    },
    [pending, onDone],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Esc (sự kiện cancel của <dialog>) = Hủy.
    const onCancel = (event: Event) => {
      event.preventDefault();
      finish({ ok: false });
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [finish]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPrompt) return finish({ ok: true });
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      setError(minLength <= 1 ? "Vui lòng nhập nội dung." : `Vui lòng nhập tối thiểu ${minLength} ký tự.`);
      return;
    }
    finish({ ok: true, value: trimmed, checked });
  };

  const danger = options.tone === "danger";

  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={options.message ? `${id}-message` : undefined}
      // Bấm ra nền mờ = Hủy (chỉ khi bấm đúng vào <dialog>, không phải nội dung).
      onClick={(event) => {
        if (event.target === event.currentTarget) finish({ ok: false });
      }}
    >
      <form className="app-dialog-body" onSubmit={submit} noValidate>
        <h2 id={`${id}-title`} className="app-dialog-title">{options.title}</h2>
        {options.message && <div id={`${id}-message`} className="app-dialog-message">{options.message}</div>}

        {promptOptions && (
          <label className="field">
            <span>{promptOptions.label}</span>
            <textarea
              rows={4}
              value={value}
              placeholder={promptOptions.placeholder}
              maxLength={promptOptions.maxLength}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              autoFocus
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError("");
              }}
            />
            <small className="app-dialog-count">
              {value.trim().length}
              {promptOptions.maxLength ? `/${promptOptions.maxLength}` : ""} ký tự
              {minLength > 1 ? ` · tối thiểu ${minLength}` : ""}
            </small>
          </label>
        )}

        {promptOptions?.checkbox && (
          <label className="app-dialog-check">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>
              {promptOptions.checkbox.label}
              {promptOptions.checkbox.hint && <small>{promptOptions.checkbox.hint}</small>}
            </span>
          </label>
        )}

        {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}

        <div className="app-dialog-actions">
          <button
            className="button button-outline"
            type="button"
            autoFocus={!isPrompt && danger}
            onClick={() => finish({ ok: false })}
          >
            {options.cancelLabel ?? "Hủy"}
          </button>
          <button
            className={`button ${danger ? "button-danger" : "button-primary"}`}
            type="submit"
            autoFocus={!isPrompt && !danger}
          >
            {options.confirmLabel ?? "Xác nhận"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
