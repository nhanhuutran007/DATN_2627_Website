"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, loginRequest } from "@/lib/api";

import { safeNext } from "./safeNext";

// Tài khoản có sẵn trong dữ liệu seed, chỉ để demo
const DEMO_ACCOUNTS = [
  { label: "Chủ dự án", email: "owner1@gopmam.com" },
  { label: "Người ủng hộ", email: "user1@gopmam.com" },
  { label: "Quản trị viên", email: "admin@gopmam.com" },
];
const DEMO_PASSWORD = "password123";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Email hoặc mật khẩu không đúng.";
    if (error.status === 429) return "Bạn thử đăng nhập quá nhiều lần. Vui lòng đợi một phút rồi thử lại.";
    if (error.message.startsWith("Account temporarily locked")) {
      return "Tài khoản tạm khóa 15 phút do nhập sai mật khẩu nhiều lần.";
    }
    if (error.message === "Account has been banned") return "Tài khoản này đã bị khóa bởi quản trị viên.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input type="email" required value={email} placeholder="ban@email.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="field">
        <span>Mật khẩu</span>
        <input type="password" required value={password} placeholder="••••••••" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="button button-primary button-block" type="submit" disabled={busy}>
        {busy ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
      <p className="form-switch">Chưa có tài khoản? <Link href="/dang-ky">Đăng ký</Link></p>

      <div className="demo-box">
        <p>Tài khoản demo (mật khẩu <code>{DEMO_PASSWORD}</code>)</p>
        <div>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => { setEmail(account.email); setPassword(DEMO_PASSWORD); setError(""); }}
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
