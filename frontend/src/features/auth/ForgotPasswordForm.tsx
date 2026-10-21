"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ApiError, forgotPasswordRequest } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Bạn gửi yêu cầu quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    if (error.status === 400) return "Email không hợp lệ.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await forgotPasswordRequest(address);
      setSentTo(address);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <>
        <h1>Kiểm tra email của bạn</h1>
        <p className="signin-lead" role="status">
          Nếu <b>{sentTo}</b> đã đăng ký Góp Mầm, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới địa chỉ này.
        </p>
        <p className="signin-lead signin-muted">
          Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần. Không thấy email? Hãy kiểm tra thư mục spam.
        </p>
        <div className="signin-form">
          <button className="signin-submit signin-submit-outline" type="button" onClick={() => setSentTo("")}>
            Dùng email khác
          </button>
        </div>
        <p className="signin-back"><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
      </>
    );
  }

  return (
    <>
      <h1>Đặt lại mật khẩu</h1>
      <p className="signin-lead">Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu tới email của bạn.</p>
      {error && <p id="forgot-error" className="signin-error" role="alert">{error}</p>}

      <form className="signin-form" onSubmit={submit} noValidate>
        <label className="signin-field">
          <input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder=" "
            value={email}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "forgot-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
          />
          <span className="signin-label">Địa chỉ email</span>
        </label>
        <button className="signin-submit" type="submit" disabled={busy}>
          {busy ? "Đang gửi…" : "Đặt lại mật khẩu"}
        </button>
      </form>
      <p className="signin-back"><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
    </>
  );
}
