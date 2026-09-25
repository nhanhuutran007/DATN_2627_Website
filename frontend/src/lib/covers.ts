import type { IconName } from "@/components/ui/Icon";
import type { Campaign } from "@/lib/data/campaigns";

type CoverKey = Campaign["image"];

/** Ảnh minh họa theo lĩnh vực (không phải ảnh thật của từng dự án). */
const COVERS: Record<CoverKey, { src: string; alt: string }> = {
  mangrove: { src: "/images/cover-mangrove.webp", alt: "Tình nguyện viên trồng cây ngập mặn ven biển" },
  startup: { src: "/images/cover-startup.webp", alt: "Nhóm khởi nghiệp làm việc cùng nhau" },
  library: { src: "/images/cover-library.webp", alt: "Học sinh đọc sách trong thư viện" },
  health: { src: "/images/cover-health.webp", alt: "Nhân viên y tế chăm sóc người dân" },
};

export function coverFor(campaign: Pick<Campaign, "image" | "imageUrl" | "title">): {
  src: string;
  alt: string;
  illustrative: boolean;
} {
  if (campaign.imageUrl) {
    return { src: campaign.imageUrl, alt: `Ảnh dự án: ${campaign.title}`, illustrative: false };
  }
  return { ...COVERS[campaign.image], illustrative: true };
}

export function coverByKey(key: CoverKey) {
  return COVERS[key];
}

export function categoryIcon(category: string): IconName {
  switch (category) {
    case "Giáo dục":
      return "document";
    case "Y tế":
      return "heart";
    case "Khởi nghiệp":
    case "Công nghệ":
      return "rocket";
    case "Môi trường":
    case "Nông nghiệp":
    default:
      return "leaf";
  }
}
