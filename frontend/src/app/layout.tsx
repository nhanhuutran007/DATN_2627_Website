import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Nền tảng gây quỹ cộng đồng",
  description: "Gây quỹ minh bạch cho các dự án xã hội và khởi nghiệp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
