"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

import {
  ApiError,
  type AuthSession,
  checkEmailRequest,
  fetchAuthProviders,
  googleLoginRequest,
  loginRequest,
  registerRequest,
} from "@/lib/api";

import { PasswordRules } from "@/components/ui/PasswordRules";
import { passwordPolicyError } from "@/lib/password-policy";

import { GoogleSignInButton } from "./GoogleSignInButton";
import { RevealButton } from "./RevealButton";
import { safeNext } from "./safeNext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "email" | "password" | "register";

const HEADINGS: Record<Step, { title: string; lead: string }> = {
  email: { title: "Chào mừng bạn", lead: "Đăng nhập Góp Mầm hoặc đăng ký để tiếp tục." },
  password: { title: "Chào mừng trở lại", lead: "Nhập mật khẩu để đăng nhập." },
  register: { title: "Tạo tài khoản", lead: "Email này chưa có tài khoản. Chỉ cần vài thông tin để bắt đầu." },
};

function loginMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Mật khẩu không đúng. Vui lòng thử lại.";
    if (error.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.";
    if (error.message.startsWith("Account temporarily locked")) {
      return "Tài khoản tạm khóa 15 phút do nhập sai mật khẩu nhiều lần.";
    }
    if (error.message === "Account has been banned") return "Tài khoản này đã bị khóa bởi quản trị viên.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

function registerMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message === "Email already registered") return "Email này đã có tài khoản. Hãy đăng nhập.";
    if (error.status === 429) return "Bạn đăng ký quá nhiều lần. Vui lòng đợi một phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

function googleMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Đăng nhập bằng Google chưa được bật trên máy chủ.";
    if (error.status === 403) return "Tài khoản này đã bị khóa bởi quản trị viên.";
    if (error.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.";
    if (error.status === 401) return "Không xác minh được tài khoản Google này. Vui lòng thử lại hoặc dùng email.";
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

/**
 * Đăng nhập kiểu GoFundMe trong một thẻ: nhập email → máy chủ cho biết email đã có
 * tài khoản chưa → bước mật khẩu (đăng nhập) hoặc bước tạo tài khoản (đăng ký).
 * Nút Google luôn hiện; chỉ hoạt động khi máy chủ đã cấu hình Client ID.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const errorId = useId();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [campaignOwner, setCampaignOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const focusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetchAuthProviders()
      .then((providers) => {
        if (active) setGoogleClientId(providers.googleClientId);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Mỗi bước: đưa con trỏ vào ô đầu tiên của bước đó.
  useEffect(() => {
    focusRef.current?.focus();
  }, [step]);

  // Admin chỉ làm việc trong trang quản trị, bỏ qua "next" trỏ tới trang khác.
  const finish = (session: AuthSession) => {
    router.push(session.user.role === "admin" ? "/admin" : next);
    router.refresh();
  };

  const goTo = (target: Step) => {
    setError("");
    setPassword("");
    setShowPassword(false);
    setStep(target);
  };

  const continueWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { exists } = await checkEmailRequest(value);
      setEmail(value);
      goTo(exists ? "password" : "register");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại."
          : "Không kết nối được máy chủ. Vui lòng thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) return setError("Vui lòng nhập mật khẩu.");
    setBusy(true);
    setError("");
    try {
      finish(await loginRequest(email, password));
    } catch (err) {
      setError(loginMessage(err));
      setBusy(false);
    }
  };

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Tên tiếng Việt viết theo thứ tự "Họ Tên".
    const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
    if (!firstName.trim() || !lastName.trim()) return setError("Vui lòng nhập đủ họ và tên.");
    if (fullName.length > 100) return setError("Họ tên tối đa 100 ký tự.");
    const policyError = passwordPolicyError(password);
    if (policyError) return setError(policyError);
    setBusy(true);
    setError("");
    try {
      const session = await registerRequest({
        name: fullName,
        email,
        password,
        role: campaignOwner ? "campaign_owner" : undefined,
      });
      finish(session);
    } catch (err) {
      setError(registerMessage(err));
      setBusy(false);
    }
  };

  const signInWithGoogle = async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      finish(await googleLoginRequest(credential));
    } catch (err) {
      setError(googleMessage(err));
      setBusy(false);
    }
  };

  const errorProps = error ? { "aria-invalid": true, "aria-describedby": errorId } : {};
  const heading = HEADINGS[step];
  const errorLine = error && <p id={errorId} className="signin-error" role="alert">{error}</p>;

  const accountChip = (
    <div className="signin-account">
      <span className="signin-account-email">{email}</span>
      <button type="button" className="signin-link" onClick={() => goTo("email")}>Đổi</button>
    </div>
  );

  const passwordField = (autoComplete: "current-password" | "new-password", label: string) => (
    <label className="signin-field">
      <input
        ref={focusRef}
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete={autoComplete}
        placeholder=" "
        value={password}
        {...errorProps}
        onChange={(event) => {
          setPassword(event.target.value);
          if (error) setError("");
        }}
      />
      <span className="signin-label">{label}</span>
      <RevealButton shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />
    </label>
  );

  return (
    <>
      <h1>{heading.title}</h1>
      <p className="signin-lead">{heading.lead}</p>

      {step === "email" && (
        <>
          {errorLine}
          <div className="signin-providers">
            <GoogleSignInButton clientId={googleClientId} onCredential={signInWithGoogle} onError={setError} />
          </div>
          <p className="signin-divider"><span>hoặc</span></p>
          <form className="signin-form" onSubmit={continueWithEmail} noValidate>
            <label className="signin-field">
              <input
                ref={focusRef}
                type="email"
                name="email"
                inputMode="email"
                autoComplete="username"
                placeholder=" "
                value={email}
                {...errorProps}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
              />
              <span className="signin-label">Địa chỉ email</span>
            </label>
            <button className="signin-submit" type="submit" disabled={busy}>
              {busy ? "Đang kiểm tra…" : "Tiếp tục"}
            </button>
          </form>
        </>
      )}

      {step === "password" && (
        <form className="signin-form" onSubmit={signIn} noValidate>
          {accountChip}
          {/* Giữ email trong form để trình quản lý mật khẩu nhận đúng tài khoản. */}
          <input className="sr-only" type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" />
          {passwordField("current-password", "Mật khẩu")}
          {errorLine}
          <p className="signin-aside"><Link href="/quen-mat-khau">Quên mật khẩu?</Link></p>
          <button className="signin-submit" type="submit" disabled={busy}>
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      )}

      {step === "register" && (
        <form className="signin-form" onSubmit={signUp} noValidate>
          {accountChip}
          <input className="sr-only" type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" />
          <div className="signin-row">
            {/* focusRef chỉ gắn một ô: ở bước đăng ký là ô "Họ". */}
            <label className="signin-field">
              <input
                ref={focusRef}
                name="family-name"
                autoComplete="family-name"
                placeholder=" "
                maxLength={60}
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  if (error) setError("");
                }}
              />
              <span className="signin-label">Họ</span>
            </label>
            <label className="signin-field">
              <input
                name="given-name"
                autoComplete="given-name"
                placeholder=" "
                maxLength={60}
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  if (error) setError("");
                }}
              />
              <span className="signin-label">Tên</span>
            </label>
          </div>
          <label className="signin-field">
            <input
              type={showPassword ? "text" : "password"}
              name="new-password"
              autoComplete="new-password"
              placeholder=" "
              value={password}
              aria-describedby={`${errorId}-rules${error ? ` ${errorId}` : ""}`}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
            />
            <span className="signin-label">Mật khẩu</span>
            <RevealButton shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />
          </label>
          <PasswordRules value={password} id={`${errorId}-rules`} />
          <label className="signin-check">
            <input type="checkbox" checked={campaignOwner} onChange={(event) => setCampaignOwner(event.target.checked)} />
            <span>Tôi muốn gây quỹ cho dự án của mình</span>
          </label>
          {errorLine}
          <button className="signin-submit" type="submit" disabled={busy}>
            {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </button>
          <p className="signin-fineprint">Mọi hồ sơ gây quỹ đều được quản trị viên kiểm duyệt trước khi công khai.</p>
        </form>
      )}
    </>
  );
}
