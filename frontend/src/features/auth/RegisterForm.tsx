"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, registerRequest } from "@/lib/api";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message === "Email already registered") {
      return "Email này đã được đăng ký. Hãy sử dụng email khác hoặc đăng nhập.";
    }
    return error.message;
  }
  return "Không kết nối được hệ thống. Hãy kiểm tra backend và thử lại.";
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [campaignOwner, setCampaignOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Tên hiển thị cần ít nhất 2 ký tự.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setBusy(true);
    try {
      await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
        role: campaignOwner ? "campaign_owner" : undefined,
      });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label className="form-field"><span>Tên hiển thị <i>*</i></span><input value={name} placeholder="Ví dụ: Nguyễn Minh An" autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
      <label className="form-field"><span>Email <i>*</i></span><input type="email" value={email} placeholder="ban@email.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label>
      <div className="form-grid">
        <label className="form-field"><span>Mật khẩu <i>*</i></span><input type="password" value={password} placeholder="Ít nhất 8 ký tự" autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="form-field"><span>Xác nhận mật khẩu <i>*</i></span><input type="password" value={confirm} placeholder="Nhập lại mật khẩu" autoComplete="new-password" onChange={(event) => setConfirm(event.target.value)} /></label>
      </div>

      <label className="checkbox-row register-role-row">
        <input type="checkbox" checked={campaignOwner} onChange={(event) => setCampaignOwner(event.target.checked)} />
        <span><b>Tôi muốn gây quỹ cho dự án của mình</b><small>Đăng ký vai trò chủ chiến dịch (có thể bổ sung sau).</small></span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary full-button" type="submit" disabled={busy}>
        {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"} <Icon name="arrow-right" size={18} />
      </button>
      <p className="auth-register">Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link></p>
    </form>
  );
}