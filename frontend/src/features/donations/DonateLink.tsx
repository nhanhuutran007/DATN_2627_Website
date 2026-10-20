"use client";

import Link from "next/link";

import { useIsAdmin } from "@/lib/auth";

type DonateLinkProps = {
  href: string;
  className: string;
  children: React.ReactNode;
};

/** Nút "Ủng hộ" dẫn sang trang ủng hộ; tài khoản quản trị chỉ thấy nút bị vô hiệu hóa. */
export function DonateLink({ href, className, children }: DonateLinkProps) {
  const isAdmin = useIsAdmin();
  if (isAdmin) {
    return (
      <button className={className} type="button" disabled title="Tài khoản quản trị không thể ủng hộ">
        {children}
      </button>
    );
  }
  return <Link className={className} href={href}>{children}</Link>;
}
