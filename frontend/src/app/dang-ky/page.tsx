import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Icon } from "@/components/ui/Icon";
import { RegisterForm } from "@/features/auth/RegisterForm";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="atlas atlas-startup" />
        <div className="auth-visual-overlay" />
        <div className="auth-quote"><Icon name="rocket" size={30} /><blockquote>“Gieo một ý tưởng tử tế, cả cộng đồng sẽ cùng chăm cho nó lớn.”</blockquote><p>Minh bạch · Đồng hành · Tác động thật</p></div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <p className="eyebrow">Bắt đầu ngay</p>
          <h1>Đăng ký Góp Mầm</h1>
          <p>Tạo tài khoản để theo dõi, tài trợ và quản lý các dự án của bạn.</p>
          <Suspense fallback={<p>Đang tải biểu mẫu…</p>}>
            <RegisterForm />
          </Suspense>
          <div className="auth-divider"><span>hoặc</span></div>
          <Link className="button button-outline full-button" href="/dang-nhap">Đăng nhập tài khoản có sẵn</Link>
        </div>
      </section>
    </main>
  );
}