import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  campaignDurationDays,
  draftDurationProblem,
  exceedsMaxDuration,
  MAX_CAMPAIGN_DURATION_DAYS,
  MIN_CAMPAIGN_DURATION_DAYS,
  publishDurationProblem,
  REVIEW_BUFFER_DAYS,
} from "../src/modules/campaigns/campaign-duration";

const DAY = 86_400_000;
const NOW = new Date("2026-11-25T03:00:00Z");
const after = (days: number, from = NOW) => new Date(from.getTime() + days * DAY);

describe("Giới hạn thời gian gây quỹ 60 ngày", () => {
  it("should allow up to 60 days (with one day of timezone slack) and reject longer", () => {
    equal(MAX_CAMPAIGN_DURATION_DAYS, 60);
    equal(exceedsMaxDuration(after(60), null, NOW), false);
    equal(exceedsMaxDuration(after(61), null, NOW), false);
    equal(exceedsMaxDuration(after(62), null, NOW), true);
    equal(exceedsMaxDuration(after(94), null, NOW), true);
  });

  it("should count from a future start date, and from now when the start date has passed", () => {
    const futureStart = after(10);
    equal(Math.round(campaignDurationDays(after(70), futureStart, NOW)), 60);
    equal(exceedsMaxDuration(after(70), futureStart, NOW), false);
    const pastStart = after(-20);
    equal(Math.round(campaignDurationDays(after(50), pastStart, NOW)), 50);
  });
});

describe("Thời hạn tính từ lúc phát hành, dự trù 3 ngày chờ duyệt", () => {
  it("hồ sơ nháp: 7 đến 60 + 3 ngày kể từ hôm nay", () => {
    equal(MIN_CAMPAIGN_DURATION_DAYS, 7);
    equal(REVIEW_BUFFER_DAYS, 3);
    equal(draftDurationProblem(after(5), NOW), "too_short");
    equal(draftDurationProblem(after(7), NOW), null);
    equal(draftDurationProblem(after(63), NOW), null);
    equal(draftDurationProblem(after(65), NOW), "too_long");
  });

  it("gửi duyệt: phải còn ít nhất 7 + 3 ngày", () => {
    const submit = { requireReviewBuffer: true };
    equal(draftDurationProblem(after(8), NOW, submit), "too_short");
    equal(draftDurationProblem(after(10), NOW, submit), null);
  });

  it("phát hành: thời gian gây quỹ thật 7–60 ngày kể từ lúc bấm", () => {
    equal(publishDurationProblem(after(5), NOW), "too_short");
    equal(publishDurationProblem(after(30), NOW), null);
    equal(publishDurationProblem(after(61), NOW), null);
    equal(publishDurationProblem(after(63), NOW), "too_long");
  });
});
