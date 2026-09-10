"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError, loginRequest } from "@/lib/api";

const DEMO_EMAIL = "owner1@gopmam.com";
const DEMO_PASSWORD = "password123";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message === "Invalid credentials") {
      return "Email hoặc mật khẩu không đúng.";
    }
    return error.message;
  }
  return "Không kết nối được hệ thống. Hãy kiểm tra backend và thử lại.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginRequest(email.trim(), password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
      setBusy(false);
    }
  };

  const useDemoAccount = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <form onSubmit={submit}>
      <label className="form-field"><span>Email</span><input type="email" value={email} placeholder="ban@email.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="form-field"><span>Mật khẩu</span><input type="password" value={password} placeholder="••••••••" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /></label>
      <div className="auth-options">
        <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Ghi nhớ đăng nhập</label>
        <a href="#">Quên mật khẩu?</a>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary full-button" type="submit" disabled={busy}>
        {busy ? "Đang đăng nhập…" : "Đăng nhập"} <Icon name="arrow-right" size={18} />
      </button>
      <button className="button button-outline full-button" type="button" onClick={useDemoAccount}>
        Đăng nhập nhanh với tài khoản mẫu
      </button>
      <p className="auth-register">Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link></p>
    </form>
  );
}