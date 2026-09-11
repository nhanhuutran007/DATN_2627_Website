import type { Metadata } from "next";
import { Be_Vietnam_Pro, Roboto_Condensed } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import "./globals.css";
import "./pages.css";
import "./design-system.css";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Roboto_Condensed({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="vi" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
