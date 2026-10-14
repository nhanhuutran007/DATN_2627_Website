"use client";

import { useEffect, useRef, useState } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type CredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize(options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
      locale?: string;
    },
  ): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Nạp thư viện Google Identity Services một lần cho cả trang. */
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Không tải được Google Identity Services"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type GoogleSignInButtonProps = {
  /** null: máy chủ chưa cấu hình GOOGLE_CLIENT_ID → nút vẫn hiện nhưng bấm sẽ báo chưa bật. */
  clientId: string | null;
  /** Nhận Google ID token sau khi người dùng chọn tài khoản. */
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
};

/** Logo "G" nhiều màu theo nhận diện của Google. */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Luôn hiện nút Google; dùng nút chính thức của Google khi máy chủ đã có Client ID. */
export function GoogleSignInButton({ clientId, onCredential, onError }: GoogleSignInButtonProps) {
  if (!clientId) {
    return (
      <button
        className="signin-provider"
        type="button"
        onClick={() =>
          onError("Đăng nhập bằng Google chưa được bật: quản trị viên cần cấu hình Google OAuth Client ID (GOOGLE_CLIENT_ID).")
        }
      >
        <GoogleLogo /> Đăng nhập bằng Google
      </button>
    );
  }
  return <OfficialGoogleButton clientId={clientId} onCredential={onCredential} onError={onError} />;
}

function OfficialGoogleButton({ clientId, onCredential, onError }: GoogleSignInButtonProps & { clientId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Giữ callback mới nhất mà không phải khởi tạo lại Google mỗi lần render.
  const handlers = useRef({ onCredential, onError });
  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    let active = true;
    loadGsi()
      .then(() => {
        const container = ref.current;
        const id = window.google?.accounts.id;
        if (!active || !container || !id) return;
        id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (response.credential) handlers.current.onCredential(response.credential);
            else handlers.current.onError("Không nhận được thông tin đăng nhập từ Google.");
          },
        });
        id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          logo_alignment: "center",
          // Google giới hạn 200–400px.
          width: Math.max(200, Math.min(400, Math.floor(container.clientWidth))),
          locale: "vi",
        });
        setReady(true);
      })
      .catch(() => {
        if (active) handlers.current.onError("Không tải được nút đăng nhập Google. Kiểm tra kết nối mạng rồi thử lại.");
      });
    return () => {
      active = false;
    };
  }, [clientId]);

  return (
    <div className="google-signin" aria-busy={!ready}>
      <div ref={ref} className="google-signin-slot" />
      {!ready && (
        <span className="signin-provider google-signin-placeholder" aria-hidden="true">
          <GoogleLogo /> Đăng nhập bằng Google
        </span>
      )}
    </div>
  );
}
