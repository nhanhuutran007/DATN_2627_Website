import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { HealthController } from "../src/modules/health/health.controller";

describe("HealthController", () => {
  it("returns an explicit healthy response", () => {
    const response = new HealthController().getHealth();

    equal(response.service, "backend");
    equal(response.status, "ok");
    equal(Number.isNaN(Date.parse(response.timestamp)), false);
  });
});
