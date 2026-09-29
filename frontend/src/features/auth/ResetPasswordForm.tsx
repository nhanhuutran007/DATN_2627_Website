"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, resetPasswordRequest } from "@/lib/api";

const TOKEN_LENGTH = 43;

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (token.length !== TOKEN_LENGTH) {
    return (
      <div className="form">
        <p className="form-error" role="alert">
          Liên kết đặt lại mật khẩu không hợp lệ. Hãy mở đúng liên kết trong email hoặc yêu cầu liên kết mới.
        </p>
        <Link className="button button-primary button-block" href="/quen-mat-khau">Yêu cầu liên kết mới</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="form">
        <p className="form-notice" role="status">{done}</p>
        <Link className="button button-primary button-block" href="/dang-nhap">Đăng nhập</Link>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Mật khẩu mới cần ít nhất 8 ký tự.");
    if (password.length > 72) return setError("Mật khẩu mới tối đa 72 ký tự.");
    if (password !== confirm) return setError("Mật khẩu xác nhận không khớp.");

    setBusy(true);
    try {
      setDone(await resetPasswordRequest(token, password));
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Mật khẩu mới</span>
        <input
          type="password"
          required
          value={password}
          placeholder="Ít nhất 8 ký tự"
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Nhập lại mật khẩu mới</span>
        <input
          type="password"
          required
          value={confirm}
          autoComplete="new-password"
          onChange={(event) => setConfirm(event.target.value)}
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
          {error.includes("hết hạn") && <> <Link href="/quen-mat-khau">Yêu cầu liên kết mới</Link></>}
        </p>
      )}

      <button className="button button-primary button-block" type="submit" disabled={busy}>
        {busy ? "Đang lưu…" : "Đặt lại mật khẩu"}
      </button>
      <p className="hint">Sau khi đặt lại, bạn sẽ bị đăng xuất khỏi mọi thiết bị đang đăng nhập.</p>
    </form>
  );
}
