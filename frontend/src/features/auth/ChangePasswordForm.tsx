"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import { PasswordRules } from "@/components/ui/PasswordRules";
import { ApiError, AUTH_EVENT, changePasswordRequest, hasSession } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";
import { passwordPolicyError } from "@/lib/password-policy";

import { RevealButton } from "./RevealButton";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(AUTH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function ChangePasswordForm() {
  // `null` khi render trên server: chưa biết trạng thái đăng nhập (localStorage).
  const loggedIn = useSyncExternalStore(subscribe, hasSession, () => null);
  const isAdmin = useAuthUser()?.role === "admin";

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const backHref = isAdmin ? "/admin" : "/ho-so";

  if (loggedIn === null) {
    return <p className="signin-lead">Đang tải…</p>;
  }

  if (done) {
    return (
      <>
        <h1>Đã đổi mật khẩu</h1>
        <p className="signin-lead" role="status">
          Mật khẩu mới đã được lưu. Các thiết bị khác đang đăng nhập đã được đăng xuất.
        </p>
        <div className="signin-form">
          <Link className="signin-submit signin-submit-link" href={isAdmin ? "/admin" : "/dashboard"}>Về trang quản lý</Link>
        </div>
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <h1>Đổi mật khẩu</h1>
        <p className="signin-error" role="alert">Bạn cần đăng nhập để đổi mật khẩu.</p>
        <div className="signin-form">
          <Link className="signin-submit signin-submit-link" href="/dang-nhap?next=/doi-mat-khau">Đăng nhập</Link>
        </div>
        <p className="signin-back"><Link href="/quen-mat-khau">Quên mật khẩu hiện tại?</Link></p>
      </>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!current) return setError("Vui lòng nhập mật khẩu hiện tại.");
    const policyError = passwordPolicyError(password);
    if (policyError) return setError(policyError);
    if (password === current) return setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
    if (password !== confirm) return setError("Mật khẩu xác nhận không khớp.");

    setBusy(true);
    try {
      await changePasswordRequest(current, password);
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const inputType = showPassword ? "text" : "password";

  return (
    <>
      <h1>Đổi mật khẩu</h1>
      <p className="signin-lead">Nhập mật khẩu hiện tại và chọn mật khẩu mới. Các thiết bị khác sẽ được đăng xuất.</p>
      {error && <p id="change-error" className="signin-error" role="alert">{error}</p>}

      <form className="signin-form" onSubmit={submit} noValidate>
        <label className="signin-field">
          <input
            type={inputType}
            name="current-password"
            autoComplete="current-password"
            placeholder=" "
            value={current}
            autoFocus
            aria-describedby={error ? "change-error" : undefined}
            onChange={(event) => {
              setCurrent(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Mật khẩu hiện tại</span>
          <RevealButton shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </label>
        <p className="signin-aside signin-aside-tight"><Link href="/quen-mat-khau">Quên mật khẩu hiện tại?</Link></p>
        <label className="signin-field">
          <input
            type={inputType}
            name="new-password"
            autoComplete="new-password"
            placeholder=" "
            value={password}
            aria-describedby="change-password-rules"
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Mật khẩu mới</span>
        </label>
        <PasswordRules value={password} id="change-password-rules" />
        <label className="signin-field">
          <input
            type={inputType}
            name="confirm-password"
            autoComplete="new-password"
            placeholder=" "
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Nhập lại mật khẩu mới</span>
        </label>
        <button className="signin-submit" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Đổi mật khẩu"}
        </button>
      </form>
      <p className="signin-back"><Link href={backHref}>{isAdmin ? "Quay lại trang quản trị" : "Quay lại cài đặt tài khoản"}</Link></p>
    </>
  );
}
