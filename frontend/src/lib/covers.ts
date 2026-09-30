import type { IconName } from "@/components/ui/Icon";
import type { Campaign } from "@/lib/data/campaigns";

type CoverKey = Campaign["image"];

/** Ảnh minh họa theo lĩnh vực (không phải ảnh thật của từng dự án). */
const COVERS: Record<CoverKey, { src: string; alt: string }> = {
  mangrove: { src: "/images/cover-mangrove.webp", alt: "Tình nguyện viên trồng cây ngập mặn trên bãi bồi" },
  startup: { src: "/images/cover-startup.webp", alt: "Nhóm bạn trẻ làm việc tại không gian làm việc chung ở Hà Nội" },
  library: { src: "/images/cover-library.webp", alt: "Học sinh vùng cao trong lớp học ở Bát Xát, Lào Cai" },
  health: { src: "/images/cover-health.webp", alt: "Khám mắt miễn phí cho người dân tại một điểm khám cộng đồng" },
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
