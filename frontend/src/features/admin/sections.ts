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
      { slug: "to-chuc", label: "Xác minh tổ chức", title: "Xác minh tổ chức", icon: "document" },
      { slug: "rui-ro", label: "Cảnh báo rủi ro", title: "Cảnh báo rủi ro", icon: "shield" },
      { slug: "bao-cao", label: "Báo cáo & bình luận", title: "Báo cáo & bình luận", icon: "flag" },
    ],
  },
  {
    label: "Tài chính",
    sections: [
      { slug: "giao-dich", label: "Giao dịch", title: "Giao dịch", icon: "receipt" },
      { slug: "hoan-rut-tien", label: "Hoàn & rút tiền", title: "Hoàn tiền & rút tiền ví", icon: "wallet" },
      { slug: "doi-soat", label: "Đối soát", title: "Đối soát giao dịch", icon: "scale" },
    ],
  },
  {
    label: "Hệ thống",
    sections: [
      { slug: "nguoi-dung", label: "Người dùng", title: "Người dùng", icon: "users" },
      { slug: "cai-dat", label: "Cài đặt", title: "Cài đặt hệ thống", icon: "settings" },
      { slug: "nhat-ky-kiem-toan", label: "Nhật ký kiểm toán", title: "Nhật ký kiểm toán", icon: "clock" },
    ],
  },
];

/**
 * Mục gộp nhiều phần: mở `/admin/<mục>?tab=<phần>` (tab đầu là mặc định, không cần `?tab=`).
 * Link cũ của từng phần (`/admin/hoan-tien`, `/admin/danh-muc`…) chuyển hướng trong next.config.ts.
 */
export type AdminTab = { slug: string; label: string; icon: IconName };

export const SECTION_TABS: Record<string, AdminTab[]> = {
  "bao-cao": [
    { slug: "vi-pham", label: "Báo cáo vi phạm", icon: "flag" },
    { slug: "binh-luan", label: "Bình luận", icon: "message" },
  ],
  "hoan-rut-tien": [
    { slug: "hoan-tien", label: "Hoàn tiền", icon: "wallet" },
    { slug: "rut-tien", label: "Rút tiền ví", icon: "send" },
  ],
  "cai-dat": [
    { slug: "linh-vuc", label: "Lĩnh vực", icon: "tag" },
    { slug: "email", label: "Email", icon: "bell" },
    { slug: "lien-he", label: "Liên hệ hỗ trợ", icon: "mail" },
    { slug: "sao-luu", label: "Sao lưu", icon: "database" },
  ],
};

export function sectionTabHref(section: string, tab: string): string {
  const first = SECTION_TABS[section]?.[0]?.slug;
  return !tab || tab === first ? adminHref(section) : `${adminHref(section)}?tab=${tab}`;
}

export const ADMIN_SECTIONS: AdminSection[] = ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);

export function adminHref(slug: string): string {
  return slug ? `/admin/${slug}` : "/admin";
}

export function findAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section.slug === slug);
}
