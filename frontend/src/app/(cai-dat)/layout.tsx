import type { ReactNode } from "react";

import { AccountShell } from "@/features/profile/AccountShell";

/**
 * Layout chung của trang Cài đặt (/ho-so, /thong-bao): khung tiêu đề + tab nằm ở đây nên được
 * giữ nguyên khi đổi tab — Next chỉ thay phần trang bên trong, không dựng lại cả trang.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
