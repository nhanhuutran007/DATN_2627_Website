"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/LogoMark";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { logoutRequest } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";

type MenuKey = "ung-ho" | "gay-quy" | "gioi-thieu" | "tai-khoan";

/** Cuộn quá số px này thì header chuyển sang trạng thái "đã cuộn". */
const SCROLL_THRESHOLD = 80;
type MenuLink = { href: string; label: string; hint?: string };

const ROLE_LABEL: Record<"user" | "campaign_owner" | "admin", string> = {
  user: "Người ủng hộ",
  campaign_owner: "Chủ dự án",
  admin: "Quản trị viên",
};

/** Tên gọi kiểu Việt: chữ cuối của họ tên ("Trần Hữu Nhân" → "Nhân"). */
function givenName(name: string): string {
  return name.trim().split(/\s+/).pop() ?? name;
}

const ABOUT_LINKS: MenuLink[] = [
  { href: "/#quy-trinh", label: "Cách hoạt động", hint: "Từ tạo hồ sơ đến báo cáo chi tiêu" },
  { href: "/#minh-bach", label: "Cam kết minh bạch", hint: "Kiểm duyệt, sổ cái, chứng từ" },
  { href: "/nguon-anh", label: "Nguồn ảnh" },
];

/**
 * Header 3 phần: trái (Tìm kiếm · Ủng hộ · Gây quỹ · Giới thiệu), logo ở giữa, phải (tài khoản ·
 * thông báo · Tạo chiến dịch) — "Giới thiệu" ở bên trái để hai bên logo cân nhau khi đã đăng nhập. Màn hình hẹp: chỉ còn tìm kiếm, logo, chuông và nút trình đơn.
 */
/** Trang xác thực: đăng nhập từ đây không cần quay lại chính nó. */
const AUTH_PATHS = ["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/dat-lai-mat-khau", "/xac-minh-email"];

export function SiteHeader() {
  const pathname = usePathname();
  // Đăng nhập xong quay lại trang đang xem; không có `next` thì về trang chủ.
  const loginHref =
    pathname === "/" || AUTH_PATHS.some((path) => pathname.startsWith(path))
      ? "/dang-nhap"
      : `/dang-nhap?next=${encodeURIComponent(pathname)}`;
  const router = useRouter();
  const user = useAuthUser();
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Cuộn khỏi đầu trang: header đổ bóng, nút "Tạo chiến dịch" chuyển sang nền đặc để làm điểm nhấn.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    const frame = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const closeAll = () => {
    setMenu(null);
    setDrawer(false);
  };

  // Bấm ra ngoài header hoặc nhấn Esc: đóng menu thả xuống / trình đơn.
  useEffect(() => {
    if (!menu && !drawer) return;
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenu(null);
        setDrawer(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        setDrawer(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, drawer]);

  const logout = async () => {
    closeAll();
    await logoutRequest();
    if (pathname === "/dashboard" || pathname.startsWith("/admin") || pathname === "/ho-so") router.push("/");
    else router.refresh();
  };

  const toggleMenu = (key: MenuKey) => {
    setMenu((current) => (current === key ? null : key));
  };

  const donateLinks: MenuLink[] = [
    { href: "/du-an", label: "Khám phá dự án", hint: "Duyệt dự án theo lĩnh vực" },
  ];
  // Tài khoản quản trị chỉ dùng để quản trị: không có lối vào tạo chiến dịch hay hoạt động cá nhân.
  const isAdmin = user?.role === "admin";
  const fundraiseLinks: MenuLink[] = [
    ...(isAdmin ? [] : [{ href: "/tao-chien-dich", label: "Tạo chiến dịch", hint: "Soạn hồ sơ theo từng bước, gửi duyệt" }]),
    { href: "/bat-dau-gay-quy", label: "Cách bắt đầu gây quỹ", hint: "Các bước, lĩnh vực và câu hỏi thường gặp" },
    ...(user && !isAdmin ? [{ href: "/dashboard", label: "Quản lý chiến dịch", hint: "Tiến độ, số liệu, chi tiêu" }] : []),
  ];
  // Theo menu tài khoản GoFundMe (Profile · Your impact · Messages · Account settings · Sign out); admin thay "Hoạt động" bằng trang quản trị.
  const accountLinks: MenuLink[] = user
    ? [
        isAdmin ? { href: "/admin", label: "Trang quản trị" } : { href: "/dashboard", label: "Hoạt động của bạn" },
        { href: "/thong-bao", label: "Thông báo" },
        { href: "/ho-so", label: "Cài đặt tài khoản" },
      ]
    : [];

  return (
    <header className={`site-top${scrolled ? " is-scrolled" : ""}`} ref={headerRef}>
      <div className="container gh-bar">
        <div className="gh-left">
          {/* Như GoFundMe: "Tìm kiếm" mở hẳn trang tìm kiếm (ô tìm lớn + bộ lọc), không mở thanh trượt. */}
          <Link className="gh-link gh-search-toggle" href="/tim-kiem" onClick={closeAll}>
            <Icon name="search" size={18} /> <span className="gh-label">Tìm kiếm</span>
          </Link>
          <nav className="gh-nav" aria-label="Điều hướng chính">
            <Dropdown id="ung-ho" label="Ủng hộ" open={menu === "ung-ho"} onToggle={toggleMenu}>
              <MenuList links={donateLinks} onNavigate={closeAll} />
            </Dropdown>
            <Dropdown id="gay-quy" label="Gây quỹ" open={menu === "gay-quy"} onToggle={toggleMenu}>
              <MenuList links={fundraiseLinks} onNavigate={closeAll} />
            </Dropdown>
            <Dropdown id="gioi-thieu" label="Giới thiệu" open={menu === "gioi-thieu"} onToggle={toggleMenu}>
              <MenuList links={ABOUT_LINKS} onNavigate={closeAll} />
            </Dropdown>
          </nav>
        </div>

        <Link className="logo gh-logo" href="/" aria-label="Góp Mầm – Trang chủ" onClick={closeAll}>
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>

        <div className="gh-right">
          <div className="gh-nav">
            {user ? (
              <div className="gh-dropdown">
                <button
                  className="gh-link gh-account"
                  type="button"
                  aria-expanded={menu === "tai-khoan"}
                  aria-controls="gh-menu-tai-khoan"
                  aria-label={`Menu tài khoản: ${user.name}`}
                  onClick={() => toggleMenu("tai-khoan")}
                >
                  <span className="gh-link-text">{givenName(user.name)}</span>
                  <Icon name="chevron-down" size={14} className={menu === "tai-khoan" ? "gh-caret is-open" : "gh-caret"} />
                </button>
                {menu === "tai-khoan" && (
                  <div className="gh-menu gh-menu-end gh-account-menu" id="gh-menu-tai-khoan">
                    <div className="gh-account-head">
                      <b>{user.name}</b>
                      <small>{user.email}</small>
                      <span className={`tag ${user.role === "admin" ? "tag-blue" : "tag-green"}`}>{ROLE_LABEL[user.role]}</span>
                    </div>
                    <MenuList links={accountLinks} onNavigate={closeAll} />
                    <button className="gh-menu-item gh-menu-logout" type="button" onClick={logout}>Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="gh-link" href={loginHref} onClick={closeAll}>Đăng nhập</Link>
            )}
          </div>
          {user && <NotificationBell onNavigate={closeAll} />}
          {isAdmin ? (
            <Link className="gh-cta" href="/admin" onClick={closeAll}>Trang quản trị</Link>
          ) : (
            <Link className="gh-cta" href="/tao-chien-dich" onClick={closeAll}>Tạo chiến dịch</Link>
          )}
          <button
            className="gh-toggle"
            type="button"
            aria-label={drawer ? "Đóng trình đơn" : "Mở trình đơn"}
            aria-expanded={drawer}
            aria-controls="gh-drawer"
            onClick={() => {
              setMenu(null);
              setDrawer((value) => !value);
            }}
          >
            <Icon name={drawer ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {drawer && (
        <div className="gh-drawer" id="gh-drawer">
          <div className="container">
            <DrawerSection title="Ủng hộ" links={donateLinks} onNavigate={closeAll} />
            <DrawerSection title="Gây quỹ" links={fundraiseLinks} onNavigate={closeAll} />
            <DrawerSection title="Giới thiệu" links={ABOUT_LINKS} onNavigate={closeAll} />
            {user ? (
              <section className="gh-drawer-section">
                <h2>{user.name}</h2>
                <MenuList links={accountLinks} onNavigate={closeAll} />
                <button className="gh-menu-item gh-menu-logout" type="button" onClick={logout}>Đăng xuất</button>
              </section>
            ) : (
              <div className="gh-drawer-auth">
                <Link className="button button-outline" href={loginHref} onClick={closeAll}>Đăng nhập</Link>
                <Link className="button button-primary" href="/dang-ky" onClick={closeAll}>Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

type DropdownProps = {
  id: MenuKey;
  label: string;
  open: boolean;
  onToggle: (id: MenuKey) => void;
  align?: "start" | "end";
  children: ReactNode;
};

function Dropdown({ id, label, open, onToggle, align = "start", children }: DropdownProps) {
  return (
    <div className="gh-dropdown">
      <button className="gh-link" type="button" aria-expanded={open} aria-controls={`gh-menu-${id}`} onClick={() => onToggle(id)}>
        <span className="gh-link-text">{label}</span> <Icon name="chevron-down" size={14} className={open ? "gh-caret is-open" : "gh-caret"} />
      </button>
      {open && (
        <div className={`gh-menu gh-menu-${align}`} id={`gh-menu-${id}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuList({ links, onNavigate }: { links: MenuLink[]; onNavigate: () => void }) {
  return (
    <ul className="gh-menu-list">
      {links.map((link) => (
        <li key={link.href + link.label}>
          <Link className="gh-menu-item" href={link.href} onClick={onNavigate}>
            <span>{link.label}</span>
            {link.hint && <small>{link.hint}</small>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DrawerSection({ title, links, onNavigate }: { title: string; links: MenuLink[]; onNavigate: () => void }) {
  return (
    <section className="gh-drawer-section">
      <h2>{title}</h2>
      <MenuList links={links} onNavigate={onNavigate} />
    </section>
  );
}
