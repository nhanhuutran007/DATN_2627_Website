import type { IconName } from "@/components/ui/Icon";

/** Mỗi mục trên sidebar quản trị là một trang riêng: "" là /admin, còn lại là /admin/<slug>. */
export type AdminSection = {
  slug: string;
  label: string;
  title: string;
  icon: IconName;
};

/** Nhóm trên sidebar; nhóm không có tiêu đề (Tổng quan) đứng đầu. */
export type AdminSectionGroup = {
  label?: string;
  sections: AdminSection[];
};

export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    sections: [{ slug: "", label: "Tổng quan", title: "Tổng quan hệ thống", icon: "grid" }],
  },
  {
    label: "Kiểm duyệt",
    sections: [
      { slug: "cho-duyet", label: "Duyệt chiến dịch", title: "Duyệt chiến dịch", icon: "clipboard-check" },
      { slug: "rui-ro", label: "Cảnh báo rủi ro", title: "Cảnh báo rủi ro", icon: "shield" },
      { slug: "bao-cao-vi-pham", label: "Báo cáo vi phạm", title: "Báo cáo vi phạm", icon: "flag" },
      { slug: "binh-luan", label: "Bình luận", title: "Kiểm duyệt bình luận", icon: "message" },
    ],
  },
  {
    label: "Tài chính",
    sections: [
      { slug: "giao-dich", label: "Giao dịch", title: "Giao dịch", icon: "receipt" },
      { slug: "hoan-tien", label: "Hoàn tiền", title: "Yêu cầu hoàn tiền", icon: "wallet" },
      { slug: "doi-soat", label: "Đối soát", title: "Đối soát giao dịch", icon: "scale" },
    ],
  },
  {
    label: "Hệ thống",
    sections: [
      { slug: "nguoi-dung", label: "Người dùng", title: "Người dùng", icon: "users" },
      { slug: "danh-muc", label: "Lĩnh vực", title: "Lĩnh vực", icon: "tag" },
      { slug: "sao-luu", label: "Sao lưu dữ liệu", title: "Sao lưu & khôi phục dữ liệu", icon: "database" },
      { slug: "nhat-ky-kiem-toan", label: "Nhật ký kiểm toán", title: "Nhật ký kiểm toán", icon: "clock" },
    ],
  },
];

export const ADMIN_SECTIONS: AdminSection[] = ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);

export function adminHref(slug: string): string {
  return slug ? `/admin/${slug}` : "/admin";
}

export function findAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section.slug === slug);
}
