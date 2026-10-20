import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Mục "Xuất thống kê" đã gộp vào trang Tổng quan quản trị; giữ link cũ còn dùng được.
  async redirects() {
    return [{ source: "/admin/xuat-thong-ke", destination: "/admin#xuat-thong-ke", permanent: true }];
  },
};

export default nextConfig;
