/**
 * Dữ liệu MÔ PHỎNG cho AI tự học: 150 dự án đã kết thúc (đạt / không đạt) trong khoảng 2 năm qua.
 *
 * Kết quả đạt hay không được sinh từ một quy luật đặt sẵn (GROUND_TRUTH bên dưới) cộng nhiễu ngẫu
 * nhiên, nên AI học lại đúng quy luật này — chỉ để minh họa khả năng tự hiệu chỉnh theo dữ liệu
 * nền tảng, KHÔNG phải bằng chứng về hành vi người ủng hộ thật và không dùng làm số liệu đánh giá.
 *
 * Từ 25/11/2026 mỗi dự án còn có nội dung ngẫu nhiên — có video (~40%), từ 3 ảnh (~45%), câu
 * chuyện từ 300 từ (~45%) — với ảnh hưởng TỰ ĐẶT trong GROUND_TRUTH (video +0,8, ảnh +0,5, câu
 * chuyện +0,6 log-odds) để thử phần AI học nội dung (`ContentModel` ở ai-service). AI học lại đúng
 * các con số này, nên kết quả chỉ chứng minh cơ chế hoạt động, không nói gì về người ủng hộ thật.
 * Thời hạn ≤ 60 ngày như quy định hiện hành.
 *
 * Số tiền của dự án được cộng từ các khoản ủng hộ (như seed chính): dự án đạt có các khoản
 * `completed`; dự án không đạt có các khoản đã hoàn (`refunded`, như cơ chế tự hoàn khi kết thúc
 * không đạt) nên số tiền còn lại bằng 0.
 *
 *   npm run seed:ai-history            # tạo (bỏ qua nếu đã có)
 *   npm run seed:ai-history -- --remove # xóa toàn bộ dữ liệu mô phỏng này
 *
 * Chạy lại cho đúng cùng một bộ dữ liệu (PRNG có seed cố định).
 */
import { In } from "typeorm";

import { createSeedDataSource } from "./seed-data-source";
import { PROVINCES } from "../src/common/constants/provinces";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { Donation, DonationStatus, RefundMethod } from "../src/modules/donations/entities/donation.entity";
import { User } from "../src/modules/users/entities/user.entity";

const DAY_MS = 86_400_000;
const M = 1_000_000;
const TOTAL = 150;
const TX_PREFIX = "TX-AIHIST-";

/** Quy luật sinh kết quả (log-odds), xem chú thích đầu file. */
const GROUND_TRUTH = {
  /** Mục tiêu gấp 10 lần mức tham chiếu thì log-odds giảm 1,2. */
  goalSlope: -1.2,
  goalReference: 40 * M,
  /** Mỗi ngày dài hơn 30 ngày giảm 0,03 (60 ngày: −0,9). */
  durationSlope: -0.03,
  noise: 0.7,
  /**
   * Ảnh hưởng của nội dung (TỰ ĐẶT để thử AI học lại — không phải số liệu thật): có video,
   * có từ 3 ảnh, câu chuyện từ 300 từ. Khớp ngưỡng `CONTENT_FEATURES` trong
   * ai-service/app/services/platform_learning.py.
   */
  videoEffect: 0.8,
  imagesEffect: 0.5,
  storyEffect: 0.6,
};

/** Tỷ lệ dự án mô phỏng có từng thông tin nội dung. */
const CONTENT_SHARE = { video: 0.4, images: 0.45, story: 0.45 };
/** Link video giữ chỗ (dự án mô phỏng bị ẩn khỏi trang công khai; AI chỉ cần biết có video hay không). */
const SIM_VIDEO_URL = "https://www.youtube.com/watch?v=GopMamDemo1";
const SIM_IMAGES = [
  "cover-library", "cover-reading", "cover-graduate", "cover-clinic", "cover-health", "cover-water",
  "cover-seedling", "cover-mangrove", "cover-farm", "cover-vegetable", "cover-relief", "cover-elderly",
  "cover-meal", "cover-housing", "cover-computer", "cover-robot", "cover-startup", "cover-music",
].map((name) => `/images/${name}.webp`);
/** Câu ghép thành câu chuyện dài/ngắn (đếm từ giống backend: bỏ thẻ HTML rồi tách theo khoảng trắng). */
const STORY_SENTENCES = [
  "Chúng tôi đã khảo sát thực tế cùng chính quyền địa phương và người dân trước khi lập kế hoạch.",
  "Toàn bộ kinh phí được chia theo từng mốc, mỗi mốc đều có báo cáo chi tiêu và hình ảnh kèm theo.",
  "Đội ngũ tình nguyện viên gồm giáo viên, cán bộ y tế và sinh viên đã đồng hành cùng dự án nhiều năm.",
  "Sau khi hoàn thành, công trình được bàn giao cho cộng đồng tự quản lý và duy trì lâu dài.",
  "Người ủng hộ có thể theo dõi tiến độ hằng tuần qua mục cập nhật và nhật ký chi tiêu của dự án.",
  "Chúng tôi ưu tiên mua vật tư tại địa phương để hỗ trợ sinh kế của bà con trong vùng.",
  "Mỗi gia đình hưởng lợi đều được trao đổi trực tiếp để hiểu rõ nhu cầu thực sự của họ.",
  "Nếu quyên góp vượt mục tiêu, phần dư sẽ được dùng cho giai đoạn tiếp theo và công khai đầy đủ.",
];

type CategorySpec = {
  name: string;
  count: number;
  /** Ảnh hưởng của lĩnh vực lên log-odds đạt mục tiêu. */
  effect: number;
  /** Mục tiêu điển hình (trung vị). */
  medianGoal: number;
  titles: string[];
  places: string[];
  why: string;
};

const VILLAGES = ["Pà Cò", "Tả Van", "Nậm Ty", "Sín Chéng", "Lũng Cú", "Hồng Thái", "Mường Lống", "Trà Leng", "Ea Súp", "Đắk Glei", "Phìn Ngan", "A Lưới", "Nà Hang", "Cao Phạ", "Bản Liền", "Xín Mần"];
const COMMUNES = ["xã Tân Lập", "xã Hòa Bình", "phường An Hải", "xã Long Hựu", "xã Phú Mỹ", "xã Đông Hải", "xã Vĩnh Thạnh", "xã Thạnh Phú", "xã Cẩm Thanh", "xã Lộc Thủy", "xã Ninh Phước", "xã Quảng Thái"];

const CATEGORIES: CategorySpec[] = [
  {
    name: "Giáo dục", count: 25, effect: 0.6, medianGoal: 50 * M, places: VILLAGES,
    titles: ["Tủ sách cho điểm trường {p}", "Học bổng vượt khó cho học sinh {p}", "Bàn ghế mới cho lớp học {p}", "Lớp học tình thương ở {p}", "Máy tính cho phòng tin học {p}", "Bữa sáng đến trường cho trẻ {p}"],
    why: "Nhiều em học sinh phải học trong điều kiện thiếu thốn, đi bộ hàng giờ tới lớp.",
  },
  {
    name: "Y tế", count: 22, effect: 0.5, medianGoal: 80 * M, places: COMMUNES,
    titles: ["Máy siêu âm cho trạm y tế {p}", "Khám mắt miễn phí cho người già {p}", "Tủ thuốc cộng đồng {p}", "Xe cấp cứu nhỏ cho {p}", "Phẫu thuật tim cho trẻ em nghèo {p}"],
    why: "Trạm y tế thiếu thiết bị, người dân phải đi xa để khám chữa bệnh.",
  },
  {
    name: "Môi trường", count: 20, effect: 0.0, medianGoal: 60 * M, places: COMMUNES,
    titles: ["Trồng rừng phòng hộ {p}", "Thùng rác phân loại cho {p}", "Làm sạch kênh rạch {p}", "Vườn ươm cây bản địa {p}", "Dọn rác bờ biển {p}"],
    why: "Rác thải và ô nhiễm đang ảnh hưởng trực tiếp tới sinh kế của người dân.",
  },
  {
    name: "Nông nghiệp", count: 15, effect: -0.1, medianGoal: 90 * M, places: COMMUNES,
    titles: ["Mô hình trồng nấm cho hộ nghèo {p}", "Giống lúa chịu mặn cho {p}", "Nhà lưới rau sạch {p}", "Nuôi ong lấy mật {p}", "Hệ thống tưới nhỏ giọt {p}"],
    why: "Bà con cần vốn ban đầu để chuyển sang mô hình canh tác bền vững hơn.",
  },
  {
    name: "Khởi nghiệp", count: 15, effect: -0.6, medianGoal: 120 * M, places: PROVINCES as unknown as string[],
    titles: ["Xưởng may của phụ nữ đơn thân {p}", "Quán cà phê của người khuyết tật {p}", "Thương hiệu đặc sản {p}", "Bếp ăn khởi nghiệp {p}", "Cửa hàng tái chế {p}"],
    why: "Nhóm khởi nghiệp xã hội cần vốn để mua thiết bị và tạo việc làm ổn định.",
  },
  {
    name: "Công nghệ", count: 15, effect: -0.5, medianGoal: 150 * M, places: PROVINCES as unknown as string[],
    titles: ["Ứng dụng học tiếng dân tộc {p}", "Cảm biến cảnh báo lũ sớm {p}", "Bản đồ số điểm sạt lở {p}", "Phòng STEM cho học sinh {p}", "Hệ thống quan trắc nước {p}"],
    why: "Giải pháp công nghệ giá rẻ có thể giúp cộng đồng chủ động hơn trước rủi ro.",
  },
  {
    name: "Trẻ em", count: 10, effect: 0.6, medianGoal: 40 * M, places: VILLAGES,
    titles: ["Áo ấm mùa đông cho trẻ {p}", "Sân chơi an toàn cho trẻ {p}", "Dạy bơi phòng đuối nước {p}"],
    why: "Các em nhỏ thiếu điều kiện vui chơi, học tập an toàn.",
  },
  {
    name: "Người cao tuổi", count: 8, effect: 0.3, medianGoal: 50 * M, places: COMMUNES,
    titles: ["Bữa cơm ấm cho cụ già neo đơn {p}", "Xe lăn cho người cao tuổi {p}", "Nhà sinh hoạt người cao tuổi {p}"],
    why: "Nhiều cụ già neo đơn không có người chăm sóc hằng ngày.",
  },
  {
    name: "Nước sạch & vệ sinh", count: 8, effect: 0.4, medianGoal: 70 * M, places: VILLAGES,
    titles: ["Giếng khoan nước sạch {p}", "Bể lọc nước cho trường {p}", "Nhà vệ sinh trường học {p}"],
    why: "Người dân vẫn dùng nước suối chưa qua xử lý, dễ mắc bệnh đường ruột.",
  },
  {
    name: "Cứu trợ thiên tai", count: 6, effect: 0.8, medianGoal: 100 * M, places: COMMUNES,
    titles: ["Dựng lại nhà sau lũ {p}", "Lương thực khẩn cấp cho {p}", "Sửa trường học sau bão {p}"],
    why: "Mưa lũ vừa qua làm nhiều gia đình mất nhà cửa và tài sản.",
  },
  {
    name: "Văn hóa nghệ thuật", count: 6, effect: -0.2, medianGoal: 60 * M, places: PROVINCES as unknown as string[],
    titles: ["Lớp dạy cồng chiêng {p}", "Phục dựng lễ hội truyền thống {p}", "Đội văn nghệ thiếu nhi {p}"],
    why: "Nhiều giá trị văn hóa truyền thống đang mai một vì thiếu người kế cận.",
  },
];

/** Thời hạn ≤ 60 ngày (mức tối đa của nền tảng, như Kickstarter). */
const DURATIONS: Array<[number, number]> = [[30, 0.3], [35, 0.1], [40, 0.15], [45, 0.2], [50, 0.1], [60, 0.15]];
const AMOUNTS = [100_000, 200_000, 200_000, 300_000, 500_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000];

/** PRNG có seed cố định (mulberry32), giống seed chính. */
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

type Plan = {
  title: string;
  category: string;
  location: string;
  description: string;
  goal: number;
  durationDays: number;
  startedDaysAgo: number;
  reached: boolean;
  fundedRatio: number;
  imageUrl: string | null;
  videoUrl: string | null;
};

function buildPlans(random: () => number): Plan[] {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const weighted = (options: Array<[number, number]>) => {
    let r = random();
    for (const [value, weight] of options) {
      if ((r -= weight) <= 0) return value;
    }
    return options[options.length - 1][0];
  };
  const used = new Set<string>();
  const plans: Plan[] = [];

  for (const spec of CATEGORIES) {
    for (let i = 0; i < spec.count; i += 1) {
      let title = "";
      for (let attempt = 0; attempt < 50 && (!title || used.has(title)); attempt += 1) {
        title = pick(spec.titles).replace("{p}", pick(spec.places));
      }
      used.add(title);

      // Mục tiêu: log-chuẩn quanh trung vị của lĩnh vực, làm tròn 2 chữ số có nghĩa (≥ 5 triệu).
      const raw = spec.medianGoal * Math.exp(0.6 * gaussian());
      const magnitude = 10 ** Math.max(6, Math.floor(Math.log10(raw)) - 1);
      const goal = Math.min(1_500 * M, Math.max(5 * M, Math.round(raw / magnitude) * magnitude));
      const durationDays = weighted(DURATIONS);
      const startedDaysAgo = durationDays + 3 + Math.floor(random() * (700 - durationDays));

      // Nội dung: độc lập với mục tiêu/thời hạn để AI tách được ảnh hưởng riêng.
      const hasVideo = random() < CONTENT_SHARE.video;
      const imageCount = random() < CONTENT_SHARE.images ? 3 + Math.floor(random() * 4) : Math.floor(random() * 3);
      const longStory = random() < CONTENT_SHARE.story;

      const logOdds =
        spec.effect +
        GROUND_TRUTH.goalSlope * Math.log10(goal / GROUND_TRUTH.goalReference) +
        GROUND_TRUTH.durationSlope * (durationDays - 30) +
        (hasVideo ? GROUND_TRUTH.videoEffect : 0) +
        (imageCount >= 3 ? GROUND_TRUTH.imagesEffect : 0) +
        (longStory ? GROUND_TRUTH.storyEffect : 0) +
        GROUND_TRUTH.noise * gaussian();
      const reached = random() < 1 / (1 + Math.exp(-logOdds));
      const fundedRatio = reached ? 1 + random() * 0.3 : 0.1 + random() * 0.8;
      const location = PROVINCES[Math.floor(random() * PROVINCES.length)];

      // Ảnh: 1 ảnh đại diện + (imageCount − 1) ảnh trong câu chuyện (backend đếm cả hai).
      const images = Array.from({ length: imageCount }, () => pick(SIM_IMAGES));
      const inlineImages = images.slice(1).map((src) => `<p><img src="${src}" alt="Hình ảnh dự án"></p>`).join("");
      // Câu chuyện ngắn ~60–150 từ, dài ~320–520 từ (mỗi câu ~20 từ).
      const sentenceCount = longStory ? 16 + Math.floor(random() * 10) : 2 + Math.floor(random() * 5);
      const story = Array.from({ length: sentenceCount }, () => pick(STORY_SENTENCES));
      const storyHtml = [0, 1, 2, 3]
        .map((part) => story.filter((_, index) => index % 4 === part).join(" "))
        .filter(Boolean)
        .map((text) => `<p>${text}</p>`)
        .join("");

      plans.push({
        title,
        category: spec.name,
        location,
        goal,
        durationDays,
        startedDaysAgo,
        reached,
        fundedRatio,
        imageUrl: images[0] ?? null,
        videoUrl: hasVideo ? SIM_VIDEO_URL : null,
        description:
          `<p>${spec.why}</p>` +
          `<p>Dự án "${title}" cần ${goal.toLocaleString("vi-VN")} ₫ trong ${durationDays} ngày để triển khai tại ${location}. ` +
          `Mọi khoản chi đều được báo cáo kèm chứng từ trên Góp Mầm.</p>` +
          storyHtml +
          inlineImages +
          `<p><em>Dữ liệu mô phỏng để minh họa chức năng AI.</em></p>`,
      });
    }
  }
  return plans;
}

async function main() {
  const remove = process.argv.includes("--remove");
  const dataSource = createSeedDataSource();
  await dataSource.initialize();
  const random = createRandom(20261123);
  const plans = buildPlans(random);
  const campaignRepo = dataSource.getRepository(Campaign);
  const donationRepo = dataSource.getRepository(Donation);

  // Nhận ra theo cờ is_simulated (không theo tiêu đề): đổi cách sinh dữ liệu vẫn xóa được bản cũ.
  const existing = await campaignRepo.find({ where: { isSimulated: true }, select: { id: true } });
  if (remove) {
    const ids = existing.map((campaign) => campaign.id);
    if (ids.length > 0) {
      await dataSource.transaction(async (manager) => {
        const list = ids.map(() => "?").join(",");
        const donationIds = `SELECT id FROM donations WHERE campaign_id IN (${list})`;
        // Bảng phụ trỏ tới khoản ủng hộ / chiến dịch mô phỏng (vd. dữ liệu nhập từ máy khác).
        await manager.query(`DELETE FROM refund_requests WHERE donation_id IN (${donationIds})`, ids);
        await manager.query(`DELETE FROM reward_recipients WHERE donation_id IN (${donationIds})`, ids);
        for (const table of ["donations", "campaign_follows", "campaign_view_daily", "behavior_events", "campaign_screenings", "reward_tiers"]) {
          await manager.query(`DELETE FROM ${table} WHERE campaign_id IN (${list})`, ids);
        }
        await manager.delete(Campaign, { id: In(ids) });
      });
    }
    console.log(`Đã xóa ${ids.length} dự án mô phỏng.`);
    await dataSource.destroy();
    return;
  }
  if (existing.length > 0) {
    console.log(`Đã có ${existing.length} dự án mô phỏng — bỏ qua (dùng --remove để xóa rồi tạo lại).`);
    await dataSource.destroy();
    return;
  }

  const userRepo = dataSource.getRepository(User);
  const owners = await userRepo.find({ where: { email: In(["owner1@gopmam.com", "owner2@gopmam.com", "owner3@gopmam.com"]) } });
  const donors = await userRepo.find({ where: { email: In(Array.from({ length: 8 }, (_, i) => `user${i + 1}@gopmam.com`)) } });
  if (owners.length === 0 || donors.length === 0) {
    throw new Error("Cần chạy seed chính trước (thiếu tài khoản owner*/user*@gopmam.com).");
  }

  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const now = Date.now();
  const at = (daysAgo: number, hour = 9) => new Date(now - daysAgo * DAY_MS + hour * 3_600_000);

  const campaigns = await campaignRepo.save(
    plans.map((plan) =>
      campaignRepo.create({
        title: plan.title,
        description: plan.description,
        category: plan.category,
        location: plan.location,
        imageUrl: plan.imageUrl ?? undefined,
        videoUrl: plan.videoUrl,
        ownerId: pick(owners).id,
        organizationId: null,
        goalAmount: plan.goal,
        currentAmount: 0,
        backerCount: 0,
        viewCount: 0,
        startDate: at(plan.startedDaysAgo, 0),
        endDate: at(plan.startedDaysAgo - plan.durationDays, 23),
        status: plan.reached ? CampaignStatus.SUCCESS : CampaignStatus.FAILED,
        isSimulated: true,
        submittedAt: at(plan.startedDaysAgo + 2),
        createdAt: at(plan.startedDaysAgo + 3, 8),
      }),
    ),
    { chunk: 50 },
  );

  const rows: Array<Partial<Donation>> = [];
  let seq = 0;
  plans.forEach((plan, index) => {
    const campaign = campaigns[index];
    const target = plan.goal * plan.fundedRatio;
    const scale = Math.max(1, Math.round(plan.goal / (60 * M)));
    const endedDaysAgo = plan.startedDaysAgo - plan.durationDays;
    let raised = 0;
    while (raised < target) {
      const amount = Math.min(pick(AMOUNTS) * scale, Math.max(100_000, Math.round((target - raised) / 100_000) * 100_000));
      const daysAgo = plan.startedDaysAgo - Math.floor(random() * plan.durationDays);
      const createdAt = at(daysAgo, 7 + Math.floor(random() * 14));
      seq += 1;
      rows.push({
        userId: pick(donors).id,
        campaignId: campaign.id,
        amount,
        currency: "VND",
        paymentMethod: "wallet",
        transactionId: `${TX_PREFIX}${String(seq).padStart(6, "0")}`,
        idempotencyKey: `aihist-${seq}-${campaign.id.slice(0, 8)}`,
        isAnonymous: random() < 0.25,
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        ...(plan.reached
          ? { status: DonationStatus.COMPLETED }
          : {
              // Không đạt: tự hoàn khi kết thúc (như AutoRefundService).
              status: DonationStatus.REFUNDED,
              refundedAt: at(endedDaysAgo - 1, 10),
              refundReason: "Tự động: chiến dịch kết thúc không đạt mục tiêu hoặc bị hủy.",
              refundMethod: RefundMethod.GATEWAY,
              refundReference: `DEMO-RF-AIHIST-${seq}`,
            }),
      });
      raised += amount;
    }
  });
  await donationRepo.save(rows, { chunk: 300 });

  // Số liệu quỹ cộng từ khoản đã xác nhận (khoản đã hoàn không tính), như seed chính.
  for (const campaign of campaigns) {
    const completed = rows.filter((row) => row.campaignId === campaign.id && row.status === DonationStatus.COMPLETED);
    const refunded = rows.filter((row) => row.campaignId === campaign.id && row.status === DonationStatus.REFUNDED);
    campaign.currentAmount = completed.reduce((sum, row) => sum + Number(row.amount), 0);
    campaign.backerCount = completed.length;
    // Lượt xem ≈ lượt ủng hộ (kể cả đã hoàn) / tỷ lệ chuyển đổi 2–8%.
    campaign.viewCount = Math.round(Math.max(completed.length + refunded.length, 3) / (0.02 + random() * 0.06));
  }
  await campaignRepo.save(campaigns, { chunk: 50 });

  const reached = plans.filter((plan) => plan.reached).length;
  console.log(
    `Đã tạo ${campaigns.length} dự án mô phỏng (${reached} đạt, ${campaigns.length - reached} không đạt) ` +
      `và ${rows.length} khoản ủng hộ.`,
  );
  for (const spec of CATEGORIES) {
    const own = plans.filter((plan) => plan.category === spec.name);
    console.log(`  ${spec.name}: ${own.filter((plan) => plan.reached).length}/${own.length} đạt`);
  }
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
