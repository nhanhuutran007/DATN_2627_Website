import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { OptionalJwtAuthGuard } from "../src/modules/auth/guards/optional-jwt-auth.guard";

describe("OptionalJwtAuthGuard", () => {
  const guard = new OptionalJwtAuthGuard();

  it("should pass anonymous requests without an Authorization header", async () => {
    const request: { headers: Record<string, string>; user?: unknown } = { headers: {} };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    equal(await guard.canActivate(context), true);
    equal(request.user, null);
  });

  it("should treat an expired or revoked token as a guest instead of 401", () => {
    equal(guard.handleRequest(new Error("jwt expired"), false), null);
  });

  it("should keep the user when the token is valid", () => {
    const user = { id: "u1" };
    equal(guard.handleRequest(null, user), user);
  });
});
