"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { clearSession } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";

const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/du-an", label: "Khám phá dự án" },
  { href: "/du-an?category=Môi+trường", label: "Dự án xã hội" },
  { href: "/du-an?category=Khởi+nghiệp", label: "Khởi nghiệp" },
  { href: "/#cach-hoat-dong", label: "Cách hoạt động" },
  { href: "/#minh-bach", label: "Minh bạch" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAuthUser();

  const handleLogout = () => {
    clearSession();
    if (pathname === "/dashboard" || pathname === "/admin") router.push("/");
    else router.refresh();
  };

  return (
    <header className="site-header">
      <div className="announcement">
        <div className="container announcement-inner">
          <span><Icon name="shield" size={15} /> Mọi khoản đóng góp đều được truy vết minh bạch</span>
          <span className="announcement-help">Hỗ trợ: 1900 6868 · 08:00–21:00</span>
        </div>
      </div>

      <div className="header-main">
        <div className="container header-main-inner">
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label={open ? "Đóng trình đơn" : "Mở trình đơn"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "x" : "menu"} />
          </button>

          <Link className="brand" href="/" aria-label="Góp Mầm - Trang chủ">
            <span className="brand-mark"><Icon name="leaf" size={23} /></span>
            <span className="brand-copy"><b>GÓP MẦM</b><small>Góp niềm tin · Gieo thay đổi</small></span>
          </Link>

          <form className="header-search" action="/du-an" role="search">
            <label className="sr-only" htmlFor="global-search">Tìm kiếm chiến dịch</label>
            <input id="global-search" name="q" placeholder="Tìm dự án, lĩnh vực, địa điểm..." />
            <button type="submit" aria-label="Tìm kiếm"><Icon name="search" size={20} /></button>
          </form>

          <div className="header-actions">
            <Link className="header-action" href="/dashboard">
              <Icon name="bell" size={21} /><span>Thông báo</span>{user ? null : <i>3</i>}
            </Link>
            {user ? (
              <div className="header-account">
                <Link className="header-action" href="/dashboard" aria-label="Trang quản lý">
                  <Icon name="user" size={21} /><span>{user.name.split(" ").pop()}</span>
                </Link>
                <button className="header-action header-logout" type="button" onClick={handleLogout} aria-label="Đăng xuất">
                  <Icon name="x" size={19} />
                </button>
              </div>
            ) : (
              <Link className="header-action" href="/dang-nhap">
                <Icon name="user" size={21} /><span>Tài khoản</span>
              </Link>
            )}
            <Link className="button button-primary header-cta" href="/tao-chien-dich">Bắt đầu dự án</Link>
          </div>
        </div>
      </div>

      <nav className={`primary-nav ${open ? "is-open" : ""}`} aria-label="Điều hướng chính">
        <div className="container primary-nav-inner">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : item.href.startsWith(pathname) && pathname !== "/";
            return (
              <Link
                className={active ? "active" : ""}
                href={item.href}
                key={item.label}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
          <Link className="nav-admin-link" href="/admin" onClick={() => setOpen(false)}>Quản trị demo</Link>
        </div>
      </nav>
    </header>
  );
}
