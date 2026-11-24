import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { campaignDurationDays, exceedsMaxDuration, MAX_CAMPAIGN_DURATION_DAYS } from "../src/modules/campaigns/campaign-duration";

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
