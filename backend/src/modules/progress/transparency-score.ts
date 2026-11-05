import type { MilestoneState } from "./progress.service";

/**
 * Điểm minh bạch 0-100 của chiến dịch, tính tại thời điểm đọc từ dữ liệu công khai.
 * Tiêu chí chưa áp dụng được bỏ khỏi cả tử và mẫu, nên không làm tăng hay giảm điểm.
 * Điểm đo mức độ giải trình, không khẳng định chứng từ là thật.
 */
export const TRANSPARENCY_WEIGHTS = { expense: 40, timeliness: 30, stability: 15, freshness: 15 } as const;

export type TransparencyCriterionKey = keyof typeof TRANSPARENCY_WEIGHTS;
export type TransparencyGrade = "high" | "good" | "fair" | "low";
export type TransparencyUnratedReason = "not_reportable" | "no_plan" | "too_early";

export type TransparencyCriterion = {
  key: TransparencyCriterionKey;
  label: string;
  weight: number;
  /** Mức đạt 0-1; null khi chưa áp dụng. */
  ratio: number | null;
  detail: string;
};

export type TransparencyScore =
  | { status: "rated"; score: number; grade: TransparencyGrade; criteria: TransparencyCriterion[] }
  | { status: "unrated"; reason: TransparencyUnratedReason };

export type TransparencyInput = {
  /** Chủ dự án đang được phép báo cáo; chiến dịch nháp hoặc thất bại thì không chấm. */
  reportable: boolean;
  milestones: {
    state: MilestoneState;
    budget?: number | string | null;
    targetDate?: Date | null;
    completedAt?: Date | null;
    /** Có bài cập nhật kèm ảnh hoặc chứng từ; bấm hoàn thành suông không được tính. */
    hasEvidence: boolean;
  }[];
  totalExpense: number;
  totalRaised: number;
  lastUpdateAt: Date | null;
  startDate?: Date | null;
  /** Số lần đổi hạn hoặc ngân sách sau khi phát hành. */
  scheduleChanges: number;
  now: Date;
};

const DAY_MS = 86_400_000;
/** Không có cập nhật trong số ngày này vẫn đạt trọn tiêu chí, sau đó giảm dần. */
const FRESH_DAYS = 30;
const STALE_DAYS = 90;
/** Số lần đổi kế hoạch tối thiểu để tiêu chí ổn định về 0; dự án nhiều mốc được nới theo số mốc. */
const MIN_CHANGE_ALLOWANCE = 3;

const CREDIT_ON_TIME = 1;
const CREDIT_COMPLETED_LATE = 0.7;
const CREDIT_OVERDUE_EXPLAINED = 0.4;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

function gradeOf(score: number): TransparencyGrade {
  if (score >= 85) return "high";
  if (score >= 65) return "good";
  if (score >= 40) return "fair";
  return "low";
}

/** Chỉ mốc đã hoàn thành mới phải giải trình chi: mốc trễ đã bị tính ở tiêu chí đúng hạn. */
function expenseCriterion(input: TransparencyInput): TransparencyCriterion {
  const completedBudget = input.milestones
    .filter((milestone) => milestone.state === "completed")
    .reduce((total, milestone) => total + Number(milestone.budget ?? 0), 0);
  const expected = Math.min(completedBudget, input.totalRaised);
  return {
    key: "expense",
    label: "Giải trình chi tiêu",
    weight: TRANSPARENCY_WEIGHTS.expense,
    ratio: expected > 0 ? clamp(input.totalExpense / expected) : null,
    detail:
      expected > 0
        ? `Đã báo cáo ${formatVnd(input.totalExpense)} trên ${formatVnd(expected)} cần giải trình`
        : "Chưa có mốc hoàn thành nào cần giải trình chi tiêu",
  };
}

function timelinessCriterion(input: TransparencyInput): TransparencyCriterion {
  let onTime = 0;
  let completedLate = 0;
  let explained = 0;
  let unexplained = 0;
  let unproven = 0;
  for (const { state, targetDate, completedAt, hasEvidence } of input.milestones) {
    if (state === "overdue") unexplained += 1;
    if (state === "overdue_explained") explained += 1;
    if (state !== "completed") continue;
    const late = targetDate && completedAt && new Date(completedAt) > new Date(targetDate);
    if (!hasEvidence) unproven += 1;
    else if (late) completedLate += 1;
    else onTime += 1;
  }
  const due = onTime + completedLate + explained + unexplained + unproven;
  const credit =
    onTime * CREDIT_ON_TIME + completedLate * CREDIT_COMPLETED_LATE + explained * CREDIT_OVERDUE_EXPLAINED;
  const parts = [
    onTime > 0 && `${onTime} mốc đúng hạn`,
    completedLate > 0 && `${completedLate} mốc hoàn thành trễ`,
    explained > 0 && `${explained} mốc chậm đã giải trình`,
    unexplained > 0 && `${unexplained} mốc chậm chưa giải trình`,
    unproven > 0 && `${unproven} mốc báo hoàn thành nhưng chưa có bằng chứng`,
  ].filter(Boolean);
  return {
    key: "timeliness",
    label: "Đúng tiến độ",
    weight: TRANSPARENCY_WEIGHTS.timeliness,
    ratio: credit / due,
    detail: parts.join(", "),
  };
}

function stabilityCriterion(input: TransparencyInput): TransparencyCriterion {
  const allowance = Math.max(MIN_CHANGE_ALLOWANCE, input.milestones.length);
  return {
    key: "stability",
    label: "Giữ đúng kế hoạch",
    weight: TRANSPARENCY_WEIGHTS.stability,
    ratio: clamp(1 - input.scheduleChanges / allowance),
    detail:
      input.scheduleChanges > 0
        ? `${input.scheduleChanges} lần đổi hạn hoặc ngân sách sau khi phát hành`
        : "Chưa đổi hạn hoặc ngân sách sau khi phát hành",
  };
}

function freshnessCriterion(input: TransparencyInput): TransparencyCriterion {
  const base = {
    key: "freshness" as const,
    label: "Cập nhật đều đặn",
    weight: TRANSPARENCY_WEIGHTS.freshness,
  };
  if (input.milestones.every((milestone) => milestone.state === "completed")) {
    return { ...base, ratio: null, detail: "Đã hoàn thành mọi mốc" };
  }
  const since = input.lastUpdateAt ?? input.startDate;
  if (!since) return { ...base, ratio: null, detail: "Chưa có mốc thời gian để so sánh" };
  const days = Math.max(0, Math.floor((input.now.getTime() - new Date(since).getTime()) / DAY_MS));
  const ratio = clamp((STALE_DAYS - days) / (STALE_DAYS - FRESH_DAYS));
  if (!input.lastUpdateAt) return { ...base, ratio, detail: `Chưa có cập nhật sau ${days} ngày` };
  return { ...base, ratio, detail: days === 0 ? "Vừa cập nhật hôm nay" : `Cập nhật gần nhất ${days} ngày trước` };
}

export function computeTransparencyScore(input: TransparencyInput): TransparencyScore {
  if (!input.reportable) return { status: "unrated", reason: "not_reportable" };
  if (input.milestones.length === 0) return { status: "unrated", reason: "no_plan" };
  if (input.milestones.every((milestone) => milestone.state === "on_track")) {
    return { status: "unrated", reason: "too_early" };
  }

  const criteria = [
    expenseCriterion(input),
    timelinessCriterion(input),
    stabilityCriterion(input),
    freshnessCriterion(input),
  ];
  let earned = 0;
  let possible = 0;
  for (const { ratio, weight } of criteria) {
    if (ratio === null) continue;
    earned += ratio * weight;
    possible += weight;
  }
  const score = Math.round((earned / possible) * 100);
  return { status: "rated", score, grade: gradeOf(score), criteria };
}
