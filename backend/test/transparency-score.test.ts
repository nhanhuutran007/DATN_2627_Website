import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeTransparencyScore,
  type TransparencyInput,
  type TransparencyScore,
} from "../src/modules/progress/transparency-score";

const NOW = new Date("2026-11-01T00:00:00.000Z");
const DEADLINE = new Date("2026-10-20T00:00:00.000Z");
const BEFORE_DEADLINE = new Date("2026-10-19T00:00:00.000Z");
const AFTER_DEADLINE = new Date("2026-10-25T00:00:00.000Z");

const onTime = {
  state: "completed",
  budget: 10_000_000,
  targetDate: DEADLINE,
  completedAt: BEFORE_DEADLINE,
  hasEvidence: true,
} as const;
const upcoming = {
  state: "on_track",
  budget: 10_000_000,
  targetDate: new Date("2026-12-01T00:00:00.000Z"),
  hasEvidence: false,
} as const;

function input(overrides: Partial<TransparencyInput> = {}): TransparencyInput {
  return {
    reportable: true,
    milestones: [onTime, upcoming],
    totalExpense: 10_000_000,
    totalRaised: 50_000_000,
    lastUpdateAt: new Date("2026-10-30T00:00:00.000Z"),
    startDate: new Date("2026-09-01T00:00:00.000Z"),
    scheduleChanges: 0,
    now: NOW,
    ...overrides,
  };
}

function rated(score: TransparencyScore) {
  if (score.status !== "rated") throw new Error(`expected rated, got ${score.reason}`);
  return score;
}

function ratioOf(score: TransparencyScore, key: string) {
  return rated(score).criteria.find((criterion) => criterion.key === key)?.ratio;
}

describe("computeTransparencyScore", () => {
  it("does not rate campaigns that cannot be judged fairly", () => {
    deepEqual(computeTransparencyScore(input({ reportable: false })), { status: "unrated", reason: "not_reportable" });
    deepEqual(computeTransparencyScore(input({ milestones: [] })), { status: "unrated", reason: "no_plan" });
    deepEqual(computeTransparencyScore(input({ milestones: [upcoming] })), { status: "unrated", reason: "too_early" });
  });

  it("gives full marks to a campaign that reports everything on schedule", () => {
    const score = rated(computeTransparencyScore(input()));
    equal(score.score, 100);
    equal(score.grade, "high");
  });

  it("measures reported spending against what completed milestones should have spent", () => {
    const score = computeTransparencyScore(input({ totalExpense: 4_000_000 }));
    equal(ratioOf(score, "expense"), 0.4);
    equal(rated(score).score, 76);
  });

  it("expects no more spending than the money actually raised", () => {
    const score = computeTransparencyScore(input({ totalExpense: 2_000_000, totalRaised: 2_000_000 }));
    equal(ratioOf(score, "expense"), 1);
  });

  it("leaves the expense criterion out when no completed milestone needs explaining", () => {
    const overdue = { state: "overdue", budget: 10_000_000, targetDate: DEADLINE, hasEvidence: false } as const;
    const score = computeTransparencyScore(input({ milestones: [overdue], totalExpense: 0 }));
    equal(ratioOf(score, "expense"), null);
    // Đúng tiến độ 0/30, ổn định 15/15, cập nhật 15/15; mẫu số 60 vì bỏ tiêu chí chi tiêu.
    equal(rated(score).score, 50);
  });

  it("credits milestones by how they were delivered", () => {
    const score = computeTransparencyScore(
      input({
        milestones: [
          onTime,
          { state: "completed", targetDate: DEADLINE, completedAt: AFTER_DEADLINE, hasEvidence: true },
          { state: "overdue_explained", targetDate: DEADLINE, hasEvidence: true },
          { state: "overdue", targetDate: DEADLINE, hasEvidence: false },
        ],
      }),
    );
    equal(ratioOf(score, "timeliness"), (1 + 0.7 + 0.4 + 0) / 4);
  });

  it("treats a completed milestone without a deadline as on time", () => {
    const score = computeTransparencyScore(
      input({ milestones: [{ state: "completed", budget: 1_000, hasEvidence: true }] }),
    );
    equal(ratioOf(score, "timeliness"), 1);
  });

  it("gives no credit for a milestone marked done without evidence", () => {
    const claimed = { state: "completed", targetDate: DEADLINE, completedAt: BEFORE_DEADLINE, hasEvidence: false } as const;
    const score = computeTransparencyScore(
      input({ milestones: [claimed, { ...claimed }], totalExpense: 0, lastUpdateAt: null }),
    );
    equal(ratioOf(score, "timeliness"), 0);
    // Không có ngân sách nên không tính chi tiêu; chỉ còn 15/45 điểm giữ đúng kế hoạch.
    equal(rated(score).score, 33);
    ok(rated(score).criteria.some((criterion) => criterion.detail.includes("chưa có bằng chứng")));
  });

  it("lowers stability with each plan change and scales the allowance with milestones", () => {
    equal(ratioOf(computeTransparencyScore(input({ scheduleChanges: 3 })), "stability"), 0);
    equal(ratioOf(computeTransparencyScore(input({ scheduleChanges: 9 })), "stability"), 0);
    const manyMilestones = Array.from({ length: 6 }, () => onTime);
    equal(
      ratioOf(computeTransparencyScore(input({ milestones: [...manyMilestones, upcoming], scheduleChanges: 3 })), "stability"),
      1 - 3 / 7,
    );
  });

  it("decays freshness between 30 and 90 days without an update", () => {
    const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
    equal(ratioOf(computeTransparencyScore(input({ lastUpdateAt: daysAgo(30) })), "freshness"), 1);
    equal(ratioOf(computeTransparencyScore(input({ lastUpdateAt: daysAgo(60) })), "freshness"), 0.5);
    equal(ratioOf(computeTransparencyScore(input({ lastUpdateAt: daysAgo(120) })), "freshness"), 0);
  });

  it("counts time from the start date when nothing was ever posted", () => {
    const score = computeTransparencyScore(input({ lastUpdateAt: null, startDate: new Date("2026-08-03T00:00:00.000Z") }));
    equal(ratioOf(score, "freshness"), 0);
    ok(rated(score).criteria.some((criterion) => criterion.detail === "Chưa có cập nhật sau 90 ngày"));
  });

  it("stops asking for updates once every milestone is done", () => {
    const score = computeTransparencyScore(input({ milestones: [onTime], lastUpdateAt: new Date("2026-01-01T00:00:00.000Z") }));
    equal(ratioOf(score, "freshness"), null);
    equal(rated(score).score, 100);
  });
});
