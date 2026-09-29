"use client";

import { useState } from "react";

import { ApiError, AuthUser, resendVerificationRequest } from "@/lib/api";

/** Nhắc xác minh email khi tài khoản chưa xác minh; cho phép gửi lại email. */
export function EmailVerificationNotice({ user }: { user: AuthUser }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (user.emailVerified !== false) {
    return null;
  }

  const resend = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult({ tone: "ok", text: await resendVerificationRequest() });
    } catch (error) {
      setResult({
        tone: "error",
        text: error instanceof ApiError ? error.message : "Không gửi được email, vui lòng thử lại sau.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-notice verify-notice" role="status">
      <p>
        <b>Xác minh email của bạn.</b> Chúng tôi đã gửi liên kết xác minh tới <b>{user.email}</b>. Không thấy
        email? Hãy kiểm tra thư mục spam hoặc{" "}
        <button className="link-inline" type="button" onClick={resend} disabled={busy}>
          {busy ? "đang gửi…" : "gửi lại"}
        </button>
        .
      </p>
      {result && <p className={result.tone === "ok" ? "" : "verify-notice-error"}>{result.text}</p>}
    </div>
  );
}
