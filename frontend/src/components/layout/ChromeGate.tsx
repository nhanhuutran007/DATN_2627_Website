"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Trang hiển thị toàn màn hình, không có header/footer của site (vd. đăng nhập, tạo chiến dịch). */
const FULLSCREEN_PATHS = ["/dang-nhap", "/tao-chien-dich"];
/** Trang ủng hộ /du-an/[id]/ung-ho có thanh trên riêng. */
const FULLSCREEN_PATTERNS = [/^\/du-an\/[^/]+\/ung-ho$/];

/** Khu quản trị tách riêng khỏi site công khai: có sidebar và thanh trên cùng của riêng nó. */
function isAdminArea(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Ẩn phần khung chung (header, footer, banner) ở các trang toàn màn hình. */
export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullscreen = FULLSCREEN_PATHS.includes(pathname) || FULLSCREEN_PATTERNS.some((pattern) => pattern.test(pathname));
  return fullscreen || isAdminArea(pathname) ? null : <>{children}</>;
}
