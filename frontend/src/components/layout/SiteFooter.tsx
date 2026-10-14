import Link from "next/link";

import { LogoMark } from "@/components/ui/LogoMark";

type FooterLink = { href: string; label: string };

const COLUMNS: Array<{ id: string; title: string; links: FooterLink[] }> = [
  {
    id: "footer-ung-ho",
    title: "Ủng hộ",
    links: [
      { href: "/du-an", label: "Khám phá dự án" },
      ...["Giáo dục", "Môi trường", "Y tế", "Khởi nghiệp"].map((name) => ({
        href: `/du-an?category=${encodeURIComponent(name)}`,
        label: name,
      })),
    ],
  },
  {
    id: "footer-gay-quy",
    title: "Gây quỹ",
    links: [
      { href: "/tao-chien-dich", label: "Tạo chiến dịch" },
      { href: "/#quy-trinh", label: "Quy trình gây quỹ" },
      { href: "/dashboard", label: "Quản lý chiến dịch" },
    ],
  },
  {
    id: "footer-gioi-thieu",
    title: "Giới thiệu",
    links: [
      { href: "/#quy-trinh", label: "Cách hoạt động" },
      { href: "/#minh-bach", label: "Cam kết minh bạch" },
      { href: "/nguon-anh", label: "Nguồn ảnh" },
    ],
  },
  {
    id: "footer-tai-khoan",
    title: "Tài khoản",
    links: [
      { href: "/dang-nhap", label: "Đăng nhập" },
      { href: "/dang-ky", label: "Đăng ký" },
      { href: "/ho-so", label: "Hồ sơ cá nhân" },
    ],
  },
];

/** Footer gọn: 4 cột liên kết, dòng dưới có logo, ngôn ngữ và bản quyền. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-cols">
        {COLUMNS.map((column) => (
          <nav key={column.id} aria-labelledby={column.id}>
            <h2 id={column.id}>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container footer-bottom">
        <div className="footer-bottom-row">
          <Link className="logo footer-logo" href="/" aria-label="Góp Mầm – Trang chủ">
            <LogoMark className="logo-mark" />
            <span className="logo-text">GÓP <b>MẦM</b></span>
          </Link>
          <span className="footer-locale">Việt Nam · Tiếng Việt</span>
        </div>
        <p className="footer-copy">© 2026 Góp Mầm</p>
      </div>
    </footer>
  );
}
