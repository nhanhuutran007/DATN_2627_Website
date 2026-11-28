import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  campaignDurationDays,
  draftDurationProblem,
  exceedsMaxDuration,
  MAX_CAMPAIGN_DURATION_DAYS,
  MIN_CAMPAIGN_DURATION_DAYS,
  publishDurationProblem,
  publishEndDate,
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

describe("Thời hạn tính từ lúc phát hành, không tự cộng ngày chờ duyệt", () => {
  it("hồ sơ nháp và gửi duyệt: 7 đến 60 ngày kể từ hôm nay", () => {
    equal(MIN_CAMPAIGN_DURATION_DAYS, 7);
    equal(draftDurationProblem(after(5), NOW), "too_short");
    equal(draftDurationProblem(after(7), NOW), null);
    equal(draftDurationProblem(after(60), NOW), null);
    equal(draftDurationProblem(after(61), NOW), null);
    equal(draftDurationProblem(after(63), NOW), "too_long");
  });

  it("phát hành: thời gian gây quỹ thật 7–60 ngày kể từ lúc bấm", () => {
    equal(publishDurationProblem(after(5), NOW), "too_short");
    equal(publishDurationProblem(after(30), NOW), null);
    equal(publishDurationProblem(after(61), NOW), null);
    equal(publishDurationProblem(after(63), NOW), "too_long");
  });
});

describe("Ngày kết thúc khi phát hành (không chọn lại)", () => {
  it("should keep the end date chosen at creation while it is still valid", () => {
    const end = after(25);
    equal(publishEndDate(end, after(-3), NOW).getTime(), end.getTime());
  });

  it("should keep the planned duration when a long review left under 7 days", () => {
    const submitted = after(-26);
    const end = after(4); // dự định 30 ngày, chờ duyệt 26 ngày
    equal(publishEndDate(end, submitted, NOW).getTime(), after(30).getTime());
  });

  it("should clamp the moved end date to 7–60 days", () => {
    equal(publishEndDate(after(1), after(-2), NOW).getTime(), after(7).getTime());
    equal(publishEndDate(after(90), null, NOW).getTime(), after(60).getTime());
  });
});
