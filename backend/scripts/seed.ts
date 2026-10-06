import { config } from "dotenv";
import { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";

import { readDatabaseSsl } from "../src/config/database.config";
import { User, UserRole } from "../src/modules/users/entities/user.entity";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import {
  Donation,
  DonationStatus,
} from "../src/modules/donations/entities/donation.entity";
import { CampaignFollow } from "../src/modules/follows/entities/campaign-follow.entity";
import { Milestone } from "../src/modules/progress/entities/milestone.entity";

config({ path: ".env" });

/** Mật khẩu chung của mọi tài khoản mẫu (chỉ dùng cho demo/kiểm thử). */
export const SEED_PASSWORD = "Test@123";

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE ?? "crowdfunding",
  ssl: readDatabaseSsl(),
  // DATETIME lưu theo UTC như backend.
  timezone: "Z",
  entities: ["src/modules/**/*.entity.ts"],
  synchronize: false,
});

const DAY_MS = 86_400_000;

/** PRNG có seed cố định (mulberry32): chạy lại cho đúng cùng một bộ dữ liệu. */
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

type CampaignSeed = {
  title: string;
  description: string;
  category: string;
  location: string;
  owner: 0 | 1 | 2;
  goal: number;
  status: CampaignStatus;
  /** Ngày bắt đầu (số ngày trước hôm nay) và độ dài chiến dịch. */
  startedDaysAgo: number;
  durationDays: number;
  /** Tỷ lệ mục tiêu đã gây được từ giao dịch thành công (0 = chưa có giao dịch). */
  fundedRatio: number;
  /** Tỷ lệ chuyển đổi xấp xỉ: lượt ủng hộ / lượt xem. */
  conversion: number;
  rejectionReason?: string;
};

const M = 1_000_000;

// 25 chiến dịch: đủ 6 lĩnh vực, nhiều địa phương, đủ trạng thái vòng đời, mục tiêu
// từ 20 triệu tới 1,5 tỷ và tiến độ từ ~5% tới >100% để bộ lọc/thống kê có ý nghĩa.
const CAMPAIGNS: CampaignSeed[] = [
  { title: "Xây dựng thư viện cộng đồng cho trẻ em vùng cao", description: "Thư viện nhỏ với 5.000 cuốn sách và 20 máy tính cho trẻ em xã Bản Hồ, kèm lớp đọc sách cuối tuần do giáo viên tình nguyện phụ trách.", category: "Giáo dục", location: "Lào Cai", owner: 0, goal: 50 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 40, durationDays: 70, fundedRatio: 0.92, conversion: 0.05 },
  { title: "Hỗ trợ nông dân trồng rau sạch hữu cơ", description: "Giúp 100 hộ nông dân chuyển đổi sang canh tác hữu cơ: tập huấn kỹ thuật, nhà màng và kết nối đầu ra với bếp ăn trường học.", category: "Nông nghiệp", location: "Đà Lạt", owner: 1, goal: 80 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 25, durationDays: 75, fundedRatio: 0.34, conversion: 0.03 },
  { title: "Ứng dụng luyện tiếng Anh cho học sinh tiểu học", description: "Ứng dụng học tiếng Anh có trợ lý phát âm, miễn phí cho 30 trường tiểu học vùng khó khăn trong năm đầu.", category: "Công nghệ", location: "Hà Nội", owner: 1, goal: 120 * M, status: CampaignStatus.PENDING, startedDaysAgo: 2, durationDays: 60, fundedRatio: 0, conversion: 0 },
  { title: "Phòng khám lưu động cho người cao tuổi", description: "Xe khám lưu động định kỳ hằng tháng tại 12 xã, khám mắt, đo huyết áp và cấp thuốc cơ bản cho người cao tuổi neo đơn.", category: "Y tế", location: "Nghệ An", owner: 0, goal: 300 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 55, durationDays: 90, fundedRatio: 0.61, conversion: 0.04 },
  { title: "Trồng 10.000 cây ngập mặn chắn sóng", description: "Phục hồi rừng ngập mặn ven biển cùng học sinh và ngư dân địa phương, theo dõi tỷ lệ cây sống sau 6 và 12 tháng.", category: "Môi trường", location: "Cần Thơ", owner: 2, goal: 150 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 30, durationDays: 35, fundedRatio: 0.78, conversion: 0.06 },
  { title: "Xưởng tái chế nhựa thành gạch lát", description: "Xưởng nhỏ ép nhựa phế thải thành gạch lát vỉa hè, tạo việc làm cho 15 lao động và giảm rác nhựa ra kênh rạch.", category: "Khởi nghiệp", location: "TP. Hồ Chí Minh", owner: 2, goal: 450 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 20, durationDays: 80, fundedRatio: 0.18, conversion: 0.02 },
  { title: "Bếp ăn bán trú cho học sinh dân tộc", description: "Cải tạo bếp và duy trì bữa trưa đủ chất cho 180 học sinh bán trú trong một năm học.", category: "Giáo dục", location: "Sơn La", owner: 0, goal: 90 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 50, durationDays: 55, fundedRatio: 0.87, conversion: 0.07 },
  { title: "Nền tảng kết nối tình nguyện viên y tế", description: "Website giúp phòng khám từ thiện đăng nhu cầu và tình nguyện viên y tế đăng ký ca trực, có xác minh chứng chỉ hành nghề.", category: "Công nghệ", location: "Đà Nẵng", owner: 1, goal: 200 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 12, durationDays: 60, fundedRatio: 0.09, conversion: 0.015 },
  { title: "Giếng nước sạch cho bản vùng biên", description: "Khoan 4 giếng và lắp hệ thống lọc cho 3 bản thường xuyên thiếu nước sạch vào mùa khô.", category: "Y tế", location: "Sơn La", owner: 0, goal: 60 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 28, durationDays: 33, fundedRatio: 0.71, conversion: 0.05 },
  { title: "Vườn ươm doanh nghiệp xã hội cho sinh viên", description: "Chương trình 12 tuần hỗ trợ 10 nhóm sinh viên xây dựng mô hình kinh doanh có tác động xã hội, kèm vốn mồi.", category: "Khởi nghiệp", location: "Huế", owner: 2, goal: 1500 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 15, durationDays: 90, fundedRatio: 0.05, conversion: 0.01 },
  { title: "Hệ thống tưới tiết kiệm cho vườn cà phê", description: "Lắp tưới nhỏ giọt dùng năng lượng mặt trời cho 40 hộ trồng cà phê, giảm 40% lượng nước tưới mùa khô.", category: "Nông nghiệp", location: "Đắk Lắk", owner: 1, goal: 250 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 45, durationDays: 50, fundedRatio: 0.52, conversion: 0.035 },
  { title: "Lớp học bơi miễn phí phòng đuối nước", description: "Dạy bơi an toàn cho 600 trẻ em vùng sông nước trong mùa hè, có huấn luyện viên và bể bơi di động.", category: "Giáo dục", location: "Quảng Nam", owner: 0, goal: 40 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 8, durationDays: 45, fundedRatio: 0.26, conversion: 0.04 },
  { title: "Thùng rác phân loại cho trường học", description: "Trang bị thùng rác phân loại và chương trình thi đua tái chế cho 25 trường tiểu học nội thành.", category: "Môi trường", location: "Hà Nội", owner: 2, goal: 30 * M, status: CampaignStatus.APPROVED, startedDaysAgo: -3, durationDays: 40, fundedRatio: 0, conversion: 0 },
  { title: "Máy lọc không khí cho phòng điều trị nhi", description: "Trang bị máy lọc không khí cho 8 phòng điều trị hô hấp nhi khoa của bệnh viện huyện.", category: "Y tế", location: "Hà Nội", owner: 0, goal: 70 * M, status: CampaignStatus.PAUSED, startedDaysAgo: 35, durationDays: 60, fundedRatio: 0.44, conversion: 0.03, rejectionReason: "Tạm dừng để chủ dự án bổ sung báo giá thiết bị từ nhà cung cấp." },
  { title: "Học bổng tiếp sức tân sinh viên nghèo", description: "30 suất học bổng năm nhất cho tân sinh viên hoàn cảnh khó khăn, kèm người hướng dẫn trong năm học đầu.", category: "Giáo dục", location: "Huế", owner: 0, goal: 120 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 150, durationDays: 60, fundedRatio: 1.18, conversion: 0.06 },
  { title: "Cầu dân sinh cho học sinh qua suối", description: "Xây cầu bê tông dài 24 m thay cầu tre tạm để học sinh đến trường an toàn mùa mưa lũ.", category: "Môi trường", location: "Quảng Nam", owner: 2, goal: 350 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 170, durationDays: 75, fundedRatio: 1.03, conversion: 0.05 },
  { title: "Sàn thương mại nông sản cho hợp tác xã", description: "Sàn bán hàng trực tuyến cho 6 hợp tác xã, truy xuất nguồn gốc bằng mã QR.", category: "Khởi nghiệp", location: "Cần Thơ", owner: 1, goal: 180 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 120, durationDays: 50, fundedRatio: 1.31, conversion: 0.045 },
  { title: "Trạm sạc pin năng lượng mặt trời cho chợ nổi", description: "Lắp 5 trạm sạc pin bằng năng lượng mặt trời cho tiểu thương chợ nổi.", category: "Công nghệ", location: "Cần Thơ", owner: 1, goal: 95 * M, status: CampaignStatus.SUCCESS, startedDaysAgo: 100, durationDays: 45, fundedRatio: 1.07, conversion: 0.04 },
  { title: "Nhà văn hóa cộng đồng thôn Nà Lừa", description: "Sửa mái và trang bị bàn ghế cho nhà văn hóa thôn dùng làm lớp học xóa mù chữ buổi tối.", category: "Giáo dục", location: "Lào Cai", owner: 0, goal: 65 * M, status: CampaignStatus.FAILED, startedDaysAgo: 110, durationDays: 45, fundedRatio: 0.38, conversion: 0.02 },
  { title: "Ứng dụng nhắc lịch tiêm chủng cho mẹ bỉm", description: "Ứng dụng nhắc lịch tiêm chủng theo độ tuổi của trẻ, tích hợp bản đồ điểm tiêm.", category: "Công nghệ", location: "TP. Hồ Chí Minh", owner: 1, goal: 140 * M, status: CampaignStatus.FAILED, startedDaysAgo: 95, durationDays: 40, fundedRatio: 0.22, conversion: 0.015 },
  { title: "Dọn rác bãi biển mùa du lịch", description: "Chuỗi 12 buổi dọn rác bãi biển cùng du khách, kèm truyền thông giảm đồ nhựa dùng một lần.", category: "Môi trường", location: "Đà Nẵng", owner: 2, goal: 25 * M, status: CampaignStatus.ENDED, startedDaysAgo: 140, durationDays: 30, fundedRatio: 1.12, conversion: 0.08 },
  { title: "Mô hình nuôi ong lấy mật cho hộ nghèo", description: "Cấp 200 thùng ong giống và tập huấn kỹ thuật cho 40 hộ nghèo, bao tiêu đầu ra mật ong.", category: "Nông nghiệp", location: "Nghệ An", owner: 1, goal: 110 * M, status: CampaignStatus.PENDING, startedDaysAgo: 1, durationDays: 60, fundedRatio: 0, conversion: 0 },
  { title: "Tủ thuốc cộng đồng cho xã đảo", description: "Duy trì tủ thuốc thiết yếu và lớp sơ cứu cho người dân xã đảo trong 12 tháng.", category: "Y tế", location: "Quảng Nam", owner: 0, goal: 45 * M, status: CampaignStatus.NEEDS_INFO, startedDaysAgo: 4, durationDays: 50, fundedRatio: 0, conversion: 0, rejectionReason: "Vui lòng bổ sung xác nhận của trạm y tế xã về danh mục thuốc." },
  { title: "Robot giáo dục STEM cho trường làng", description: "Bộ robot lắp ghép và giáo án STEM cho 10 trường tiểu học, tập huấn giáo viên hai buổi.", category: "Công nghệ", location: "Đắk Lắk", owner: 2, goal: 85 * M, status: CampaignStatus.DRAFT, startedDaysAgo: 0, durationDays: 60, fundedRatio: 0, conversion: 0 },
  { title: "Vườn rau thủy canh trên sân thượng trường học", description: "Vườn thủy canh trên sân thượng làm nơi học sinh thực hành, rau dùng cho bếp ăn bán trú.", category: "Nông nghiệp", location: "TP. Hồ Chí Minh", owner: 2, goal: 20 * M, status: CampaignStatus.ACTIVE, startedDaysAgo: 18, durationDays: 22, fundedRatio: 0.95, conversion: 0.09 },
];

/** Chỉ các trạng thái đã phát hành mới nhận giao dịch và lượt xem. */
const PUBLISHED = [
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

const AMOUNTS = [100_000, 200_000, 200_000, 300_000, 500_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000];

async function seed() {
  await dataSource.initialize();
  console.log("Database connected. Seeding...");

  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.count();
  if (existing > 0) {
    console.log("Data already exists. Skipping seed.");
    await dataSource.destroy();
    return;
  }

  const random = createRandom(20261005);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const now = Date.now();
  const at = (daysAgo: number, hour = 9) => new Date(now - daysAgo * DAY_MS + hour * 3_600_000);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const makeUser = (data: Partial<User>) => userRepo.create({ passwordHash, emailVerified: true, ...data });

  const admin = makeUser({ name: "Administrator", email: "admin@gopmam.com", role: UserRole.ADMIN });
  const owners = [
    makeUser({ name: "Nguyen Van A", email: "owner1@gopmam.com", role: UserRole.CAMPAIGN_OWNER, bio: "Điều phối dự án cộng đồng vùng cao", organization: "Trung tâm Phát triển Cộng đồng" }),
    makeUser({ name: "Tran Thi B", email: "owner2@gopmam.com", role: UserRole.CAMPAIGN_OWNER, bio: "Nhà sáng lập khởi nghiệp nông nghiệp – công nghệ", organization: "GreenTech Startup" }),
    makeUser({ name: "Pham Minh D", email: "owner3@gopmam.com", role: UserRole.CAMPAIGN_OWNER, bio: "Kỹ sư môi trường, tình nguyện viên lâu năm", organization: "Nhóm Xanh Miền Trung" }),
  ];
  const donorNames = ["Le Van C", "Hoang Thu E", "Vu Quoc F", "Dang Mai G", "Bui Anh H", "Do Khanh I", "Ngo Lan K", "Trinh Bao L"];
  const donors = donorNames.map((name, index) =>
    makeUser({ name, email: `user${index + 1}@gopmam.com`, role: UserRole.USER }),
  );
  await userRepo.save([admin, ...owners, ...donors]);

  const campaignRepo = dataSource.getRepository(Campaign);
  const campaigns = campaignRepo.create(
    CAMPAIGNS.map((seedRow) => ({
      title: seedRow.title,
      description: seedRow.description,
      category: seedRow.category,
      location: seedRow.location,
      ownerId: owners[seedRow.owner].id,
      goalAmount: seedRow.goal,
      currentAmount: 0,
      backerCount: 0,
      viewCount: 0,
      startDate: at(seedRow.startedDaysAgo, 0),
      endDate: at(seedRow.startedDaysAgo - seedRow.durationDays, 23),
      status: seedRow.status,
      rejectionReason: seedRow.rejectionReason,
      createdAt: at(seedRow.startedDaysAgo + 3, 8),
    })),
  );
  await campaignRepo.save(campaigns);

  // Giao dịch: rải trong khoảng chiến dịch đã chạy, tới khi đạt tỷ lệ gây quỹ mục tiêu.
  const donationRows: Array<Partial<Donation>> = [];
  let txSeq = 0;
  const addDonation = (campaign: Campaign, amount: number, status: DonationStatus, createdAt: Date) => {
    txSeq += 1;
    const donor = pick(donors);
    donationRows.push({
      userId: donor.id,
      campaignId: campaign.id,
      amount,
      currency: "VND",
      status,
      paymentMethod: "wallet",
      transactionId: `TX-SEED-${String(txSeq).padStart(6, "0")}`,
      idempotencyKey: `seed-${txSeq}-${campaign.id.slice(0, 8)}`,
      isAnonymous: random() < 0.25,
      completedAt: status === DonationStatus.COMPLETED ? createdAt : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  };

  CAMPAIGNS.forEach((seedRow, index) => {
    const campaign = campaigns[index];
    if (!PUBLISHED.includes(seedRow.status) || seedRow.fundedRatio <= 0) return;
    const activeDays = Math.max(1, Math.min(seedRow.durationDays, seedRow.startedDaysAgo));
    const target = seedRow.goal * seedRow.fundedRatio;
    // Khoản lớn hơn cho mục tiêu lớn để số giao dịch hợp lý (≈ 10–60 lượt).
    const scale = Math.max(1, Math.round(seedRow.goal / (60 * M)));
    let raised = 0;
    while (raised < target) {
      const amount = Math.min(pick(AMOUNTS) * scale, Math.max(100_000, Math.round((target - raised) / 100_000) * 100_000));
      const daysAgo = seedRow.startedDaysAgo - Math.floor(random() * activeDays);
      addDonation(campaign, amount, DonationStatus.COMPLETED, at(Math.max(0, daysAgo), 7 + Math.floor(random() * 14)));
      raised += amount;
      // Thỉnh thoảng có giao dịch không thành: thất bại / hết hạn / bị hủy.
      if (random() < 0.12) {
        const status = pick([DonationStatus.FAILED, DonationStatus.EXPIRED, DonationStatus.CANCELLED]);
        addDonation(campaign, pick(AMOUNTS), status, at(Math.max(0, daysAgo), 6 + Math.floor(random() * 15)));
      }
    }
  });
  await dataSource.getRepository(Donation).save(donationRows, { chunk: 200 });

  // Số liệu quỹ sinh từ giao dịch đã xác nhận (cùng quy tắc với donations.service:
  // mỗi giao dịch completed cộng amount vào currentAmount và +1 backerCount), không gõ cứng.
  for (const campaign of campaigns) {
    const completed = donationRows.filter(
      (row) => row.campaignId === campaign.id && row.status === DonationStatus.COMPLETED,
    );
    campaign.currentAmount = completed.reduce((sum, row) => sum + Number(row.amount), 0);
    campaign.backerCount = completed.length;
  }

  // Lượt xem theo ngày (60 ngày gần nhất trong thời gian chạy) sao cho
  // lượt ủng hộ / lượt xem ≈ tỷ lệ chuyển đổi khai báo; view_count = tổng.
  const viewRows: Array<[string, string, number]> = [];
  CAMPAIGNS.forEach((seedRow, index) => {
    const campaign = campaigns[index];
    if (!PUBLISHED.includes(seedRow.status) || seedRow.conversion <= 0) return;
    const totalViews = Math.round(Math.max(campaign.backerCount, 1) / seedRow.conversion);
    const lastDay = Math.max(0, seedRow.startedDaysAgo - seedRow.durationDays);
    const firstDay = Math.min(seedRow.startedDaysAgo, 59);
    if (firstDay < lastDay) {
      campaign.viewCount = totalViews;
      return;
    }
    const days = Array.from({ length: firstDay - lastDay + 1 }, (_, i) => firstDay - i);
    const weights = days.map(() => 0.5 + random());
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    let assigned = 0;
    days.forEach((daysAgo, i) => {
      const views = i === days.length - 1 ? totalViews - assigned : Math.round((weights[i] / weightSum) * totalViews);
      assigned += views;
      if (views > 0) viewRows.push([campaign.id, at(daysAgo, 12).toISOString().slice(0, 10), views]);
    });
    campaign.viewCount = totalViews;
  });
  await campaignRepo.save(campaigns);
  for (let i = 0; i < viewRows.length; i += 200) {
    const chunk = viewRows.slice(i, i + 200);
    await dataSource.query(
      `INSERT INTO campaign_view_daily (campaign_id, view_date, views) VALUES ${chunk.map(() => "(?, ?, ?)").join(", ")}`,
      chunk.flat(),
    );
  }

  // Kế hoạch theo mốc cho vài chiến dịch đang/đã chạy (minh bạch tiến độ).
  const milestoneRepo = dataSource.getRepository(Milestone);
  const milestoneRows: Array<Partial<Milestone>> = [];
  [0, 3, 4, 6, 14, 15].forEach((index) => {
    const seedRow = CAMPAIGNS[index];
    const campaign = campaigns[index];
    const finished = seedRow.status === CampaignStatus.SUCCESS;
    const steps = ["Khảo sát và chốt nhà cung cấp", "Triển khai giai đoạn 1", "Hoàn thiện và báo cáo quyết toán"];
    steps.forEach((title, step) => {
      const done = finished || step === 0;
      // Kịch bản demo "chậm tiến độ": mốc 2 của phòng khám lưu động quá hạn 12 ngày, chưa giải trình.
      const overdueDemo = index === 3 && step === 1;
      milestoneRows.push({
        campaignId: campaign.id,
        title,
        description: `${title} cho dự án "${seedRow.title}".`,
        targetDate: overdueDemo ? at(12, 0) : at(seedRow.startedDaysAgo - seedRow.durationDays - 10 - step * 20, 0),
        budget: Math.round((seedRow.goal * [0.2, 0.5, 0.3][step]) / 100_000) * 100_000,
        sortOrder: step,
        isCompleted: done,
        completedAt: done ? at(Math.max(0, seedRow.startedDaysAgo - 10 - step * 15)) : undefined,
      });
    });
  });
  await milestoneRepo.save(milestoneRows);

  // Theo dõi: người ủng hộ theo dõi một vài chiến dịch đang gây quỹ.
  const followRows: Array<Partial<CampaignFollow>> = [];
  const followable = campaigns.filter((campaign) => campaign.status === CampaignStatus.ACTIVE);
  for (const donor of donors) {
    const chosen = new Set<string>();
    while (chosen.size < 3) chosen.add(pick(followable).id);
    for (const campaignId of chosen) followRows.push({ userId: donor.id, campaignId });
  }
  await dataSource.getRepository(CampaignFollow).save(followRows);

  const completedCount = donationRows.filter((row) => row.status === DonationStatus.COMPLETED).length;
  console.log(
    `Seeded: ${1 + owners.length + donors.length} users, ${campaigns.length} campaigns, ` +
      `${donationRows.length} donations (${completedCount} completed), ${viewRows.length} daily view rows, ` +
      `${milestoneRows.length} milestones, ${followRows.length} follows. Password: ${SEED_PASSWORD}`,
  );
  await dataSource.destroy();
  console.log("Done!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
