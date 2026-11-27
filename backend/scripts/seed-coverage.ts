import { In, type EntityManager } from "typeorm";

import { createSeedDataSource } from "./seed-data-source";
import { Campaign, CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { CampaignComment, CommentKind, CommentStatus } from "../src/modules/comments/entities/campaign-comment.entity";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { RefundRequest, RefundRequestStatus } from "../src/modules/finance/entities/refund-request.entity";
import { Report, ReportReason, ReportStatus } from "../src/modules/moderation/entities/report.entity";
import {
  Organization,
  OrganizationStatus,
  OrganizationType,
} from "../src/modules/organizations/entities/organization.entity";
import { CampaignPost, PostVisibility } from "../src/modules/posts/entities/campaign-post.entity";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";

/**
 * Dữ liệu mẫu "đủ trường hợp" bổ sung cho seed chính, để demo/kiểm thử không thiếu tình huống:
 * - mỗi lĩnh vực chưa có dự án nào được thêm một dự án (thời điểm khác nhau: vừa mở, giữa kỳ,
 *   sắp hết hạn, đã vượt mục tiêu, đã kết thúc), kèm các trạng thái còn thiếu (bị từ chối, bị hủy);
 * - yêu cầu hoàn tiền đang chờ, báo cáo vi phạm đang chờ, bình luận bị ẩn, hỏi đáp có trả lời,
 *   bài cập nhật chỉ dành cho người ủng hộ;
 * - tổ chức bị từ chối và bị tạm ngưng; một tài khoản bị khóa.
 *
 * Chạy lặp lại an toàn: phần nào đã có (theo tiêu đề / slug / email / mã) thì bỏ qua.
 *   npm run seed:coverage
 */

const DAY_MS = 86_400_000;
const M = 1_000_000;
const MARK = "COV";

type CoverageCampaign = {
  title: string;
  category: string;
  location: string;
  owner: string;
  goal: number;
  /** Bắt đầu cách đây bao nhiêu ngày (âm = chưa tới ngày). */
  startedDaysAgo: number;
  durationDays: number;
  /** Tỷ lệ đã huy động (khoản đã xác nhận / mục tiêu). */
  funded: number;
  status: CampaignStatus;
  summary: string;
  rejectionReason?: string;
};

const CAMPAIGNS: CoverageCampaign[] = [
  { title: "Bếp ăn 0 đồng cho bệnh nhân nghèo Chợ Rẫy", category: "Ẩm thực", location: "TP. Hồ Chí Minh", owner: "owner1", goal: 60 * M, startedDaysAgo: 12, durationDays: 45, funded: 0.62, status: CampaignStatus.ACTIVE, summary: "Mỗi ngày nấu 300 suất cơm miễn phí cho bệnh nhân và người nhà đang điều trị dài ngày." },
  { title: "In sách song ngữ Việt – Mông cho thiếu nhi", category: "Xuất bản & sách", location: "Tuyên Quang", owner: "owner2", goal: 45 * M, startedDaysAgo: 3, durationDays: 40, funded: 0.08, status: CampaignStatus.ACTIVE, summary: "In 2.000 cuốn truyện tranh song ngữ để các em người Mông đọc bằng tiếng mẹ đẻ." },
  { title: "Đêm nhạc gây quỹ phẫu thuật tim cho trẻ em", category: "Âm nhạc", location: "Hà Nội", owner: "owner3", goal: 80 * M, startedDaysAgo: 28, durationDays: 30, funded: 0.91, status: CampaignStatus.ACTIVE, summary: "Đêm nhạc acoustic, toàn bộ tiền vé và quyên góp dành cho ca mổ tim của 4 em nhỏ." },
  { title: "Phục dựng hát xoan cho câu lạc bộ thiếu nhi", category: "Văn hóa nghệ thuật", location: "Phú Thọ", owner: "owner1", goal: 35 * M, startedDaysAgo: 20, durationDays: 45, funded: 1.24, status: CampaignStatus.ACTIVE, summary: "Mời nghệ nhân dạy hát xoan, may trang phục biểu diễn cho 30 em thiếu nhi." },
  { title: "Bia tưởng niệm liệt sĩ thanh niên xung phong Đồng Lộc", category: "Tưởng niệm", location: "Hà Tĩnh", owner: "owner2", goal: 40 * M, startedDaysAgo: 75, durationDays: 45, funded: 1.08, status: CampaignStatus.SUCCESS, summary: "Trùng tu khu bia tưởng niệm và lối đi cho khách viếng thăm." },
  { title: "Áo ấm và sữa cho trẻ mầm non vùng cao", category: "Trẻ em", location: "Lai Châu", owner: "owner3", goal: 30 * M, startedDaysAgo: 40, durationDays: 42, funded: 0.84, status: CampaignStatus.ACTIVE, summary: "Trao 400 áo ấm và sữa uống cả mùa đông cho trẻ mầm non bán trú." },
  { title: "Mạng lưới tình nguyện viên hỗ trợ người già neo đơn", category: "Tình nguyện", location: "Đà Nẵng", owner: "owner1", goal: 25 * M, startedDaysAgo: 8, durationDays: 35, funded: 0.33, status: CampaignStatus.ACTIVE, summary: "Đào tạo 60 tình nguyện viên thăm hỏi, đi chợ giúp người già sống một mình." },
  { title: "Xưởng mây tre đan cho phụ nữ dân tộc Cơ Tu", category: "Thủ công & làng nghề", location: "Quảng Ngãi", owner: "owner2", goal: 70 * M, startedDaysAgo: 15, durationDays: 50, funded: 0.41, status: CampaignStatus.ACTIVE, summary: "Mua nguyên liệu, máy chẻ nan và mở lớp nghề cho 25 phụ nữ trong bản." },
  { title: "Bộ sưu tập áo dài tái chế từ vải tồn kho", category: "Thiết kế & thời trang", location: "Huế", owner: "owner3", goal: 55 * M, startedDaysAgo: 5, durationDays: 30, funded: 0.12, status: CampaignStatus.ACTIVE, summary: "Thiết kế 40 mẫu áo dài từ vải tồn kho, lợi nhuận dành cho học bổng nghề may." },
  { title: "Sân bóng mini cho thiếu niên xóm chài", category: "Thể thao cộng đồng", location: "Khánh Hòa", owner: "owner1", goal: 90 * M, startedDaysAgo: -2, durationDays: 40, funded: 0, status: CampaignStatus.REJECTED, summary: "Làm sân cỏ nhân tạo cho thiếu niên xóm chài.", rejectionReason: "Chưa có văn bản đồng ý của địa phương về mặt bằng xây sân; vui lòng bổ sung rồi gửi lại." },
  { title: "Nước sạch cho điểm trường Pà Vi", category: "Nước sạch & vệ sinh", location: "Tuyên Quang", owner: "owner2", goal: 48 * M, startedDaysAgo: 33, durationDays: 35, funded: 0.72, status: CampaignStatus.ACTIVE, summary: "Lắp bồn chứa, hệ lọc và vòi rửa tay cho 180 học sinh bán trú." },
  { title: "Cầu bê tông thay cầu khỉ ấp Tân Hòa", category: "Nhà ở & hạ tầng nông thôn", location: "Cà Mau", owner: "owner3", goal: 150 * M, startedDaysAgo: 18, durationDays: 60, funded: 0.27, status: CampaignStatus.ACTIVE, summary: "Xây cầu bê tông dài 24 m để học sinh không phải đi cầu khỉ mỗi ngày." },
  { title: "Xe lăn và lớp nghề tin học cho người khuyết tật", category: "Người khuyết tật", location: "Cần Thơ", owner: "owner1", goal: 65 * M, startedDaysAgo: 25, durationDays: 45, funded: 0.58, status: CampaignStatus.ACTIVE, summary: "Trao 30 xe lăn và mở lớp tin học văn phòng 3 tháng cho người khuyết tật." },
  { title: "Bữa cơm tình thương cho cụ già neo đơn phường Vĩnh Hội", category: "Người cao tuổi", location: "TP. Hồ Chí Minh", owner: "owner2", goal: 30 * M, startedDaysAgo: 2, durationDays: 30, funded: 0.05, status: CampaignStatus.ACTIVE, summary: "Duy trì 3 tháng bữa trưa cho 50 cụ già sống một mình." },
  { title: "Điện mặt trời cho trạm y tế xã đảo", category: "Năng lượng sạch", location: "Quảng Ninh", owner: "owner3", goal: 120 * M, startedDaysAgo: 22, durationDays: 50, funded: 0.46, status: CampaignStatus.ACTIVE, summary: "Lắp hệ điện mặt trời 10 kWp để trạm y tế không bị mất điện khi bão." },
  { title: "Phim tài liệu về nghề làm muối Sa Huỳnh", category: "Điện ảnh & truyền thông", location: "Quảng Ngãi", owner: "owner1", goal: 85 * M, startedDaysAgo: 30, durationDays: 45, funded: 0.35, status: CampaignStatus.PAUSED, summary: "Ghi lại nghề làm muối truyền thống đang dần mai một ở Sa Huỳnh." },
  { title: "Homestay cộng đồng cho bản Lác", category: "Du lịch cộng đồng", location: "Sơn La", owner: "owner2", goal: 110 * M, startedDaysAgo: 10, durationDays: 45, funded: 0, status: CampaignStatus.CANCELLED, summary: "Cải tạo 3 nhà sàn làm homestay do người dân trong bản cùng quản lý." },
  { title: "Áo phao và nhu yếu phẩm cho vùng ngập lụt", category: "Cứu trợ thiên tai", location: "Quảng Trị", owner: "owner3", goal: 100 * M, startedDaysAgo: 29, durationDays: 31, funded: 0.97, status: CampaignStatus.ACTIVE, summary: "Chuẩn bị 500 áo phao và gạo, nước sạch trước mùa lũ." },
  { title: "Trạm cứu hộ chó mèo bị bỏ rơi", category: "Bảo vệ động vật", location: "Hải Phòng", owner: "owner1", goal: 50 * M, startedDaysAgo: 14, durationDays: 40, funded: 0.29, status: CampaignStatus.ACTIVE, summary: "Thuê mặt bằng, mua chuồng và chi phí triệt sản cho 120 chó mèo." },
];

/** Lời động viên công khai (một phần khoản ủng hộ). */
const MESSAGES = [
  "Chúc dự án sớm về đích!",
  "Một chút góp sức, mong các em có mùa đông ấm.",
  "Cảm ơn nhóm đã làm việc ý nghĩa này.",
  "Mong dự án lan tỏa tới nhiều nơi hơn.",
  "Ủng hộ từ một cựu học sinh vùng cao.",
];
const AMOUNTS = [100_000, 200_000, 300_000, 500_000, 1_000_000, 2_000_000];

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

async function main() {
  const dataSource = createSeedDataSource();
  await dataSource.initialize();
  const random = createRandom(20261125);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const now = Date.now();
  const at = (daysAgo: number, hour = 9) => new Date(now - daysAgo * DAY_MS + hour * 3_600_000);

  const users = await dataSource.getRepository(User).find({
    where: {
      email: In([
        "admin@gopmam.com",
        "owner1@gopmam.com",
        "owner2@gopmam.com",
        "owner3@gopmam.com",
        ...Array.from({ length: 8 }, (_, i) => `user${i + 1}@gopmam.com`),
      ]),
    },
  });
  const byEmail = new Map(users.map((user) => [user.email.split("@")[0], user]));
  const user = (key: string): User => {
    const found = byEmail.get(key);
    if (!found) throw new Error(`Thiếu tài khoản ${key}@gopmam.com — chạy seed chính trước.`);
    return found;
  };
  const admin = user("admin");
  const donors = Array.from({ length: 8 }, (_, i) => user(`user${i + 1}`));
  const log: string[] = [];

  await dataSource.transaction(async (manager) => {
    // --- 1. Dự án cho các lĩnh vực còn trống + trạng thái còn thiếu --------------------------
    const campaignRepo = manager.getRepository(Campaign);
    const existing = await campaignRepo.find({ where: { title: In(CAMPAIGNS.map((c) => c.title)) }, select: { id: true, title: true } });
    const existingTitles = new Set(existing.map((c) => c.title));
    const created: Campaign[] = [];
    let donationSeq = 0;
    for (const spec of CAMPAIGNS) {
      if (existingTitles.has(spec.title)) continue;
      const start = at(spec.startedDaysAgo, 0);
      const campaign = await campaignRepo.save(
        campaignRepo.create({
          title: spec.title,
          description:
            `<p>${spec.summary}</p>` +
            `<h3>Kế hoạch sử dụng vốn</h3><p>Toàn bộ khoản ủng hộ được chi theo từng mốc và công khai chứng từ trên Góp Mầm.</p>` +
            `<h3>Rủi ro và phương án ứng phó</h3><p>Nếu chi phí thực tế thay đổi, nhóm sẽ cập nhật cho người ủng hộ trước khi điều chỉnh.</p>`,
          category: spec.category,
          location: spec.location,
          ownerId: user(spec.owner).id,
          organizationId: null,
          goalAmount: spec.goal,
          currentAmount: 0,
          backerCount: 0,
          viewCount: 0,
          startDate: start,
          endDate: at(spec.startedDaysAgo - spec.durationDays, 23),
          status: spec.status,
          rejectionReason: spec.rejectionReason,
          submittedAt: at(spec.startedDaysAgo + 2),
          createdAt: at(spec.startedDaysAgo + 4, 8),
        }),
      );
      created.push(campaign);

      // Khoản ủng hộ đã xác nhận (ví demo), rải trong thời gian đã chạy.
      const target = spec.goal * spec.funded;
      const ranDays = Math.max(1, Math.min(spec.durationDays, spec.startedDaysAgo));
      const scale = Math.max(1, Math.round(spec.goal / (60 * M)));
      const rows: Donation[] = [];
      let raised = 0;
      while (raised < target) {
        const amount = Math.min(pick(AMOUNTS) * scale, Math.max(100_000, Math.round((target - raised) / 100_000) * 100_000));
        const daysAgo = spec.startedDaysAgo - Math.floor(random() * ranDays);
        const createdAt = at(Math.max(daysAgo, 0), 7 + Math.floor(random() * 14));
        donationSeq += 1;
        rows.push(
          manager.getRepository(Donation).create({
            userId: pick(donors).id,
            campaignId: campaign.id,
            amount,
            currency: "VND",
            status: DonationStatus.COMPLETED,
            paymentMethod: "wallet",
            transactionId: `TX-${MARK}-${campaign.id.slice(0, 8)}-${donationSeq}`,
            idempotencyKey: `${MARK.toLowerCase()}-${campaign.id.slice(0, 8)}-${donationSeq}`,
            message: random() < 0.3 ? pick(MESSAGES) : undefined,
            isAnonymous: random() < 0.7,
            completedAt: createdAt,
            createdAt,
            updatedAt: createdAt,
          }),
        );
        raised += amount;
      }
      if (rows.length > 0) await manager.getRepository(Donation).save(rows, { chunk: 200 });
      campaign.currentAmount = raised;
      campaign.backerCount = rows.length;
      campaign.viewCount = rows.length * (15 + Math.floor(random() * 30)) + 20;
      await campaignRepo.save(campaign);
    }
    log.push(`Dự án mới: ${created.length} (bỏ qua ${existingTitles.size} đã có)`);

    const coverage = await campaignRepo.find({ where: { title: In(CAMPAIGNS.map((c) => c.title)) } });
    const campaign = (prefix: string): Campaign => {
      const found = coverage.find((c) => c.title.startsWith(prefix));
      if (!found) throw new Error(`Không thấy dự án "${prefix}"`);
      return found;
    };

    // --- 2. Yêu cầu hoàn tiền đang chờ duyệt -------------------------------------------------
    const refundRepo = manager.getRepository(RefundRequest);
    const refundTargets = ["Bếp ăn 0 đồng", "Áo ấm và sữa", "Xe lăn và lớp nghề"];
    let refunds = 0;
    for (const [index, prefix] of refundTargets.entries()) {
      const donation = await manager.getRepository(Donation).findOne({
        where: { campaignId: campaign(prefix).id, status: DonationStatus.COMPLETED },
        order: { createdAt: "DESC" },
      });
      if (!donation) continue;
      const already = await refundRepo.findOne({ where: { donationId: donation.id } });
      if (already) continue;
      await refundRepo.save(
        refundRepo.create({
          donationId: donation.id,
          userId: donation.userId,
          reason: [
            "Tôi bấm nhầm số tiền, muốn ủng hộ 100.000 ₫ thay vì số này.",
            "Gia đình có việc gấp cần dùng khoản tiền này, mong được hoàn lại.",
            "Tôi đã ủng hộ trùng hai lần cho cùng dự án.",
          ][index],
          status: RefundRequestStatus.PENDING,
          createdAt: at(1, 10 + index),
        }),
      );
      refunds += 1;
    }
    log.push(`Yêu cầu hoàn tiền chờ duyệt: ${refunds}`);

    // --- 3. Hỏi đáp, bình luận bị ẩn, báo cáo vi phạm đang chờ --------------------------------
    const commentRepo = manager.getRepository(CampaignComment);
    const reportRepo = manager.getRepository(Report);
    const music = campaign("Đêm nhạc gây quỹ");
    let comments = 0;
    if (!(await commentRepo.findOne({ where: { campaignId: music.id } }))) {
      const question = await commentRepo.save(
        commentRepo.create({
          campaignId: music.id,
          userId: donors[2].id,
          kind: CommentKind.QUESTION,
          content: "Tiền vé có được trừ chi phí tổ chức không, hay chuyển hết cho các ca mổ?",
          createdAt: at(6, 20),
        }),
      );
      await commentRepo.save(
        commentRepo.create({
          campaignId: music.id,
          userId: music.ownerId,
          parentId: question.id,
          kind: CommentKind.COMMENT,
          content: "Chi phí sân khấu do nhà tài trợ chi riêng, 100% tiền vé và quyên góp chuyển cho bệnh viện.",
          createdAt: at(5, 9),
        }),
      );
      const spam = await commentRepo.save(
        commentRepo.create({
          campaignId: music.id,
          userId: donors[6].id,
          kind: CommentKind.COMMENT,
          content: "Vay tiền nhanh lãi suất thấp, liên hệ số điện thoại trong trang cá nhân.",
          status: CommentStatus.HIDDEN,
          hiddenReason: "Quảng cáo không liên quan đến dự án.",
          hiddenBy: admin.id,
          hiddenAt: at(3, 11),
          createdAt: at(4, 22),
        }),
      );
      const rude = await commentRepo.save(
        commentRepo.create({
          campaignId: campaign("Trạm cứu hộ chó mèo").id,
          userId: donors[7].id,
          kind: CommentKind.COMMENT,
          content: "Nuôi chó mèo làm gì, tiền đó đi giúp người còn hơn. Lừa đảo cả thôi.",
          createdAt: at(2, 21),
        }),
      );
      comments = 4;
      await reportRepo.save([
        reportRepo.create({
          reporterId: donors[1].id,
          commentId: spam.id,
          campaignId: music.id,
          reason: ReportReason.SPAM,
          description: "Bình luận quảng cáo cho vay, không liên quan dự án.",
          status: ReportStatus.RESOLVED,
          adminNotes: "Đã ẩn bình luận quảng cáo.",
          resolvedBy: admin.id,
          resolvedAt: at(3, 11),
          commentHidden: true,
          createdAt: at(4, 23),
        }),
        reportRepo.create({
          reporterId: donors[3].id,
          commentId: rude.id,
          campaignId: rude.campaignId,
          reason: ReportReason.INAPPROPRIATE,
          description: "Bình luận xúc phạm, vu khống dự án lừa đảo mà không có bằng chứng.",
          status: ReportStatus.PENDING,
          createdAt: at(1, 8),
        }),
        reportRepo.create({
          reporterId: donors[4].id,
          campaignId: campaign("Cầu bê tông thay cầu khỉ").id,
          reason: ReportReason.MISINFORMATION,
          description: "Ảnh cây cầu trong bài giống ảnh của một dự án khác năm ngoái, đề nghị kiểm tra.",
          status: ReportStatus.PENDING,
          createdAt: at(2, 15),
        }),
      ]);
    }
    log.push(`Bình luận/hỏi đáp mới: ${comments}`);

    // --- 4. Bài cập nhật chỉ dành cho người ủng hộ ------------------------------------------
    const postRepo = manager.getRepository(CampaignPost);
    const relief = campaign("Áo phao và nhu yếu phẩm");
    if (!(await postRepo.findOne({ where: { campaignId: relief.id } }))) {
      await postRepo.save([
        postRepo.create({
          campaignId: relief.id,
          authorId: relief.ownerId,
          number: 1,
          title: "Đã đặt may 300 áo phao đầu tiên",
          content: "<p>Xưởng may đã nhận đơn 300 áo phao, dự kiến giao trong 10 ngày. Cảm ơn mọi người!</p>",
          visibility: PostVisibility.PUBLIC,
          createdAt: at(12, 19),
        }),
        postRepo.create({
          campaignId: relief.id,
          authorId: relief.ownerId,
          number: 2,
          title: "Danh sách hộ nhận hỗ trợ (chỉ người ủng hộ xem)",
          content: "<p>Danh sách 120 hộ ưu tiên do xã lập, kèm biên bản họp thôn. Vui lòng không chia sẻ ra ngoài.</p>",
          visibility: PostVisibility.BACKERS,
          createdAt: at(4, 20),
        }),
      ]);
      log.push("Bài cập nhật: 2 (1 công khai, 1 chỉ người ủng hộ)");
    }

    // --- 5. Tổ chức bị từ chối / bị tạm ngưng -----------------------------------------------
    const orgRepo = manager.getRepository(Organization);
    const orgs: Array<Partial<Organization>> = [
      {
        slug: "quy-tu-thien-anh-duong-mau",
        name: "Quỹ từ thiện Ánh Dương (mẫu)",
        type: OrganizationType.CHARITY_FUND,
        registrationNumber: "COV-QTT-2026-001",
        issuedBy: "UBND tỉnh Nghệ An",
        mission: "Hỗ trợ học sinh nghèo vượt khó tại các huyện miền núi.",
        email: "lienhe@anhduong.example",
        phone: "0238 3800 111",
        address: "12 Lê Lợi, phường Vinh Phú",
        province: "Nghệ An",
        documentUrl: "/images/seed/hoa-don-mau-1.svg",
        representativeId: user("user5").id,
        representativeTitle: "Chủ tịch quỹ",
        status: OrganizationStatus.REJECTED,
        reviewNotes: "Giấy phép thành lập quỹ đã hết hạn, số quyết định không khớp với cơ quan cấp.",
        reviewedBy: admin.id,
        reviewedAt: at(9, 10),
        submittedAt: at(12, 15),
      },
      {
        slug: "hoi-bao-ve-moi-truong-xanh-mau",
        name: "Hội Bảo vệ môi trường Xanh (mẫu)",
        type: OrganizationType.NGO,
        registrationNumber: "COV-NGO-2026-002",
        issuedBy: "Sở Nội vụ TP. Đà Nẵng",
        mission: "Làm sạch bờ biển và giáo dục phân loại rác cho học sinh.",
        email: "hoixanh@example.org",
        phone: "0236 3600 222",
        address: "45 Võ Nguyên Giáp, phường Sơn Trà",
        province: "Đà Nẵng",
        documentUrl: "/images/seed/hoa-don-mau-2.svg",
        representativeId: user("user6").id,
        representativeTitle: "Chủ tịch hội",
        status: OrganizationStatus.SUSPENDED,
        reviewNotes: "Tạm ngưng vì chậm báo cáo sử dụng quỹ quá 60 ngày; mở lại khi nộp đủ báo cáo.",
        reviewedBy: admin.id,
        reviewedAt: at(5, 14),
        verifiedAt: at(120, 9),
        submittedAt: at(130, 9),
      },
    ];
    let orgCount = 0;
    for (const org of orgs) {
      if (await orgRepo.findOne({ where: { slug: org.slug } })) continue;
      await orgRepo.save(orgRepo.create(org));
      orgCount += 1;
    }
    log.push(`Tổ chức mới: ${orgCount} (bị từ chối, bị tạm ngưng)`);

    // --- 6. Tài khoản bị khóa ---------------------------------------------------------------
    const userRepo = manager.getRepository(User);
    if (!(await userRepo.findOne({ where: { email: "user9@gopmam.com" } }))) {
      // Mật khẩu giống tài khoản mẫu (Test@123): chép hash của user1.
      const template = await userRepo.findOne({ where: { id: donors[0].id }, select: { id: true, passwordHash: true } });
      await userRepo.save(
        userRepo.create({
          name: "Lý Văn Khóa",
          email: "user9@gopmam.com",
          passwordHash: template?.passwordHash ?? "",
          role: UserRole.USER,
          status: UserStatus.BANNED,
          emailVerified: true,
          createdAt: at(90, 9),
        }),
      );
      log.push("Tài khoản bị khóa: user9@gopmam.com");
    }

    log.push(`Lĩnh vực có dự án mới: ${new Set(coverage.map((c) => c.category)).size}`);
  });

  for (const line of log) console.log(line);
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
