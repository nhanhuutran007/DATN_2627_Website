import type { IconName } from "@/components/ui/Icon";
import { resolveMediaUrl } from "@/lib/api";
import { hasCategoryImages, imageByCategory } from "@/lib/api/campaigns";
import type { Campaign } from "@/lib/data/campaigns";

type CoverKey = Campaign["image"];

/** Ảnh minh họa theo lĩnh vực (không phải ảnh thật của từng dự án). */
const COVERS: Record<CoverKey, { src: string; alt: string }> = {
  mangrove: { src: "/images/cover-mangrove.webp", alt: "Rừng ngập mặn ven đảo Hoàng Tân, Quảng Ninh" },
  beach: { src: "/images/cover-beach.webp", alt: "Thanh niên tình nguyện thu gom rác trên bãi biển vịnh Hạ Long" },
  farm: { src: "/images/cover-farm.webp", alt: "Người nông dân dắt trâu trên ruộng lúa ở Hạ Thành, Hà Giang" },
  highland: { src: "/images/cover-highland.webp", alt: "Người phụ nữ dân tộc làm nương trên sườn đồi ở Đồng Văn" },
  startup: { src: "/images/cover-startup.webp", alt: "Nhóm bạn trẻ làm việc tại không gian làm việc chung ở Hà Nội" },
  market: { src: "/images/cover-market.webp", alt: "Gian hàng thổ cẩm thủ công ở chợ phiên Bắc Hà" },
  computer: { src: "/images/cover-computer.webp", alt: "Sinh viên thực hành trong phòng máy tính" },
  robot: { src: "/images/cover-robot.webp", alt: "Sinh viên thi đấu tại Cuộc thi Sáng tạo Robot Việt Nam ở Huế" },
  library: { src: "/images/cover-library.webp", alt: "Học sinh vùng cao trong lớp học ở Bát Xát, Lào Cai" },
  reading: { src: "/images/cover-reading.webp", alt: "Hai học sinh tiểu học đọc sách trong thư viện" },
  health: { src: "/images/cover-health.webp", alt: "Nhân viên y tế đo thị lực cho trẻ mẫu giáo ở Quốc Oai, Hà Nội" },
  clinic: { src: "/images/cover-clinic.webp", alt: "Bác sĩ khám bệnh cho một cụ ông ở Bắc Ninh" },
  music: { src: "/images/cover-music.webp", alt: "Nghệ nhân người Tày hát Then cùng đàn tính" },
  lantern: { src: "/images/cover-lantern.webp", alt: "Đèn lồng thủ công tại một xưởng ở Hội An" },
  solar: { src: "/images/cover-solar.webp", alt: "Hệ thống pin năng lượng mặt trời trên mái nhà xưởng" },
  swim: { src: "/images/cover-swim.webp", alt: "Học sinh Việt Nam tập bơi trong bể bơi lắp ghép tại trường" },
  coffee: { src: "/images/cover-coffee.webp", alt: "Cây cà phê trổ hoa trên đất đỏ bazan ở Gia Lai" },
  bees: { src: "/images/cover-bees.webp", alt: "Thùng nuôi ong mật dưới tán cây ở Trân Châu, Cát Bà" },
  meal: { src: "/images/cover-meal.webp", alt: "Các em học sinh vùng cao chia nhau bữa quà giờ ra chơi" },
  vegetable: { src: "/images/cover-vegetable.webp", alt: "Người nông dân xới đất trên luống rau" },
  seedling: { src: "/images/cover-seedling.webp", alt: "Giàn rau thủy canh trong nhà kính ở Đà Lạt" },
  graduate: { src: "/images/cover-graduate.webp", alt: "Sinh viên Đại học Đông Á ở Đà Nẵng mừng lễ tốt nghiệp" },
  water: { src: "/images/cover-water.webp", alt: "Giếng nước xây bằng đá ong ở làng quê Việt Nam" },
  bridge: { src: "/images/cover-bridge.webp", alt: "Cầu khỉ bằng tre bắc qua kênh ở Mỹ Tho" },
  relief: { src: "/images/cover-relief.webp", alt: "Gia đình được hỗ trợ sau lũ ở Long An" },
  elderly: { src: "/images/cover-elderly.webp", alt: "Cụ bà ngồi trò chuyện cùng các cháu nhỏ" },
  wheelchair: { src: "/images/cover-wheelchair.webp", alt: "Lễ trao xe lăn cho người khuyết tật ở Đà Nẵng" },
  housing: { src: "/images/cover-housing.webp", alt: "Căn nhà sàn tạm bợ trên kênh cần được cải thiện" },
  wildlife: { src: "/images/cover-wildlife.webp", alt: "Voọc chà vá chân xám tại Trung tâm cứu hộ linh trưởng Cúc Phương" },
  football: { src: "/images/cover-football.webp", alt: "Các em nhỏ đá bóng trên sân cộng đồng ở Hà Nội" },
  memorial: { src: "/images/cover-memorial.webp", alt: "Đài tưởng niệm tại Nghĩa trang liệt sĩ Trường Sơn" },
  catru: { src: "/images/cover-catru.webp", alt: "Biểu diễn ca trù ở Hà Nội" },
  studio: { src: "/images/cover-studio.webp", alt: "Máy quay trong trường quay S14 của Đài Truyền hình Việt Nam" },
  aodai: { src: "/images/cover-aodai.webp", alt: "Trưng bày áo dài và vải lụa tại Festival Hoa Đà Lạt" },
  streetfood: { src: "/images/cover-streetfood.webp", alt: "Gánh chè và hoa quả dầm gần cầu Trường Tiền, Huế" },
  homestay: { src: "/images/cover-homestay.webp", alt: "Nhà sàn của người Tày làm homestay bên sông ở Pác Ngòi, Ba Bể" },
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

/**
 * Ảnh đại diện lĩnh vực: ảnh admin tải lên nếu có, không thì ảnh minh họa có sẵn của lĩnh vực;
 * `null` khi lĩnh vực mới tạo chưa có ảnh nào (giao diện hiện icon).
 */
export function categoryCover(
  category: string,
  imageUrl?: string | null,
): { src: string; alt: string; uploaded: boolean } | null {
  if (imageUrl) return { src: resolveMediaUrl(imageUrl), alt: `Ảnh lĩnh vực ${category}`, uploaded: true };
  if (!hasCategoryImages(category)) return null;
  return { ...COVERS[imageByCategory(category)], uploaded: false };
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
