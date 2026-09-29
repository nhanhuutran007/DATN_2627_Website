"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ApiError, forgotPasswordRequest } from "@/lib/api";

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
  const [sentMessage, setSentMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      setSentMessage(await forgotPasswordRequest(email.trim()));
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentMessage) {
    return (
      <div className="form">
        <p className="form-notice" role="status">{sentMessage}</p>
        <p className="hint">
          Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần. Không thấy email? Hãy kiểm tra thư mục spam
          hoặc gửi lại sau một phút.
        </p>
        <button className="button button-outline button-block" type="button" onClick={() => setSentMessage("")}>
          Gửi lại
        </button>
        <p className="form-switch"><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Email đã đăng ký</span>
        <input
          type="email"
          required
          value={email}
          placeholder="ban@email.com"
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary button-block" type="submit" disabled={busy}>
        {busy ? "Đang gửi…" : "Gửi liên kết đặt lại mật khẩu"}
      </button>
      <p className="form-switch">Nhớ mật khẩu rồi? <Link href="/dang-nhap">Đăng nhập</Link></p>
    </form>
  );
}
