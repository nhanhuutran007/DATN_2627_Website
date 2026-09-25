import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import { instanceToPlain } from "class-transformer";

import { Campaign } from "../src/modules/campaigns/entities/campaign.entity";
import {
  USER_PRIVATE_GROUP,
  User,
  UserRole,
  UserStatus,
} from "../src/modules/users/entities/user.entity";

function makeUser(): User {
  return Object.assign(new User(), {
    id: "123e4567-e89b-12d3-a456-426614174001",
    name: "Chủ dự án",
    email: "owner@example.com",
    phone: "0900000000",
    passwordHash: "$2a$10$secret-hash",
    role: UserRole.CAMPAIGN_OWNER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    failedLoginCount: 2,
    lockedUntil: null,
  });
}

describe("User serialization", () => {
  it("should never expose password hash or lockout state", () => {
    const plain = instanceToPlain(makeUser(), { groups: [USER_PRIVATE_GROUP] });
    equal(plain.passwordHash, undefined);
    equal(plain.failedLoginCount, undefined);
    equal(plain.lockedUntil, undefined);
  });

  it("should hide contact info by default (public owner in campaign)", () => {
    const campaign = Object.assign(new Campaign(), {
      id: "123e4567-e89b-12d3-a456-426614174010",
      title: "Thư viện",
      owner: makeUser(),
    });
    const plain = instanceToPlain({ items: [campaign], total: 1 });
    const owner = plain.items[0].owner;
    equal(owner.name, "Chủ dự án");
    equal(owner.email, undefined);
    equal(owner.phone, undefined);
    equal(owner.passwordHash, undefined);
  });

  it("should expose contact info for the private group (self/admin)", () => {
    const plain = instanceToPlain(makeUser(), { groups: [USER_PRIVATE_GROUP] });
    equal(plain.email, "owner@example.com");
    equal(plain.phone, "0900000000");
    ok(plain.name);
  });
});
