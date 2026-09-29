"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import { ApiError, AUTH_EVENT, changePasswordRequest, hasSession } from "@/lib/api";

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

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (loggedIn === null) {
    return <p className="hint">Đang tải…</p>;
  }

  if (done) {
    return (
      <div className="form">
        <p className="form-notice" role="status">
          Đổi mật khẩu thành công. Các thiết bị khác đang đăng nhập đã được đăng xuất.
        </p>
        <Link className="button button-primary button-block" href="/dashboard">Về trang quản lý</Link>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="form">
        <p className="form-error" role="alert">Bạn cần đăng nhập để đổi mật khẩu.</p>
        <Link className="button button-primary button-block" href="/dang-nhap?next=/doi-mat-khau">Đăng nhập</Link>
        <p className="form-switch">Quên mật khẩu hiện tại? <Link href="/quen-mat-khau">Đặt lại qua email</Link></p>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!current) return setError("Vui lòng nhập mật khẩu hiện tại.");
    if (password.length < 8) return setError("Mật khẩu mới cần ít nhất 8 ký tự.");
    if (password.length > 72) return setError("Mật khẩu mới tối đa 72 ký tự.");
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

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Mật khẩu hiện tại</span>
        <input
          type="password"
          required
          value={current}
          autoComplete="current-password"
          onChange={(event) => setCurrent(event.target.value)}
        />
      </label>
      <p className="field-aside"><Link href="/quen-mat-khau">Quên mật khẩu hiện tại?</Link></p>
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

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary button-block" type="submit" disabled={busy}>
        {busy ? "Đang lưu…" : "Đổi mật khẩu"}
      </button>
      <p className="hint">Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</p>
    </form>
  );
}
