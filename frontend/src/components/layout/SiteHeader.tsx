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
  { href: `/du-an?category=${encodeURIComponent("Môi trường")}`, label: "Dự án xã hội" },
  { href: `/du-an?category=${encodeURIComponent("Khởi nghiệp")}`, label: "Khởi nghiệp" },
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
          <span className="announcement-help">AI chỉ hỗ trợ · Quyết định luôn có con người kiểm duyệt</span>
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
            {user ? (
              <>
                <Link className="header-action header-notification" href="/dashboard" aria-label="Thông báo">
                  <Icon name="bell" size={21} /><span>Thông báo</span>
                </Link>
                <div className="header-account">
                  <Link className="header-action" href="/dashboard" aria-label="Trang quản lý">
                    <Icon name="user" size={21} /><span>{user.name.split(" ").pop()}</span>
                  </Link>
                  <button className="header-action header-logout" type="button" onClick={handleLogout} aria-label="Đăng xuất">
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </>
            ) : (
              <Link className="header-action" href="/dang-nhap">
                <Icon name="user" size={21} /><span>Đăng nhập</span>
              </Link>
            )}
            <Link className="button button-primary header-cta" href="/tao-chien-dich">Tạo chiến dịch</Link>
          </div>
        </div>
      </div>

      <nav className={`primary-nav ${open ? "is-open" : ""}`} aria-label="Điều hướng chính">
        <div className="container primary-nav-inner">
          <form className="mobile-nav-search" action="/du-an" role="search" onSubmit={() => setOpen(false)}>
            <label className="sr-only" htmlFor="mobile-global-search">Tìm kiếm chiến dịch</label>
            <Icon name="search" size={18} />
            <input id="mobile-global-search" name="q" placeholder="Tìm dự án, lĩnh vực, địa điểm..." />
            <button type="submit" aria-label="Tìm kiếm"><Icon name="arrow-right" size={18} /></button>
          </form>
          {navigation.map((item) => {
            const active = item.href === "/"
              ? pathname === "/"
              : !item.href.includes("?") && !item.href.includes("#") && pathname.startsWith(item.href);
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
          <div className="mobile-nav-actions">
            <Link className="button button-outline" href={user ? "/dashboard" : "/dang-nhap"} onClick={() => setOpen(false)}>
              <Icon name="user" size={18} /> {user ? "Trang quản lý" : "Đăng nhập"}
            </Link>
            <Link className="button button-primary" href="/tao-chien-dich" onClick={() => setOpen(false)}>Tạo chiến dịch</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
