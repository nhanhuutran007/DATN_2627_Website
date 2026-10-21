"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { PasswordRules } from "@/components/ui/PasswordRules";
import { ApiError, resetPasswordRequest } from "@/lib/api";
import { passwordPolicyError } from "@/lib/password-policy";

import { RevealButton } from "./RevealButton";

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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (token.length !== TOKEN_LENGTH) {
    return (
      <>
        <h1>Liên kết không hợp lệ</h1>
        <p className="signin-lead">
          Liên kết đặt lại mật khẩu không đúng hoặc đã bị cắt bớt. Hãy mở đúng liên kết trong email, hoặc yêu cầu
          liên kết mới.
        </p>
        <div className="signin-form">
          <Link className="signin-submit signin-submit-link" href="/quen-mat-khau">Yêu cầu liên kết mới</Link>
        </div>
        <p className="signin-back"><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1>Đã đặt lại mật khẩu</h1>
        <p className="signin-lead" role="status">
          Mật khẩu mới đã được lưu. Vì lý do an toàn, mọi thiết bị đang đăng nhập đã được đăng xuất.
        </p>
        <div className="signin-form">
          <Link className="signin-submit signin-submit-link" href="/dang-nhap">Đăng nhập</Link>
        </div>
      </>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const policyError = passwordPolicyError(password);
    if (policyError) return setError(policyError);
    if (password !== confirm) return setError("Mật khẩu xác nhận không khớp.");

    setBusy(true);
    try {
      await resetPasswordRequest(token, password);
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  };

  const inputType = showPassword ? "text" : "password";

  return (
    <>
      <h1>Đặt mật khẩu mới</h1>
      <p className="signin-lead">Nhập và xác nhận mật khẩu mới của bạn.</p>
      {error && (
        <p id="reset-error" className="signin-error" role="alert">
          {error}
          {error.includes("hết hạn") && <> <Link href="/quen-mat-khau">Yêu cầu liên kết mới</Link></>}
        </p>
      )}

      <form className="signin-form" onSubmit={submit} noValidate>
        <label className="signin-field">
          <input
            type={inputType}
            name="new-password"
            autoComplete="new-password"
            placeholder=" "
            value={password}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={`reset-password-rules${error ? " reset-error" : ""}`}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Mật khẩu mới</span>
          <RevealButton shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </label>
        <PasswordRules value={password} id="reset-password-rules" />
        <label className="signin-field">
          <input
            type={inputType}
            name="confirm-password"
            autoComplete="new-password"
            placeholder=" "
            value={confirm}
            aria-invalid={error && password !== confirm ? true : undefined}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Nhập lại mật khẩu</span>
        </label>
        <button className="signin-submit" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu mật khẩu mới"}
        </button>
      </form>
      <p className="signin-back"><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
    </>
  );
}
