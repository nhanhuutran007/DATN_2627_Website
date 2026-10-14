"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/LogoMark";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { logoutRequest } from "@/lib/api";
import { useCategories } from "@/lib/api/categories";
import { useAuthUser } from "@/lib/auth";

type MenuKey = "ung-ho" | "gay-quy" | "gioi-thieu" | "tai-khoan";

/** Cuộn quá số px này thì header chuyển sang trạng thái "đã cuộn". */
const SCROLL_THRESHOLD = 80;
type MenuLink = { href: string; label: string; hint?: string };

const ABOUT_LINKS: MenuLink[] = [
  { href: "/#quy-trinh", label: "Cách hoạt động", hint: "Từ tạo hồ sơ đến báo cáo chi tiêu" },
  { href: "/#minh-bach", label: "Cam kết minh bạch", hint: "Kiểm duyệt, sổ cái, chứng từ" },
  { href: "/nguon-anh", label: "Nguồn ảnh" },
];

/**
 * Header 3 phần: trái (Tìm kiếm · Ủng hộ · Gây quỹ), logo ở giữa, phải (Giới thiệu ·
 * tài khoản · Tạo chiến dịch). Màn hình hẹp: chỉ còn tìm kiếm, logo, chuông và nút trình đơn.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const categories = useCategories();
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
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
    setSearch(false);
  };

  // Bấm ra ngoài header hoặc nhấn Esc: đóng menu thả xuống / ô tìm kiếm / trình đơn.
  useEffect(() => {
    if (!menu && !drawer && !search) return;
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenu(null);
        setDrawer(false);
        setSearch(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        setDrawer(false);
        setSearch(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, drawer, search]);

  const logout = async () => {
    closeAll();
    await logoutRequest();
    if (pathname === "/dashboard" || pathname.startsWith("/admin") || pathname === "/ho-so") router.push("/");
    else router.refresh();
  };

  const toggleMenu = (key: MenuKey) => {
    setSearch(false);
    setMenu((current) => (current === key ? null : key));
  };

  const donateLinks: MenuLink[] = [
    { href: "/du-an", label: "Khám phá dự án", hint: "Tất cả chiến dịch đã được duyệt" },
    ...categories.slice(0, 6).map((name) => ({ href: `/du-an?category=${encodeURIComponent(name)}`, label: name })),
  ];
  const fundraiseLinks: MenuLink[] = [
    { href: "/tao-chien-dich", label: "Tạo chiến dịch", hint: "Soạn hồ sơ 4 bước, gửi duyệt" },
    { href: "/#quy-trinh", label: "Quy trình gây quỹ", hint: "Kiểm duyệt, nhận ủng hộ, báo cáo tiến độ" },
    ...(user ? [{ href: "/dashboard", label: "Quản lý chiến dịch", hint: "Tiến độ, số liệu, chi tiêu" }] : []),
  ];
  const accountLinks: MenuLink[] = user
    ? [
        { href: "/dashboard", label: "Trang quản lý" },
        { href: "/ho-so", label: "Hồ sơ cá nhân" },
        { href: "/thong-bao", label: "Thông báo" },
        ...(user.role === "admin" ? [{ href: "/admin", label: "Quản trị hệ thống" }] : []),
      ]
    : [];

  return (
    <header className={`site-top${scrolled ? " is-scrolled" : ""}`} ref={headerRef}>
      <div className="container gh-bar">
        <div className="gh-left">
          <button
            className="gh-link gh-search-toggle"
            type="button"
            aria-expanded={search}
            aria-controls="gh-search"
            onClick={() => {
              setMenu(null);
              setDrawer(false);
              setSearch((value) => !value);
            }}
          >
            <Icon name="search" size={18} /> <span className="gh-label">Tìm kiếm</span>
          </button>
          <nav className="gh-nav" aria-label="Điều hướng chính">
            <Dropdown id="ung-ho" label="Ủng hộ" open={menu === "ung-ho"} onToggle={toggleMenu}>
              <MenuList links={donateLinks} onNavigate={closeAll} />
            </Dropdown>
            <Dropdown id="gay-quy" label="Gây quỹ" open={menu === "gay-quy"} onToggle={toggleMenu}>
              <MenuList links={fundraiseLinks} onNavigate={closeAll} />
            </Dropdown>
          </nav>
        </div>

        <Link className="logo gh-logo" href="/" aria-label="Góp Mầm – Trang chủ" onClick={closeAll}>
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>

        <div className="gh-right">
          <div className="gh-nav">
            <Dropdown id="gioi-thieu" label="Giới thiệu" open={menu === "gioi-thieu"} onToggle={toggleMenu} align="end">
              <MenuList links={ABOUT_LINKS} onNavigate={closeAll} />
            </Dropdown>
            {user ? (
              <Dropdown id="tai-khoan" label={user.name} open={menu === "tai-khoan"} onToggle={toggleMenu} align="end">
                <MenuList links={accountLinks} onNavigate={closeAll} />
                <button className="gh-menu-item gh-menu-logout" type="button" onClick={logout}>Đăng xuất</button>
              </Dropdown>
            ) : (
              <Link className="gh-link" href="/dang-nhap" onClick={closeAll}>Đăng nhập</Link>
            )}
          </div>
          {user && <NotificationBell onNavigate={closeAll} />}
          <Link className="gh-cta" href="/tao-chien-dich" onClick={closeAll}>Tạo chiến dịch</Link>
          <button
            className="gh-toggle"
            type="button"
            aria-label={drawer ? "Đóng trình đơn" : "Mở trình đơn"}
            aria-expanded={drawer}
            aria-controls="gh-drawer"
            onClick={() => {
              setMenu(null);
              setSearch(false);
              setDrawer((value) => !value);
            }}
          >
            <Icon name={drawer ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {search && (
        <div className="gh-search" id="gh-search">
          <form
            className="container gh-search-form"
            action="/du-an"
            role="search"
            onSubmit={(event) => {
              // Điều hướng bằng router: đóng ô tìm kiếm trước khi form gửi sẽ hủy việc gửi.
              event.preventDefault();
              const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
              setSearch(false);
              router.push(q ? `/du-an?q=${encodeURIComponent(q)}` : "/du-an");
            }}
          >
            <label className="sr-only" htmlFor="gh-search-input">Tìm dự án</label>
            <Icon name="search" size={20} />
            <input id="gh-search-input" name="q" placeholder="Tìm theo tên dự án, nội dung hoặc địa phương" autoFocus />
            <button className="button button-primary" type="submit">Tìm</button>
          </form>
        </div>
      )}

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
                <Link className="button button-outline" href="/dang-nhap" onClick={closeAll}>Đăng nhập</Link>
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
