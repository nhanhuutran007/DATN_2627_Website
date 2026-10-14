"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Trang hiển thị toàn màn hình, không có header/footer của site (vd. đăng nhập). */
const FULLSCREEN_PATHS = ["/dang-nhap"];

/** Ẩn phần khung chung (header, footer, banner) ở các trang toàn màn hình. */
export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return FULLSCREEN_PATHS.includes(pathname) ? null : <>{children}</>;
}
