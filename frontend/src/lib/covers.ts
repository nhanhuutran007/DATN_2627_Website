import type { IconName } from "@/components/ui/Icon";
import { resolveMediaUrl } from "@/lib/api";
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
    return { src: resolveMediaUrl(campaign.imageUrl), alt: `Ảnh dự án: ${campaign.title}`, illustrative: false };
  }
  return { ...COVERS[campaign.image], illustrative: true };
}

export function coverByKey(key: CoverKey) {
  return COVERS[key];
}

const CATEGORY_ICONS: Record<string, IconName> = {
  "Giáo dục": "book",
  "Môi trường": "leaf",
  "Nông nghiệp": "sprout",
  "Y tế": "heart",
  "Khởi nghiệp": "rocket",
  "Văn hóa nghệ thuật": "palette",
  "Công nghệ": "cpu",
};

/** Icon minh họa cho lĩnh vực; lĩnh vực admin mới tạo dùng icon chung. */
export function categoryIcon(category: string): IconName {
  return CATEGORY_ICONS[category] ?? "grid";
}
