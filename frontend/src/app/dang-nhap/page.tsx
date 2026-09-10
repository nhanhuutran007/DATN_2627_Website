import type { Metadata } from "next";
import { Suspense } from "react";

import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="atlas atlas-mangrove" />
        <div className="auth-visual-overlay" />
        <div className="auth-quote"><Icon name="heart" size={30} /><blockquote>“Một cộng đồng vững mạnh bắt đầu từ niềm tin được trao đúng chỗ.”</blockquote><p>Minh bạch · Đồng hành · Tác động thật</p></div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <p className="eyebrow">Chào mừng trở lại</p>
          <h1>Đăng nhập Góp Mầm</h1>
          <p>Theo dõi những dự án bạn tin tưởng và tiếp tục hành trình tạo thay đổi.</p>
          <Suspense fallback={<p>Đang tải biểu mẫu…</p>}>
            <LoginForm />
          </Suspense>
          <div className="auth-divider"><span>hoặc</span></div>
          <button className="button button-outline full-button" type="button">
            Tiếp tục với tài khoản mô phỏng
          </button>
        </div>
      </section>
    </main>
  );
}