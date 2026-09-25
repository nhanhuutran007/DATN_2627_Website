import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteUrl } from "@/lib/site";

import "./theme.css";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Montserrat({
  subsets: ["vietnamese", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const description =
  "Góp Mầm là nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp: hồ sơ được kiểm duyệt, giao dịch được xác nhận và chi tiêu báo cáo theo từng mốc.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Góp Mầm – Nền tảng gây quỹ cộng đồng minh bạch",
    template: "%s | Góp Mầm",
  },
  description,
  applicationName: "Góp Mầm",
  keywords: ["gây quỹ cộng đồng", "crowdfunding", "dự án xã hội", "khởi nghiệp", "từ thiện minh bạch"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Góp Mầm",
    title: "Góp Mầm – Nền tảng gây quỹ cộng đồng minh bạch",
    description,
    images: [{ url: "/images/cover-mangrove.webp", width: 768, height: 512, alt: "Tình nguyện viên trồng cây ngập mặn" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#141c33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <a className="skip-link" href="#noi-dung">Bỏ qua điều hướng</a>
        <SiteHeader />
        <div id="noi-dung">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
