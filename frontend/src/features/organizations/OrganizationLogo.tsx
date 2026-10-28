import type { CSSProperties } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { resolveMediaUrl } from "@/lib/api";
import { foldVietnamese } from "@/lib/api/campaigns";

type OrganizationLogoProps = {
  organization: { name: string; logoUrl?: string | null };
  size?: "sm" | "md" | "lg";
};

type LogoTheme = { from: string; to: string; icon: IconName };

/**
 * Bảng màu theo lĩnh vực, đoán từ tên tổ chức (tóm tắt chiến dịch không kèm lĩnh vực của tổ chức,
 * nên chỉ dựa vào tên để mọi nơi hiển thị cùng một biểu tượng).
 */
const THEMES: Array<{ pattern: RegExp; theme: LogoTheme }> = [
  { pattern: /rung|moi truong|bien|xanh hoa|tai che|bao ton|sinh thai/, theme: { from: "#0f766e", to: "#34d399", icon: "leaf" } },
  { pattern: /thay thuoc|y te|benh|suc khoe|bac si|cham soc/, theme: { from: "#be123c", to: "#fb7185", icon: "heart" } },
  { pattern: /hoc|giao duc|truong|sinh vien|tri thuc|sach/, theme: { from: "#1d4ed8", to: "#60a5fa", icon: "book" } },
  { pattern: /nong|lua|ca phe|nong dan|hop tac xa/, theme: { from: "#b45309", to: "#fbbf24", icon: "sprout" } },
  { pattern: /van hoa|nghe thuat|di san|am nhac/, theme: { from: "#7e22ce", to: "#e879f9", icon: "palette" } },
  { pattern: /cong nghe|so hoa|ky thuat|robot/, theme: { from: "#4338ca", to: "#818cf8", icon: "cpu" } },
];

/** Không đoán được lĩnh vực: chọn cố định theo tên trong các tông này để mỗi tổ chức một màu. */
const FALLBACK_THEMES: LogoTheme[] = [
  { from: "#0e7490", to: "#22d3ee", icon: "users" },
  { from: "#c2410c", to: "#fb923c", icon: "users" },
  { from: "#9d174d", to: "#f472b6", icon: "users" },
  { from: "#3f6212", to: "#a3e635", icon: "users" },
];

/** Từ chỉ loại hình ở đầu tên, bỏ qua khi lấy chữ viết tắt. */
const GENERIC_PREFIX = /^(quy|hoi|trung tam|to chuc|cau lac bo|clb|mang luoi|hop tac xa|cong ty|vien|nhom|du an)\s+/;

function themeFor(name: string): LogoTheme {
  const folded = foldVietnamese(name);
  const match = THEMES.find((item) => item.pattern.test(folded));
  if (match) return match.theme;
  let hash = 0;
  for (const char of folded) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_THEMES[hash % FALLBACK_THEMES.length];
}

/** Hai chữ cái của phần tên riêng ở cuối (vd. "… Cửu Long" → CL, "Quỹ Học bổng Mầm Xanh" → MX). */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/);
  const prefixWords = (foldVietnamese(words.join(" ")).match(GENERIC_PREFIX)?.[0].trim().split(/\s+/).length) ?? 0;
  const rest = words.slice(prefixWords).filter(Boolean);
  const proper = rest.filter((word) => word[0] === word[0].toLocaleUpperCase("vi") && /\p{L}/u.test(word[0]));
  const picked = proper.length >= 2 ? proper.slice(-2) : rest.slice(0, 2);
  const initials = picked.map((word) => word[0]).join("").toLocaleUpperCase("vi");
  return initials || (name.trim()[0]?.toLocaleUpperCase("vi") ?? "?");
}

/** Logo tổ chức; chưa có logo thì hiện chữ viết tắt trên nền chuyển sắc theo lĩnh vực, kèm biểu tượng mờ. */
export function OrganizationLogo({ organization, size = "md" }: OrganizationLogoProps) {
  const className = size === "md" ? "org-logo" : `org-logo org-logo-${size}`;
  if (organization.logoUrl) {
    return (
      <span className={className} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên, đường dẫn động */}
        <img src={resolveMediaUrl(organization.logoUrl)} alt="" />
      </span>
    );
  }
  const theme = themeFor(organization.name);
  const style = { "--org-from": theme.from, "--org-to": theme.to } as CSSProperties;
  return (
    <span className={`${className} org-logo-mark`} style={style} aria-hidden="true">
      <Icon className="org-logo-icon" name={theme.icon} size={64} />
      <span className="org-logo-initials">{initialsFor(organization.name)}</span>
    </span>
  );
}
