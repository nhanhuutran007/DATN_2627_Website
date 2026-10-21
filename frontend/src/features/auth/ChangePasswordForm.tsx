"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ApiError, forgotPasswordRequest } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";

/** Server không gửi thư mới nếu vừa gửi trong 1 phút (RESET_RESEND_COOLDOWN_MS). */
const RESEND_SECONDS = 60;

const noopSubscribe = () => () => {};

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Bạn gửi yêu cầu quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

/**
 * Đổi mật khẩu khi đã đăng nhập theo cùng luồng email với "Quên mật khẩu" (như GoFundMe):
 * gửi liên kết tới email của tài khoản → bấm nút trong thư → /dat-lai-mat-khau đặt mật khẩu mới.
 * Dùng được cả cho tài khoản đăng nhập bằng Google (không có mật khẩu hiện tại).
 */
export function ChangePasswordForm() {
  const user = useAuthUser();
  // Phiên nằm ở localStorage: lúc render trên server chưa biết đã đăng nhập hay chưa.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!hydrated) {
    return <p className="signin-lead">Đang tải…</p>;
  }

  if (!user) {
    return (
      <>
        <h1>Đổi mật khẩu</h1>
        <p className="signin-lead">Đăng nhập để đổi mật khẩu, hoặc đặt lại mật khẩu qua email nếu bạn đã quên.</p>
        <div className="signin-form">
          <Link className="signin-submit signin-submit-link" href="/dang-nhap?next=/doi-mat-khau">Đăng nhập</Link>
        </div>
        <p className="signin-back"><Link href="/quen-mat-khau">Quên mật khẩu?</Link></p>
      </>
    );
  }

  const backHref = user.role === "admin" ? "/admin" : "/ho-so";
  const backLabel = user.role === "admin" ? "Quay lại trang quản trị" : "Quay lại cài đặt tài khoản";

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      await forgotPasswordRequest(user.email);
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <>
        <h1>Kiểm tra email của bạn</h1>
        <p className="signin-lead" role="status">
          Chúng tôi đã gửi liên kết đặt mật khẩu mới tới <b>{user.email}</b>. Bấm nút trong thư để chọn mật khẩu mới.
        </p>
        <p className="signin-lead signin-muted">
          Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần. Sau khi đổi, mọi thiết bị đang đăng nhập sẽ được
          đăng xuất. Không thấy email? Hãy kiểm tra thư mục spam.
        </p>
        {error && <p className="signin-error" role="alert">{error}</p>}
        <div className="signin-form">
          <button
            className="signin-submit signin-submit-outline"
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void send()}
          >
            {busy ? "Đang gửi…" : cooldown > 0 ? `Gửi lại sau ${cooldown} giây` : "Gửi lại email"}
          </button>
        </div>
        <p className="signin-back"><Link href={backHref}>{backLabel}</Link></p>
      </>
    );
  }

  return (
    <>
      <h1>Đổi mật khẩu</h1>
      <p className="signin-lead">
        Chúng tôi sẽ gửi liên kết đặt mật khẩu mới tới email của bạn.
      </p>
      {error && <p className="signin-error" role="alert">{error}</p>}
      <div className="signin-form">
        <div className="signin-account">
          <span className="signin-account-email">{user.email}</span>
        </div>
        <button className="signin-submit" type="button" disabled={busy} onClick={() => void send()}>
          {busy ? "Đang gửi…" : "Gửi liên kết đổi mật khẩu"}
        </button>
      </div>
      <p className="signin-back"><Link href={backHref}>{backLabel}</Link></p>
    </>
  );
}
