"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { clearSession } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/du-an", label: "Dự án" },
  { href: "/#quy-trinh", label: "Cách hoạt động" },
  { href: "/#minh-bach", label: "Minh bạch" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAuthUser();

  const close = () => setOpen(false);
  const logout = () => {
    clearSession();
    close();
    if (pathname === "/dashboard" || pathname === "/admin") router.push("/");
    else router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href);

  return (
    <header className="site-top">
      <div className="topbar">
        <div className="container topbar-inner">
          <p><Icon name="shield" size={15} /> Mọi khoản ủng hộ chỉ được ghi nhận khi cổng thanh toán xác nhận</p>
          <div className="topbar-account">
            {user ? (
              <>
                <Link href="/dashboard">Xin chào, {user.name}</Link>
                <button type="button" onClick={logout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <Link href="/dang-nhap">Đăng nhập</Link>
                <Link href="/dang-ky">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="navbar">
        <div className="container navbar-inner">
          <Link className="logo" href="/" aria-label="Góp Mầm – Trang chủ" onClick={close}>
            <span className="logo-mark"><Icon name="leaf" size={22} /></span>
            <span className="logo-text">GÓP <b>MẦM</b></span>
          </Link>

          <nav className={`main-nav ${open ? "is-open" : ""}`} id="main-nav" aria-label="Điều hướng chính">
            {navigation.map((item) => (
              <Link
                aria-current={isActive(item.href) ? "page" : undefined}
                href={item.href}
                key={item.href}
                onClick={close}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link aria-current={pathname === "/dashboard" ? "page" : undefined} href="/dashboard" onClick={close}>
                Quản lý
              </Link>
            )}
            {user?.role === "admin" && (
              <Link aria-current={pathname === "/admin" ? "page" : undefined} href="/admin" onClick={close}>
                Quản trị
              </Link>
            )}
            <div className="main-nav-mobile">
              <Link href="/tao-chien-dich" onClick={close}>Tạo chiến dịch</Link>
              {user ? (
                <button type="button" onClick={logout}>Đăng xuất</button>
              ) : (
                <>
                  <Link href="/dang-nhap" onClick={close}>Đăng nhập</Link>
                  <Link href="/dang-ky" onClick={close}>Đăng ký</Link>
                </>
              )}
            </div>
          </nav>

          <div className="navbar-actions">
            <form className="navbar-search" action="/du-an" role="search">
              <label className="sr-only" htmlFor="navbar-search">Tìm dự án</label>
              <input id="navbar-search" name="q" placeholder="Tìm dự án…" />
              <button type="submit" aria-label="Tìm"><Icon name="search" size={17} /></button>
            </form>
            <Link className="button button-primary" href="/tao-chien-dich">Tạo chiến dịch</Link>
            <button
              className="nav-toggle"
              type="button"
              aria-label={open ? "Đóng trình đơn" : "Mở trình đơn"}
              aria-expanded={open}
              aria-controls="main-nav"
              onClick={() => setOpen((value) => !value)}
            >
              <Icon name={open ? "x" : "menu"} size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
