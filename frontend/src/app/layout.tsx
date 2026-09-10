import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import "./globals.css";
import "./pages.css";

export const metadata: Metadata = {
  title: {
    default: "Góp Mầm – Góp niềm tin, gieo thay đổi",
    template: "%s | Góp Mầm",
  },
  description: "Nền tảng gây quỹ minh bạch cho các dự án xã hội và khởi nghiệp Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
