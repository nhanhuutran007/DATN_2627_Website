import { DataSource, In } from "typeorm";

import { createSeedDataSource } from "./seed-data-source";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { RewardRecipient } from "../src/modules/donations/entities/reward-recipient.entity";
import { MemberStatus, OrganizationMember } from "../src/modules/organizations/entities/organization-member.entity";
import {
  Organization,
  OrganizationStatus,
  OrganizationType,
} from "../src/modules/organizations/entities/organization.entity";
import { RewardItem, RewardTier } from "../src/modules/rewards/entities/reward-tier.entity";
import { User } from "../src/modules/users/entities/user.entity";

/**
 * Dữ liệu mẫu bổ sung: cộng tác viên tổ chức, thêm một tổ chức đã xác minh, các dự án do
 * tổ chức thực hiện và các mức quà tặng (kèm người đã chọn quà).
 *
 * Chạy lặp lại an toàn: phần nào đã có (theo email/slug/tiêu đề) thì bỏ qua, nên dùng được
 * cả trên DB đã seed sẵn (`npm run seed:extras`) lẫn ở cuối `seed.ts`.
 */

const DAY_MS = 86_400_000;
const M = 1_000_000;

type Perms = { profile?: boolean; posts?: boolean; progress?: boolean; rewards?: boolean };

type MemberSeed = {
  org: string;
  email: string;
  title: string;
  status: MemberStatus;
  perms: Perms;
  invitedDaysAgo: number;
};

type CampaignSeed = {
  org: string;
  ownerEmail: string;
  title: string;
  description: string;
  category: string;
  location: string;
  goal: number;
  status: CampaignStatus;
  startedDaysAgo: number;
  durationDays: number;
  fundedRatio: number;
  conversion: number;
};

type TierSeed = {
  title: string;
  description: string;
  minAmount: number;
  quantityLimit?: number;
  requiresShipping: boolean;
  items: RewardItem[];
  imageUrl?: string;
  /** Số ngày sau khi chiến dịch kết thúc thì giao quà. */
  deliveryAfterEndDays: number;
  /** Ưu đãi sớm: hết hạn chọn sau N ngày kể từ hôm nay. */
  availableForDays?: number;
};

// Tổ chức đã xác minh thứ 5 (số giấy phép là dữ liệu giả), người đại diện user7.
const EXTRA_ORGANIZATION = {
  name: "Trung tâm Giáo dục Kỹ năng sống Hướng Dương",
  slug: "trung-tam-ky-nang-song-huong-duong",
  type: OrganizationType.EDUCATION,
  registrationNumber: "DEMO-77/QĐ-SGDĐT",
  issuedBy: "Sở GD&ĐT Đà Nẵng (dữ liệu mẫu)",
  category: "Giáo dục",
  mission:
    "Mang lớp kỹ năng sống, an toàn và phòng chống xâm hại miễn phí tới học sinh tiểu học ngoại thành, cùng tập huấn cho giáo viên và phụ huynh.",
  province: "Đà Nẵng",
  address: "41 Hàm Nghi, Thanh Khê",
  representativeEmail: "user7@gopmam.com",
  verifiedDaysAgo: 30,
};

// Người đại diện (đã có từ seed gốc): Mầm Xanh = user3, Rừng ngập mặn = user4, Thầy thuốc = user5.
// Chủ dự án của các chiến dịch tổ chức đều là cộng tác viên đang hoạt động, để quyền theo tổ chức có hiệu lực.
const MEMBERS: MemberSeed[] = [
  { org: "quy-hoc-bong-mam-xanh", email: "owner1@gopmam.com", title: "Điều phối dự án", status: MemberStatus.ACTIVE, perms: { posts: true, progress: true, rewards: true }, invitedDaysAgo: 150 },
  { org: "quy-hoc-bong-mam-xanh", email: "user1@gopmam.com", title: "Phụ trách truyền thông", status: MemberStatus.ACTIVE, perms: { profile: true, posts: true }, invitedDaysAgo: 90 },
  { org: "quy-hoc-bong-mam-xanh", email: "user8@gopmam.com", title: "Tình nguyện viên điều phối học bổng", status: MemberStatus.PENDING, perms: { posts: true }, invitedDaysAgo: 2 },
  { org: "trung-tam-bao-ton-rung-ngap-man-cuu-long", email: "owner3@gopmam.com", title: "Kỹ sư hiện trường", status: MemberStatus.ACTIVE, perms: { posts: true, progress: true, rewards: true }, invitedDaysAgo: 40 },
  { org: "trung-tam-bao-ton-rung-ngap-man-cuu-long", email: "user2@gopmam.com", title: "Kế toán dự án", status: MemberStatus.ACTIVE, perms: { progress: true }, invitedDaysAgo: 35 },
  { org: "hoi-thay-thuoc-tinh-nguyen-nghe-an", email: "owner1@gopmam.com", title: "Điều phối xe khám lưu động", status: MemberStatus.ACTIVE, perms: { posts: true, progress: true, rewards: true }, invitedDaysAgo: 65 },
  { org: "hoi-thay-thuoc-tinh-nguyen-nghe-an", email: "user6@gopmam.com", title: "Thư ký hội", status: MemberStatus.ACTIVE, perms: { profile: true, posts: true }, invitedDaysAgo: 50 },
  { org: "hoi-thay-thuoc-tinh-nguyen-nghe-an", email: "user1@gopmam.com", title: "Tình nguyện viên hậu cần", status: MemberStatus.PENDING, perms: { rewards: true }, invitedDaysAgo: 1 },
  { org: "trung-tam-ky-nang-song-huong-duong", email: "owner2@gopmam.com", title: "Quản lý chương trình", status: MemberStatus.ACTIVE, perms: { profile: true, posts: true, progress: true, rewards: true }, invitedDaysAgo: 28 },
  { org: "trung-tam-ky-nang-song-huong-duong", email: "user3@gopmam.com", title: "Cố vấn tài chính", status: MemberStatus.ACTIVE, perms: { progress: true }, invitedDaysAgo: 20 },
];

const ORG_CAMPAIGNS: CampaignSeed[] = [
  { org: "quy-hoc-bong-mam-xanh", ownerEmail: "owner1@gopmam.com", title: "Áo ấm và chăn mùa đông cho học sinh bán trú", description: "Trao 400 bộ áo ấm, chăn và tất len cho học sinh bán trú ở 5 điểm trường vùng cao trước đợt rét đậm, danh sách nhận do nhà trường xác nhận.", category: "Giáo dục", location: "Hà Giang", goal: 45 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 12, durationDays: 40, fundedRatio: 0.48, conversion: 0.05 },
  { org: "quy-hoc-bong-mam-xanh", ownerEmail: "owner1@gopmam.com", title: "Học bổng học nghề cho thanh niên dân tộc thiểu số", description: "20 suất học bổng toàn phần khóa học nghề điện dân dụng và sửa xe máy 6 tháng, kèm giới thiệu việc làm sau tốt nghiệp.", category: "Giáo dục", location: "Điện Biên", goal: 160 * M, status: CampaignStatus.PENDING, startedDaysAgo: 1, durationDays: 60, fundedRatio: 0, conversion: 0 },
  { org: "trung-tam-bao-ton-rung-ngap-man-cuu-long", ownerEmail: "owner3@gopmam.com", title: "Vườn ươm 20.000 cây đước giống", description: "Dựng vườn ươm cây đước giống cùng hợp tác xã ngư dân, cung cấp cây cho các đợt trồng rừng ngập mặn năm sau và tạo thu nhập cho 12 hộ.", category: "Môi trường", location: "Cà Mau", goal: 70 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 20, durationDays: 50, fundedRatio: 0.63, conversion: 0.06 },
  { org: "trung-tam-bao-ton-rung-ngap-man-cuu-long", ownerEmail: "owner3@gopmam.com", title: "Trạm đo độ mặn cảnh báo sớm cho vùng nuôi tôm", description: "Lắp 6 trạm đo độ mặn tự động, gửi cảnh báo qua Zalo cho 300 hộ nuôi tôm để chủ động lấy nước, giảm thiệt hại mùa khô.", category: "Môi trường", location: "Sóc Trăng", goal: 130 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 115, durationDays: 55, fundedRatio: 1.09, conversion: 0.05 },
  { org: "hoi-thay-thuoc-tinh-nguyen-nghe-an", ownerEmail: "owner1@gopmam.com", title: "Khám mắt và tặng kính cho học sinh miền núi", description: "Khám khúc xạ cho 2.000 học sinh 8 trường miền núi, cắt kính miễn phí cho em bị cận và chuyển tuyến các ca cần điều trị.", category: "Y tế", location: "Nghệ An", goal: 85 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 6, durationDays: 45, fundedRatio: 0.22, conversion: 0.04 },
  { org: "hoi-thay-thuoc-tinh-nguyen-nghe-an", ownerEmail: "owner1@gopmam.com", title: "Tiêm phòng cúm cho người cao tuổi neo đơn", description: "Tiêm vắc xin cúm mùa miễn phí cho 1.500 người cao tuổi neo đơn tại 10 xã, có khám sàng lọc trước tiêm.", category: "Y tế", location: "Hà Tĩnh", goal: 110 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 130, durationDays: 45, fundedRatio: 1.04, conversion: 0.05 },
  { org: "trung-tam-ky-nang-song-huong-duong", ownerEmail: "owner2@gopmam.com", title: "Lớp kỹ năng phòng chống xâm hại cho học sinh tiểu học", description: "40 buổi học kỹ năng tự bảo vệ bằng trò chơi và kịch tương tác cho 3.000 học sinh tiểu học ngoại thành, kèm tài liệu cho phụ huynh.", category: "Giáo dục", location: "Đà Nẵng", goal: 60 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 16, durationDays: 45, fundedRatio: 0.71, conversion: 0.06 },
];

/** Mức quà theo tiêu đề chiến dịch (cả chiến dịch cũ của seed gốc lẫn dự án tổ chức mới). */
const REWARD_TIERS: Record<string, TierSeed[]> = {
  "Xây dựng thư viện cộng đồng cho trẻ em vùng cao": [
    { title: "Tên bạn trên bảng vinh danh", description: "Tên của bạn (hoặc tên bạn muốn tặng) được ghi trên bảng vinh danh đặt tại cửa thư viện.", minAmount: 100_000, requiresShipping: false, items: [{ name: "Tên trên bảng vinh danh", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Bộ bưu thiếp tranh thiếu nhi", description: "5 bưu thiếp in tranh do các em ở Bản Hồ vẽ, kèm thư cảm ơn viết tay.", minAmount: 300_000, quantityLimit: 100, requiresShipping: true, imageUrl: "/images/cover-reading.webp", items: [{ name: "Bưu thiếp tranh thiếu nhi", quantity: 5 }, { name: "Thư cảm ơn viết tay", quantity: 1 }], deliveryAfterEndDays: 45 },
    { title: "Một kệ sách mang tên bạn", description: "Một kệ sách trong thư viện gắn biển tên bạn, kèm album ảnh ngày khai trương gửi qua email.", minAmount: 1_000_000, quantityLimit: 40, requiresShipping: false, imageUrl: "/images/cover-library.webp", items: [{ name: "Biển tên trên kệ sách", quantity: 1 }, { name: "Album ảnh khai trương (bản số)", quantity: 1 }], deliveryAfterEndDays: 60 },
  ],
  "Hỗ trợ nông dân trồng rau sạch hữu cơ": [
    { title: "Ưu đãi sớm: hộp rau hữu cơ 3 kg", description: "Hộp rau củ hữu cơ theo mùa từ chính các hộ tham gia dự án, giao trong nội thành.", minAmount: 250_000, quantityLimit: 60, requiresShipping: true, imageUrl: "/images/cover-vegetable.webp", items: [{ name: "Rau củ hữu cơ theo mùa (kg)", quantity: 3 }], deliveryAfterEndDays: 20, availableForDays: 6 },
    { title: "Gói rau 4 tuần", description: "Mỗi tuần một hộp rau 3 kg trong 4 tuần liên tiếp, kèm sổ tay canh tác hữu cơ tại nhà.", minAmount: 800_000, quantityLimit: 30, requiresShipping: true, imageUrl: "/images/cover-farm.webp", items: [{ name: "Hộp rau 3 kg giao hằng tuần", quantity: 4 }, { name: "Sổ tay canh tác hữu cơ", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Một ngày làm nông tại Lâm Đồng", description: "Một ngày trải nghiệm tại vườn: tự tay thu hoạch, học ủ phân hữu cơ và dùng bữa trưa cùng bà con (tự túc đi lại).", minAmount: 2_000_000, quantityLimit: 10, requiresShipping: false, items: [{ name: "Buổi trải nghiệm tại vườn", quantity: 1 }, { name: "Bữa trưa cùng nông dân", quantity: 1 }], deliveryAfterEndDays: 60 },
  ],
  "Phòng khám lưu động cho người cao tuổi": [
    { title: "Thẻ cảm ơn điện tử", description: "Thẻ cảm ơn điện tử từ Hội Thầy thuốc tình nguyện, gửi qua email.", minAmount: 100_000, requiresShipping: false, items: [{ name: "Thẻ cảm ơn điện tử", quantity: 1 }], deliveryAfterEndDays: 7 },
    { title: "Bảo trợ một buổi khám", description: "Khoản ủng hộ đủ chi phí khám và thuốc cơ bản cho một cụ; bạn nhận báo cáo ảnh buổi khám.", minAmount: 500_000, requiresShipping: false, imageUrl: "/images/cover-clinic.webp", items: [{ name: "Báo cáo ảnh buổi khám (bản số)", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Áo đồng hành Thầy thuốc tình nguyện", description: "Áo thun cotton in logo chương trình, cùng thư cảm ơn của các y bác sĩ.", minAmount: 1_000_000, quantityLimit: 80, requiresShipping: true, imageUrl: "/images/cover-health.webp", items: [{ name: "Áo thun đồng hành", quantity: 1 }, { name: "Thư cảm ơn", quantity: 1 }], deliveryAfterEndDays: 40 },
  ],
  "Trồng 10.000 cây ngập mặn chắn sóng": [
    { title: "Một cây đước mang tên bạn", description: "Một cây đước được trồng và gắn mã theo dõi; bạn nhận chứng nhận trồng cây điện tử.", minAmount: 100_000, requiresShipping: false, items: [{ name: "Chứng nhận trồng cây (bản số)", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Gói 10 cây và túi vải canh rừng", description: "10 cây đước mang tên bạn cùng túi vải in hình rừng ngập mặn do phụ nữ địa phương may.", minAmount: 500_000, quantityLimit: 200, requiresShipping: true, imageUrl: "/images/cover-mangrove.webp", items: [{ name: "Cây đước mang tên bạn", quantity: 10 }, { name: "Túi vải canh rừng", quantity: 1 }], deliveryAfterEndDays: 45 },
    { title: "Chuyến đi trồng rừng cùng đội", description: "Tham gia một đợt trồng rừng thực địa cùng đội kỹ sư và ngư dân (gồm xuồng, ăn trưa, áo phao).", minAmount: 3_000_000, quantityLimit: 15, requiresShipping: false, items: [{ name: "Đợt trồng rừng thực địa", quantity: 1 }], deliveryAfterEndDays: 60 },
  ],
  "Áo ấm và chăn mùa đông cho học sinh bán trú": [
    { title: "Tặng một bộ áo ấm", description: "Đủ chi phí một bộ áo ấm, chăn và tất len cho một em; bạn nhận ảnh trao quà qua email.", minAmount: 150_000, requiresShipping: false, imageUrl: "/images/cover-highland.webp", items: [{ name: "Ảnh trao quà (bản số)", quantity: 1 }], deliveryAfterEndDays: 20 },
    { title: "Khăn len thổ cẩm", description: "Khăn len dệt hoa văn thổ cẩm do phụ huynh học sinh làm, gửi kèm thư cảm ơn của các em.", minAmount: 500_000, quantityLimit: 50, requiresShipping: true, items: [{ name: "Khăn len thổ cẩm", quantity: 1 }, { name: "Thư cảm ơn của học sinh", quantity: 1 }], deliveryAfterEndDays: 35 },
  ],
  "Vườn ươm 20.000 cây đước giống": [
    { title: "Bảo trợ 50 cây giống", description: "50 cây giống trong vườn ươm mang mã của bạn, cập nhật tỷ lệ sống mỗi quý.", minAmount: 200_000, requiresShipping: false, imageUrl: "/images/cover-seedling.webp", items: [{ name: "Báo cáo tỷ lệ sống hằng quý", quantity: 4 }], deliveryAfterEndDays: 90 },
    { title: "Hộp mật ong rừng ngập mặn", description: "Hũ mật ong 500 ml từ đàn ong nuôi dưới tán rừng của hợp tác xã.", minAmount: 600_000, quantityLimit: 70, requiresShipping: true, imageUrl: "/images/cover-bees.webp", items: [{ name: "Mật ong rừng ngập mặn 500 ml", quantity: 1 }], deliveryAfterEndDays: 30 },
  ],
  "Trạm đo độ mặn cảnh báo sớm cho vùng nuôi tôm": [
    { title: "Báo cáo số liệu độ mặn", description: "Báo cáo tổng hợp số liệu độ mặn mùa khô đầu tiên, gửi qua email.", minAmount: 200_000, requiresShipping: false, items: [{ name: "Báo cáo số liệu (bản số)", quantity: 1 }], deliveryAfterEndDays: 60 },
    { title: "Tôm khô đặc sản Sóc Trăng", description: "Túi tôm khô 300 g từ hộ nuôi tôm tham gia chương trình.", minAmount: 700_000, quantityLimit: 60, requiresShipping: true, items: [{ name: "Tôm khô 300 g", quantity: 1 }], deliveryAfterEndDays: 30 },
  ],
  "Khám mắt và tặng kính cho học sinh miền núi": [
    { title: "Tặng một cặp kính", description: "Đủ chi phí khám và một cặp kính cho một em học sinh; bạn nhận thư cảm ơn điện tử.", minAmount: 200_000, requiresShipping: false, items: [{ name: "Thư cảm ơn điện tử", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Sổ tay chăm sóc mắt kèm bút ký", description: "Sổ tay in tranh học sinh vẽ về đôi mắt, kèm bút ký có logo chương trình.", minAmount: 500_000, quantityLimit: 100, requiresShipping: true, items: [{ name: "Sổ tay chăm sóc mắt", quantity: 1 }, { name: "Bút ký", quantity: 1 }], deliveryAfterEndDays: 40 },
  ],
  "Tiêm phòng cúm cho người cao tuổi neo đơn": [
    { title: "Bảo trợ một mũi tiêm", description: "Đủ chi phí một mũi vắc xin cúm và khám sàng lọc cho một cụ.", minAmount: 300_000, requiresShipping: false, items: [{ name: "Giấy chứng nhận bảo trợ (bản số)", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Bảo trợ cả một xã", description: "Đồng hành cùng một xã trong đợt tiêm; tên bạn được ghi trong báo cáo tổng kết gửi Sở Y tế.", minAmount: 3_000_000, quantityLimit: 10, requiresShipping: false, items: [{ name: "Tên trong báo cáo tổng kết", quantity: 1 }], deliveryAfterEndDays: 45 },
  ],
  "Lớp kỹ năng phòng chống xâm hại cho học sinh tiểu học": [
    { title: "Bộ thẻ kỹ năng cho gia đình", description: "Bộ 30 thẻ tình huống giúp cha mẹ trò chuyện với con về an toàn cơ thể.", minAmount: 250_000, quantityLimit: 150, requiresShipping: true, items: [{ name: "Bộ thẻ tình huống", quantity: 1 }], deliveryAfterEndDays: 30 },
    { title: "Bảo trợ một lớp học", description: "Đủ chi phí một buổi học cho một lớp 35 em; bạn nhận ảnh và phản hồi của giáo viên.", minAmount: 1_500_000, quantityLimit: 40, requiresShipping: false, items: [{ name: "Ảnh và phản hồi buổi học (bản số)", quantity: 1 }], deliveryAfterEndDays: 20 },
  ],
};

const AMOUNTS = [100_000, 200_000, 200_000, 300_000, 500_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000];

const ADDRESSES = [
  "18 Nguyễn Trãi, phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
  "25 Hàng Bài, phường Hàng Bài, quận Hoàn Kiếm, Hà Nội",
  "102 Trần Phú, phường Hải Châu 1, quận Hải Châu, Đà Nẵng",
  "7 Lê Lợi, phường Vĩnh Ninh, TP. Huế",
  "56 Hùng Vương, phường Tân An, Ninh Kiều, Cần Thơ",
];

/** PRNG có seed cố định (mulberry32) để chạy lại ra cùng bộ dữ liệu. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

export async function seedOrganizationExtras(dataSource: DataSource): Promise<void> {
  const random = createRandom(20261122);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const now = Date.now();
  const at = (daysAgo: number, hour = 9) => new Date(now - daysAgo * DAY_MS + hour * 3_600_000);

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const memberRepo = dataSource.getRepository(OrganizationMember);
  const campaignRepo = dataSource.getRepository(Campaign);
  const donationRepo = dataSource.getRepository(Donation);
  const tierRepo = dataSource.getRepository(RewardTier);
  const recipientRepo = dataSource.getRepository(RewardRecipient);

  const users = await userRepo.find();
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const admin = users.find((user) => user.email === "admin@gopmam.com");
  const donors = users.filter((user) => /^user\d+@gopmam\.com$/.test(user.email));
  if (!admin || donors.length === 0) {
    console.log("[extras] Chưa có tài khoản mẫu (admin/user*). Hãy chạy seed gốc trước.");
    return;
  }

  // 1. Tổ chức thứ 5 (đã xác minh).
  let createdOrgs = 0;
  const representative = byEmail.get(EXTRA_ORGANIZATION.representativeEmail);
  if (representative && !(await orgRepo.findOneBy({ slug: EXTRA_ORGANIZATION.slug }))) {
    await orgRepo.save(
      orgRepo.create({
        name: EXTRA_ORGANIZATION.name,
        slug: EXTRA_ORGANIZATION.slug,
        type: EXTRA_ORGANIZATION.type,
        registrationNumber: EXTRA_ORGANIZATION.registrationNumber,
        issuedBy: EXTRA_ORGANIZATION.issuedBy,
        category: EXTRA_ORGANIZATION.category,
        mission: EXTRA_ORGANIZATION.mission,
        email: "lienhe@huong-duong.example",
        phone: "0900 000 000",
        address: EXTRA_ORGANIZATION.address,
        province: EXTRA_ORGANIZATION.province,
        documentUrl: "/images/cover-reading.webp",
        representativeId: representative.id,
        representativeTitle: "Giám đốc",
        status: OrganizationStatus.VERIFIED,
        verifiedAt: at(EXTRA_ORGANIZATION.verifiedDaysAgo),
        reviewedAt: at(EXTRA_ORGANIZATION.verifiedDaysAgo),
        reviewedBy: admin.id,
        submittedAt: at(EXTRA_ORGANIZATION.verifiedDaysAgo + 3),
      }),
    );
    createdOrgs += 1;
  }
  const organizations = await orgRepo.find();
  const orgBySlug = new Map(organizations.map((org) => [org.slug, org]));

  // 2. Cộng tác viên (đang hoạt động + lời mời đang chờ).
  let createdMembers = 0;
  for (const row of MEMBERS) {
    const org = orgBySlug.get(row.org);
    const user = byEmail.get(row.email);
    if (!org || !user || org.representativeId === user.id) continue;
    if (await memberRepo.findOneBy({ organizationId: org.id, userId: user.id })) continue;
    const invitedAt = at(row.invitedDaysAgo, 10);
    await memberRepo.save(
      memberRepo.create({
        organizationId: org.id,
        userId: user.id,
        invitedBy: org.representativeId,
        title: row.title,
        status: row.status,
        canEditProfile: !!row.perms.profile,
        canPostUpdates: !!row.perms.posts,
        canReportProgress: !!row.perms.progress,
        canManageRewards: !!row.perms.rewards,
        acceptedAt: row.status === MemberStatus.ACTIVE ? at(Math.max(0, row.invitedDaysAgo - 1), 14) : null,
        createdAt: invitedAt,
        updatedAt: invitedAt,
      }),
    );
    createdMembers += 1;
  }

  // 3. Dự án do tổ chức thực hiện, kèm giao dịch đã xác nhận sinh ra số liệu quỹ.
  let createdCampaigns = 0;
  let createdDonations = 0;
  let txSeq = 0;
  for (const row of ORG_CAMPAIGNS) {
    const org = orgBySlug.get(row.org);
    const owner = byEmail.get(row.ownerEmail);
    if (!org || !owner || (await campaignRepo.findOneBy({ title: row.title }))) continue;
    const campaign = await campaignRepo.save(
      campaignRepo.create({
        title: row.title,
        description: row.description,
        category: row.category,
        location: row.location,
        ownerId: owner.id,
        organizationId: org.id,
        goalAmount: row.goal,
        currentAmount: 0,
        backerCount: 0,
        viewCount: 0,
        startDate: at(row.startedDaysAgo, 0),
        endDate: at(row.startedDaysAgo - row.durationDays, 23),
        status: row.status,
        submittedAt: at(row.startedDaysAgo + 2, 9),
        createdAt: at(row.startedDaysAgo + 3, 8),
      }),
    );
    createdCampaigns += 1;

    const donationRows: Array<Partial<Donation>> = [];
    const activeDays = Math.max(1, Math.min(row.durationDays, row.startedDaysAgo));
    const target = row.goal * row.fundedRatio;
    const scale = Math.max(1, Math.round(row.goal / (60 * M)));
    let raised = 0;
    while (raised < target) {
      const amount = Math.min(pick(AMOUNTS) * scale, Math.max(100_000, Math.round((target - raised) / 100_000) * 100_000));
      const daysAgo = Math.max(0, row.startedDaysAgo - Math.floor(random() * activeDays));
      const createdAt = at(daysAgo, 7 + Math.floor(random() * 14));
      txSeq += 1;
      donationRows.push({
        userId: pick(donors).id,
        campaignId: campaign.id,
        amount,
        currency: "VND",
        status: DonationStatus.COMPLETED,
        paymentMethod: "wallet",
        transactionId: `TX-ORG-${campaign.id.slice(0, 8)}-${String(txSeq).padStart(4, "0")}`,
        idempotencyKey: `seed-org-${campaign.id.slice(0, 8)}-${txSeq}`,
        isAnonymous: random() < 0.3,
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      raised += amount;
    }
    if (donationRows.length > 0) {
      await donationRepo.save(donationRows.map((d) => donationRepo.create(d)), { chunk: 200 });
      createdDonations += donationRows.length;
    }
    campaign.currentAmount = raised;
    campaign.backerCount = donationRows.length;
    campaign.viewCount = row.conversion > 0 ? Math.round(Math.max(donationRows.length, 1) / row.conversion) : 0;
    await campaignRepo.save(campaign);
  }

  // 4. Mức quà tặng + gán quà cho một phần khoản ủng hộ đã xác nhận (đủ điều kiện số tiền).
  let createdTiers = 0;
  let claimedRewards = 0;
  const titles = Object.keys(REWARD_TIERS);
  const campaigns = await campaignRepo.find({ where: { title: In(titles) } });
  for (const campaign of campaigns) {
    if ((await tierRepo.countBy({ campaignId: campaign.id })) > 0) continue;
    const endDate = new Date(campaign.endDate);
    const tiers = await tierRepo.save(
      REWARD_TIERS[campaign.title].map((tier, index) =>
        tierRepo.create({
          campaignId: campaign.id,
          title: tier.title,
          description: tier.description,
          minAmount: tier.minAmount,
          quantityLimit: tier.quantityLimit ?? null,
          claimedCount: 0,
          estimatedDelivery: dateOnly(new Date(endDate.getTime() + tier.deliveryAfterEndDays * DAY_MS)),
          sortOrder: index,
          isActive: true,
          imageUrl: tier.imageUrl ?? null,
          items: tier.items,
          requiresShipping: tier.requiresShipping,
          availableUntil:
            tier.availableForDays !== undefined && campaign.status === CampaignStatus.ACTIVE
              ? new Date(Math.min(endDate.getTime(), now + tier.availableForDays * DAY_MS))
              : null,
        }),
      ),
    );
    createdTiers += tiers.length;

    // Khoản đã xác nhận, chưa chọn quà: ~40% chọn mức quà cao nhất mà số tiền đủ và còn suất.
    const donations = await donationRepo.find({
      where: { campaignId: campaign.id, status: DonationStatus.COMPLETED },
      order: { createdAt: "ASC" },
    });
    const claimed = new Map<string, number>();
    for (const donation of donations) {
      if (donation.rewardTierId || random() >= 0.4) continue;
      const amount = Number(donation.amount);
      const tier = [...tiers]
        .reverse()
        .find((t) => amount >= Number(t.minAmount) && (t.quantityLimit == null || (claimed.get(t.id) ?? 0) < t.quantityLimit));
      if (!tier) continue;
      await donationRepo.update({ id: donation.id }, { rewardTierId: tier.id });
      claimed.set(tier.id, (claimed.get(tier.id) ?? 0) + 1);
      claimedRewards += 1;
      if (tier.requiresShipping) {
        const donor = users.find((user) => user.id === donation.userId);
        await recipientRepo.save(
          recipientRepo.create({
            donationId: donation.id,
            recipientName: donor?.name ?? "Người ủng hộ",
            phone: `09${String(10_000_000 + Math.floor(random() * 89_999_999)).slice(0, 8)}`,
            address: pick(ADDRESSES),
          }),
        );
      }
    }
    for (const [tierId, count] of claimed) {
      await tierRepo.update({ id: tierId }, { claimedCount: count });
    }
  }

  console.log(
    `[extras] +${createdOrgs} tổ chức, +${createdMembers} cộng tác viên, +${createdCampaigns} dự án tổ chức ` +
      `(${createdDonations} khoản ủng hộ), +${createdTiers} mức quà, ${claimedRewards} khoản đã chọn quà.`,
  );
}

// Chạy độc lập: `npm run seed:extras` (thêm vào DB đã seed, không xóa dữ liệu cũ).
if (require.main === module) {
  const dataSource = createSeedDataSource();
  dataSource
    .initialize()
    .then(() => seedOrganizationExtras(dataSource))
    .then(() => dataSource.destroy())
    .then(() => console.log("Done!"))
    .catch((err: unknown) => {
      console.error("Seed extras failed:", err);
      process.exit(1);
    });
}
