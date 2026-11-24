import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      // Mục "Xuất thống kê" đã gộp vào trang Tổng quan quản trị; giữ link cũ còn dùng được.
      { source: "/admin/xuat-thong-ke", destination: "/admin#xuat-thong-ke", permanent: true },
      // Lĩnh vực, email, liên hệ hỗ trợ, sao lưu đã gộp vào mục "Cài đặt".
      { source: "/admin/danh-muc", destination: "/admin/cai-dat", permanent: true },
      { source: "/admin/cai-dat-email", destination: "/admin/cai-dat?tab=email", permanent: true },
      { source: "/admin/lien-he", destination: "/admin/cai-dat?tab=lien-he", permanent: true },
      { source: "/admin/sao-luu", destination: "/admin/cai-dat?tab=sao-luu", permanent: true },
      // Báo cáo vi phạm + bình luận; hoàn tiền + rút tiền ví đã gộp thành mục có tab.
      { source: "/admin/bao-cao-vi-pham", destination: "/admin/bao-cao", permanent: true },
      { source: "/admin/binh-luan", destination: "/admin/bao-cao?tab=binh-luan", permanent: true },
      { source: "/admin/hoan-tien", destination: "/admin/hoan-rut-tien", permanent: true },
      { source: "/admin/rut-tien", destination: "/admin/hoan-rut-tien?tab=rut-tien", permanent: true },
    ];
  },
};

export default nextConfig;
