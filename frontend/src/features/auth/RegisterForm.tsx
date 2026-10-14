"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { PasswordRules } from "@/components/ui/PasswordRules";
import { ApiError, registerRequest } from "@/lib/api";
import { passwordPolicyError } from "@/lib/password-policy";

import { safeNext } from "./safeNext";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message === "Email already registered") {
      return "Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.";
    }
    if (error.status === 429) return "Bạn đăng ký quá nhiều lần. Vui lòng đợi một phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

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
    if (name.trim().length < 2) return setError("Tên hiển thị cần ít nhất 2 ký tự.");
    const policyError = passwordPolicyError(password);
    if (policyError) return setError(policyError);
    if (password !== confirm) return setError("Mật khẩu xác nhận không khớp.");

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
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Tên hiển thị</span>
        <input required value={name} placeholder="Ví dụ: Nguyễn Minh An" autoComplete="name" onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" required value={email} placeholder="ban@email.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Mật khẩu</span>
          <input type="password" required value={password} autoComplete="new-password" aria-describedby="register-password-rules" onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field">
          <span>Nhập lại mật khẩu</span>
          <input type="password" required value={confirm} autoComplete="new-password" onChange={(event) => setConfirm(event.target.value)} />
        </label>
      </div>
      <PasswordRules value={password} id="register-password-rules" />

      <label className="check-row">
        <input type="checkbox" checked={campaignOwner} onChange={(event) => setCampaignOwner(event.target.checked)} />
        <span><b>Tôi muốn gây quỹ cho dự án của mình</b><small>Tài khoản sẽ có vai trò chủ dự án. Mọi hồ sơ vẫn phải qua kiểm duyệt.</small></span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary button-block" type="submit" disabled={busy}>
        {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </button>
      <p className="form-switch">Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link></p>
    </form>
  );
}
