import { equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";

import { ForbiddenException } from "@nestjs/common";

import { NonAdminGuard } from "../src/modules/auth/guards/non-admin.guard";
import { UserRole } from "../src/modules/users/entities/user.entity";

describe("NonAdminGuard", () => {
  const guard = new NonAdminGuard();
  const contextFor = (user: unknown) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as never;

  it("should reject admin accounts", () => {
    throws(() => guard.canActivate(contextFor({ id: "a1", role: UserRole.ADMIN })), ForbiddenException);
  });

  it("should allow regular users and campaign owners", () => {
    equal(guard.canActivate(contextFor({ id: "u1", role: UserRole.USER })), true);
    equal(guard.canActivate(contextFor({ id: "u2", role: UserRole.CAMPAIGN_OWNER })), true);
  });
});
