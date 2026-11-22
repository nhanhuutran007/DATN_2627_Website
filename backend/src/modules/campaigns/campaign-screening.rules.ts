/**
 * Duyệt tự động (sàng lọc) hồ sơ chiến dịch bằng luật: kiểm tra đủ thông tin, giấy tờ/xác minh,
 * nội dung cấm và chấm điểm rủi ro 0–100. Hàm thuần (không đọc DB) để dễ kiểm thử; dữ liệu do
 * `CampaignScreeningService` gom lại. Kết quả chỉ để hỗ trợ: hệ thống không bao giờ tự từ chối,
 * chỉ có thể tự phát hành hồ sơ rủi ro thấp khi admin bật chế độ đó.
 */

export const SCREENING_RULES_VERSION = "2026.11-r1";

export type ScreeningLevel = "low" | "medium" | "high";
/** `auto_approve`: đủ điều kiện tự phát hành; `manual_review`: admin xét; `needs_info`: nên yêu cầu bổ sung. */
export type ScreeningRecommendation = "auto_approve" | "manual_review" | "needs_info";
export type ScreeningCheckKey = "completeness" | "verification" | "content" | "risk";
export type ScreeningStatus = "pass" | "warn" | "fail";

export type ScreeningFinding = { status: Exclude<ScreeningStatus, "pass">; message: string; points: number };

export type ScreeningCheck = {
  key: ScreeningCheckKey;
  label: string;
  status: ScreeningStatus;
  points: number;
  findings: ScreeningFinding[];
  /** Ghi chú tích cực (vd. đã có chiến dịch thành công) — không cộng điểm rủi ro. */
  notes: string[];
};

export type ScreeningInput = {
  campaign: {
    title: string;
    /** Câu chuyện đã bỏ thẻ HTML. */
    descriptionText: string;
    goalAmount: number;
    startDate: Date | null;
    endDate: Date;
    imageUrl?: string | null;
    location?: string | null;
    organizationId?: string | null;
  };
  milestones: Array<{ budget: number | null }>;
  owner: {
    emailVerified: boolean;
    createdAt: Date;
    hasContact: boolean;
  };
  /** Trạng thái tổ chức thụ hưởng (khi gây quỹ cho tổ chức). */
  organizationStatus: string | null;
  history: {
    rejectedCampaigns: number;
    successfulCampaigns: number;
    /** Báo cáo vi phạm đã được admin xác nhận (resolved) trên các chiến dịch khác của chủ dự án. */
    upheldReports: number;
  };
  /** Số chiến dịch của người khác trùng tên hoặc trùng đoạn đầu câu chuyện. */
  duplicates: number;
  now: Date;
};

export type ScreeningResult = {
  score: number;
  level: ScreeningLevel;
  recommendation: ScreeningRecommendation;
  checks: ScreeningCheck[];
  /** Lý do gợi ý khi đề xuất yêu cầu bổ sung (admin có thể dùng hoặc sửa). */
  suggestedReason: string | null;
  rulesVersion: string;
};

const DAY_MS = 86_400_000;
const MIN_STORY_CHARS = 300;
const MIN_TITLE_CHARS = 10;

/** Bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng — để so khớp từ khóa ổn định. */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Bỏ thẻ HTML của câu chuyện để đếm ký tự và dò từ khóa. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type ContentRule = { label: string; pattern: RegExp; status: "warn" | "fail"; points: number };

/**
 * Nội dung cấm/nhạy cảm theo điều khoản nền tảng, so trên văn bản đã bỏ dấu. Tránh từ ngắn dễ
 * trùng sau khi bỏ dấu (vd. "sung" nằm trong "bổ sung", "do" trong mọi câu).
 */
export const CONTENT_RULES: ContentRule[] = [
  { label: "cờ bạc, cá độ", pattern: /\b(co bac|danh bac|ca do|ca cuoc|lo de|nha cai|casino|xoc dia|tai xiu)\b/, status: "fail", points: 40 },
  { label: "ma túy, chất cấm", pattern: /\b(ma tuy|can sa|thuoc lac|ke ton|heroin|cocaine|ma men)\b/, status: "fail", points: 40 },
  { label: "vũ khí, chất nổ", pattern: /\b(vu khi|sung dan|sung ngan|dan duoc|thuoc no|chat no)\b/, status: "fail", points: 40 },
  { label: "nội dung người lớn", pattern: /\b(khieu dam|noi dung nguoi lon|phim sex|sex)\b/, status: "fail", points: 40 },
  { label: "bạo lực, khủng bố", pattern: /\b(khung bo|kich dong bao luc)\b/, status: "fail", points: 40 },
  {
    label: "huy động vốn/đầu tư hứa lợi nhuận (đa cấp, tiền ảo…)",
    pattern: /\b(da cap|ponzi|cam ket loi nhuan|loi nhuan cam ket|lai suat cao|nhan doi so tien|x2 tai khoan|hoan von 100|dau tu sinh loi|tien ao|forex|chia co tuc)\b/,
    status: "fail",
    points: 30,
  },
  {
    label: "kêu gọi chuyển tiền ngoài nền tảng (số tài khoản, ví riêng)",
    pattern: /\b(stk|so tai khoan|chuyen khoan truc tiep|chuyen khoan rieng|vi momo|zalo pay)\b[^0-9]{0,30}\d[\d .-]{7,20}/,
    status: "fail",
    points: 30,
  },
  { label: "đường dẫn rút gọn khó kiểm chứng", pattern: /\b(bit\.ly|tinyurl\.com|shorturl\.at|cutt\.ly|rb\.gy)\b/, status: "warn", points: 10 },
];

function makeCheck(key: ScreeningCheckKey, label: string, findings: ScreeningFinding[], notes: string[] = []): ScreeningCheck {
  const status: ScreeningStatus = findings.some((f) => f.status === "fail")
    ? "fail"
    : findings.length > 0
      ? "warn"
      : "pass";
  return { key, label, status, points: findings.reduce((sum, f) => sum + f.points, 0), findings, notes };
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} ₫`;
}

function checkCompleteness(input: ScreeningInput): ScreeningCheck {
  const { campaign, milestones, now } = input;
  const findings: ScreeningFinding[] = [];
  if (campaign.title.trim().length < MIN_TITLE_CHARS) {
    findings.push({ status: "fail", message: `Tên dự án quá ngắn (tối thiểu ${MIN_TITLE_CHARS} ký tự).`, points: 10 });
  }
  const storyLength = campaign.descriptionText.length;
  if (storyLength < MIN_STORY_CHARS) {
    findings.push({
      status: "fail",
      message: `Câu chuyện quá ngắn (${storyLength}/${MIN_STORY_CHARS} ký tự): cần nêu rõ mục đích, dự toán và cách sử dụng tiền.`,
      points: 10,
    });
  }
  if (milestones.length === 0) {
    findings.push({ status: "fail", message: "Chưa có kế hoạch theo mốc (mốc, hạn, ngân sách).", points: 10 });
  } else {
    const planned = milestones.reduce((sum, m) => sum + (Number(m.budget) || 0), 0);
    const goal = campaign.goalAmount;
    if (goal > 0 && Math.abs(planned - goal) / goal > 0.1) {
      findings.push({
        status: "warn",
        message: `Tổng ngân sách các mốc ${money(planned)} lệch hơn 10% so với mục tiêu ${money(goal)}.`,
        points: 5,
      });
    }
  }
  if (!campaign.imageUrl) findings.push({ status: "warn", message: "Chưa có ảnh đại diện của dự án.", points: 4 });
  if (!campaign.location?.trim()) findings.push({ status: "warn", message: "Chưa ghi địa điểm thực hiện.", points: 4 });
  if (campaign.endDate.getTime() <= now.getTime()) {
    findings.push({ status: "fail", message: "Ngày kết thúc gây quỹ đã qua.", points: 10 });
  } else {
    const start = campaign.startDate && campaign.startDate.getTime() > now.getTime() ? campaign.startDate : now;
    const days = Math.round((campaign.endDate.getTime() - start.getTime()) / DAY_MS);
    if (days > 90) findings.push({ status: "warn", message: `Thời gian gây quỹ dài (${days} ngày, khuyến nghị ≤ 90 ngày).`, points: 4 });
  }
  return makeCheck("completeness", "Đủ thông tin bắt buộc", findings);
}

function checkVerification(input: ScreeningInput): ScreeningCheck {
  const { owner, organizationStatus, campaign, history, now } = input;
  const findings: ScreeningFinding[] = [];
  const notes: string[] = [];
  if (!owner.emailVerified) {
    findings.push({ status: "fail", message: "Email của chủ dự án chưa được xác minh.", points: 20 });
  }
  if (campaign.organizationId) {
    if (organizationStatus !== "verified") {
      findings.push({ status: "fail", message: "Tổ chức thụ hưởng chưa được xác minh giấy phép.", points: 25 });
    } else {
      notes.push("Gây quỹ cho tổ chức đã xác minh giấy phép.");
    }
  }
  const accountDays = Math.floor((now.getTime() - owner.createdAt.getTime()) / DAY_MS);
  if (accountDays < 7) {
    findings.push({ status: "warn", message: `Tài khoản mới tạo ${accountDays} ngày.`, points: 10 });
  }
  if (!owner.hasContact) {
    findings.push({ status: "warn", message: "Chủ dự án chưa có số điện thoại hoặc thông tin liên hệ công khai.", points: 5 });
  }
  if (history.successfulCampaigns > 0) {
    notes.push(`Đã có ${history.successfulCampaigns} chiến dịch đạt mục tiêu trên nền tảng.`);
  }
  return makeCheck("verification", "Giấy tờ và xác minh", findings, notes);
}

function checkContent(input: ScreeningInput): ScreeningCheck {
  const text = foldText(`${input.campaign.title} ${input.campaign.descriptionText}`);
  const findings: ScreeningFinding[] = [];
  for (const rule of CONTENT_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      findings.push({
        status: rule.status,
        message: `Có dấu hiệu nội dung ${rule.label} (khớp “${match[0].trim().slice(0, 40)}”).`,
        points: rule.points,
      });
    }
  }
  return makeCheck("content", "Nội dung cấm", findings);
}

function checkRisk(input: ScreeningInput): ScreeningCheck {
  const { campaign, owner, history, duplicates, now } = input;
  const findings: ScreeningFinding[] = [];
  const goal = campaign.goalAmount;
  if (goal >= 2_000_000_000) {
    findings.push({ status: "warn", message: `Mục tiêu rất lớn (${money(goal)}).`, points: 20 });
  } else if (goal >= 500_000_000) {
    findings.push({ status: "warn", message: `Mục tiêu lớn (${money(goal)}).`, points: 10 });
  }
  const accountDays = (now.getTime() - owner.createdAt.getTime()) / DAY_MS;
  if (goal >= 200_000_000 && accountDays < 30 && history.successfulCampaigns === 0) {
    findings.push({ status: "warn", message: "Tài khoản mới, chưa có chiến dịch thành công nhưng đặt mục tiêu cao.", points: 10 });
  }
  if (duplicates > 0) {
    findings.push({
      status: "fail",
      message: `Trùng tên hoặc câu chuyện với ${duplicates} chiến dịch của người khác (có thể sao chép).`,
      points: 30,
    });
  }
  if (history.rejectedCampaigns >= 2) {
    findings.push({ status: "warn", message: `Chủ dự án đã bị từ chối ${history.rejectedCampaigns} hồ sơ trước đó.`, points: 10 });
  }
  if (history.upheldReports > 0) {
    findings.push({
      status: "warn",
      message: `Có ${history.upheldReports} báo cáo vi phạm đã được xác nhận trên chiến dịch khác của chủ dự án.`,
      points: 15,
    });
  }
  return makeCheck("risk", "Điểm rủi ro", findings);
}

export function screeningLevel(score: number): ScreeningLevel {
  if (score >= 55) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function screenCampaign(input: ScreeningInput): ScreeningResult {
  const checks = [checkCompleteness(input), checkVerification(input), checkContent(input), checkRisk(input)];
  const trustBonus = input.history.successfulCampaigns > 0 ? 10 : 0;
  const score = Math.max(0, Math.min(100, checks.reduce((sum, c) => sum + c.points, 0) - trustBonus));
  const level = screeningLevel(score);
  const [completeness, verification] = checks;

  let recommendation: ScreeningRecommendation;
  if (completeness.status === "fail") {
    recommendation = "needs_info";
  } else if (checks.some((c) => c.status === "fail") || level !== "low" || verification.status !== "pass") {
    recommendation = "manual_review";
  } else {
    recommendation = "auto_approve";
  }

  const suggestedReason =
    recommendation === "needs_info"
      ? completeness.findings
        .filter((f) => f.status === "fail")
        .map((f) => f.message)
        .join(" ")
      : null;

  return { score, level, recommendation, checks, suggestedReason, rulesVersion: SCREENING_RULES_VERSION };
}
