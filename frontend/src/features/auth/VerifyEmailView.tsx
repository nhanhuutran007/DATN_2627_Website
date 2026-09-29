"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, verifyEmailRequest } from "@/lib/api";

const TOKEN_LENGTH = 43;

type State =
  | { status: "verifying" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Bạn thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
}

export function VerifyEmailView() {
  const token = useSearchParams().get("token") ?? "";
  const validToken = token.length === TOKEN_LENGTH;
  const [state, setState] = useState<State>({ status: "verifying" });
  // Token chỉ dùng một lần: không gửi lại khi React chạy effect hai lần (Strict Mode).
  const started = useRef(false);

  useEffect(() => {
    if (!validToken || started.current) return;
    started.current = true;
    verifyEmailRequest(token)
      .then((result) => setState({ status: "done", message: result.message }))
      .catch((error: unknown) => setState({ status: "error", message: messageFor(error) }));
  }, [token, validToken]);

  if (!validToken) {
    return (
      <div className="form">
        <p className="form-error" role="alert">
          Liên kết xác minh không hợp lệ. Hãy mở đúng liên kết trong email, hoặc đăng nhập để gửi lại email xác minh.
        </p>
        <Link className="button button-primary button-block" href="/dashboard">Về trang quản lý</Link>
      </div>
    );
  }

  if (state.status === "verifying") {
    return <p className="hint" role="status">Đang xác minh email…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="form">
        <p className="form-error" role="alert">{state.message}</p>
        <Link className="button button-primary button-block" href="/dashboard">Về trang quản lý để gửi lại</Link>
      </div>
    );
  }

  return (
    <div className="form">
      <p className="form-notice" role="status">{state.message} Tài khoản của bạn đã sẵn sàng.</p>
      <Link className="button button-primary button-block" href="/dashboard">Tiếp tục</Link>
    </div>
  );
}
