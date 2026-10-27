"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/Icon";
import { useAuthUser, useRedirectAdmin } from "@/lib/auth";
import { OrganizationForm } from "./OrganizationForm";

/** Trang gửi hồ sơ đăng ký tổ chức (người đại diện). */
export function OrganizationRegister() {
  const user = useAuthUser();
  const redirecting = useRedirectAdmin();
  const router = useRouter();

  if (redirecting) return null;

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="shield" size={28} /></span>
        <h1>Đăng nhập để đăng ký tổ chức</h1>
        <p>Người đại diện của tổ chức đăng nhập (hoặc tạo tài khoản) rồi gửi hồ sơ để quản trị viên xác minh.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/to-chuc/dang-ky">Đăng nhập</Link>
          <Link className="button button-outline" href="/dang-ky">Tạo tài khoản</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="org-page">
      <div className="org-page-inner">
        <Link className="org-back" href="/danh-cho-to-chuc"><Icon name="chevron-left" size={16} /> Dành cho tổ chức</Link>
        <h1>Đăng ký tổ chức</h1>
        <p className="org-lead">
          Gửi hồ sơ để quản trị viên xác minh. Sau khi được xác minh, tổ chức có trang công khai và mọi người có thể mở
          chiến dịch gây quỹ cho tổ chức của bạn.
        </p>
        <OrganizationForm representativeName={user.name} onSaved={() => router.push("/to-chuc/cua-toi?da-gui=1")} />
      </div>
    </main>
  );
}
