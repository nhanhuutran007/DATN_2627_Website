import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  foldText,
  htmlToPlainText,
  screenCampaign,
  screeningLevel,
  type ScreeningInput,
} from "../src/modules/campaigns/campaign-screening.rules";
import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const NOW = new Date("2026-11-23T03:00:00Z");
const DAY = 86_400_000;
const STORY =
  "Thư viện nhỏ cho điểm trường Nậm Cang đã xuống cấp sau mùa mưa. Chúng tôi cần sửa mái, đóng thêm hai kệ sách " +
  "và mua 600 đầu sách thiếu nhi. Dự toán gồm vật liệu sửa mái 12 triệu, kệ sách 6 triệu, sách 22 triệu. Mỗi mốc " +
  "đều có hóa đơn và ảnh nghiệm thu đăng công khai trên trang dự án để người ủng hộ theo dõi tiến độ và chi tiêu.";

function baseInput(overrides: Partial<ScreeningInput> = {}): ScreeningInput {
  return {
    campaign: {
      title: "Sửa thư viện điểm trường Nậm Cang",
      descriptionText: STORY,
      goalAmount: 40_000_000,
      startDate: NOW,
      endDate: new Date(NOW.getTime() + 30 * DAY),
      imageUrl: "/api/v1/media/campaigns/a.webp",
      location: "Sa Pa, Lào Cai",
      organizationId: null,
    },
    milestones: [{ budget: 18_000_000 }, { budget: 22_000_000 }],
    owner: { emailVerified: true, createdAt: new Date(NOW.getTime() - 60 * DAY), hasContact: true },
    organizationStatus: null,
    history: { rejectedCampaigns: 0, successfulCampaigns: 0, upheldReports: 0 },
    duplicates: 0,
    now: NOW,
    ...overrides,
  };
}

describe("campaign screening rules", () => {
  it("hồ sơ đầy đủ, đã xác minh, nội dung sạch → rủi ro thấp, đủ điều kiện tự phát hành", () => {
    const result = screenCampaign(baseInput());
    equal(result.score, 0);
    equal(result.level, "low");
    equal(result.recommendation, "auto_approve");
    deepEqual(result.checks.map((c) => c.status), ["pass", "pass", "pass", "pass"]);
  });

  it("thiếu câu chuyện và kế hoạch mốc → đề xuất yêu cầu bổ sung kèm lý do", () => {
    const result = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, descriptionText: "Giúp tôi với." }, milestones: [] }),
    );
    equal(result.recommendation, "needs_info");
    equal(result.checks[0].status, "fail");
    ok(result.suggestedReason?.includes("Câu chuyện quá ngắn"));
    ok(result.suggestedReason?.includes("kế hoạch theo mốc"));
  });

  it("email chưa xác minh hoặc tổ chức chưa xác minh → admin phải xét", () => {
    const unverified = screenCampaign(baseInput({ owner: { ...baseInput().owner, emailVerified: false } }));
    equal(unverified.recommendation, "manual_review");
    equal(unverified.checks[1].status, "fail");

    const org = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, organizationId: "org-1" }, organizationStatus: "pending" }),
    );
    equal(org.recommendation, "manual_review");
    ok(org.checks[1].findings.some((f) => f.message.includes("Tổ chức")));
  });

  it("phát hiện nội dung cấm sau khi bỏ dấu, không bắt nhầm từ thường gặp", () => {
    const gambling = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, descriptionText: `${STORY} Tham gia CÁ ĐỘ bóng đá để nhân đôi số tiền.` } }),
    );
    equal(gambling.checks[2].status, "fail");
    equal(gambling.level, "high");
    equal(gambling.recommendation, "manual_review");

    const offPlatform = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, descriptionText: `${STORY} Vui lòng chuyển khoản trực tiếp STK 0123 456 789 cho tôi.` } }),
    );
    ok(offPlatform.checks[2].findings.some((f) => f.message.includes("ngoài nền tảng")));

    // "bổ sung" có chuỗi "sung", "đỏ" bỏ dấu thành "do" — không được coi là vũ khí/cá độ.
    const clean = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, descriptionText: `${STORY} Bổ sung sách cho lớp học mái tôn đỏ.` } }),
    );
    equal(clean.checks[2].status, "pass");
  });

  it("trùng nội dung với chiến dịch khác và tài khoản mới đặt mục tiêu lớn → rủi ro cao", () => {
    const result = screenCampaign(
      baseInput({
        campaign: { ...baseInput().campaign, goalAmount: 800_000_000 },
        milestones: [{ budget: 800_000_000 }],
        owner: { emailVerified: true, createdAt: new Date(NOW.getTime() - 2 * DAY), hasContact: false },
        duplicates: 1,
      }),
    );
    equal(result.level, "high");
    equal(result.checks[3].status, "fail");
    ok(result.score >= 55);
  });

  it("chủ dự án đã có chiến dịch thành công được trừ điểm, ngưỡng mức rủi ro ổn định", () => {
    const trusted = screenCampaign(
      baseInput({ campaign: { ...baseInput().campaign, imageUrl: null }, history: { rejectedCampaigns: 0, successfulCampaigns: 2, upheldReports: 0 } }),
    );
    equal(trusted.score, 0);
    equal(screeningLevel(24), "low");
    equal(screeningLevel(25), "medium");
    equal(screeningLevel(55), "high");
  });

  it("bỏ dấu và bỏ thẻ HTML", () => {
    equal(foldText("  Đồng   CÁ Độ "), "dong ca do");
    equal(htmlToPlainText("<p>Xin <b>chào</b></p><script>alert(1)</script>&nbsp;bạn"), "Xin chào bạn");
  });
});

describe("CampaignsService — duyệt tự động khi gửi hồ sơ", () => {
  function setup(mode: "manual_all" | "auto_low_risk", recommendation: "auto_approve" | "manual_review") {
    const campaign: any = { id: "c1", ownerId: "owner-1", title: "Sửa thư viện", status: CampaignStatus.DRAFT, endDate: new Date(Date.now() + 30 * 86_400_000) };
    const updates: any[] = [];
    const repo: any = {
      findOne: async () => campaign,
      save: async (value: any) => value,
      update: async (where: any, patch: any) => {
        updates.push({ where, patch });
        return { affected: where.status === campaign.status ? 1 : 0 };
      },
    };
    const marked: string[] = [];
    const screening: any = {
      screen: async () => ({ campaignId: "c1", score: 5, level: "low", recommendation, rulesVersion: "t", checks: [] }),
      markAutoApproved: async (id: string) => marked.push(id),
    };
    const settings: any = { get: async () => ({ campaignReviewMode: mode, updatedAt: null }) };
    const audit = makeAuditRecorder();
    const notifier = makeNotifierRecorder();
    const service = new CampaignsService(repo, audit.service, notifier.service, screening, settings);
    const owner: any = { id: "owner-1", role: "user" };
    return { service, owner, updates, marked, audit, notifier };
  }

  it("mặc định (admin duyệt tất cả): chỉ chấm điểm, hồ sơ vẫn chờ admin", async () => {
    const { service, owner, updates, marked } = setup("manual_all", "auto_approve");
    const saved = await service.submitForReview("c1", owner);
    equal(saved.status, CampaignStatus.PENDING);
    equal(updates.length, 0);
    equal(marked.length, 0);
  });

  it("chế độ tự duyệt rủi ro thấp: hồ sơ đủ điều kiện được duyệt (chưa phát hành), ghi audit hệ thống và báo chủ dự án", async () => {
    const { service, owner, marked, audit, notifier, updates } = setup("auto_low_risk", "auto_approve");
    const saved = await service.submitForReview("c1", owner);
    equal(saved.status, CampaignStatus.APPROVED);
    deepEqual(updates[0].patch, { status: CampaignStatus.APPROVED });
    deepEqual(marked, ["c1"]);
    const entry = audit.entries.find((e) => e.action === "campaign.auto_approve");
    ok(entry);
    equal(entry?.userId, undefined);
    ok(notifier.notified.length >= 1);
  });

  it("chế độ tự duyệt nhưng hồ sơ cần xem xét → vẫn chờ admin, không bao giờ tự từ chối", async () => {
    const { service, owner, updates } = setup("auto_low_risk", "manual_review");
    const saved = await service.submitForReview("c1", owner);
    equal(saved.status, CampaignStatus.PENDING);
    equal(updates.length, 0);
  });
});
