import { equal, match, notEqual, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import type {
  EmailGateway,
  PasswordChangedEmail,
  PasswordResetEmail,
} from "../src/integrations/email/email.gateway";
import { issuedBeforePasswordChange } from "../src/modules/auth/auth.service";
import {
  FORGOT_PASSWORD_MESSAGE,
  hashResetToken,
  PasswordResetService,
} from "../src/modules/auth/password-reset.service";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { UsersService } from "../src/modules/users/users.service";
import { makeAuditRecorder } from "./helpers/audit";
import { makeTokenRepo } from "./helpers/token-repo";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Nguyễn Minh An",
    email: "an@example.com",
    passwordHash: "old-hash",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    failedLoginCount: 3,
    lockedUntil: new Date(Date.now() + 60_000),
    passwordChangedAt: null,
    ...overrides,
  } as User;
}

describe("PasswordResetService", () => {
  let user: User;
  let tokenRepo: ReturnType<typeof makeTokenRepo>;
  let sent: PasswordResetEmail[];
  let changedNotices: PasswordChangedEmail[];
  let failSend: boolean;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: PasswordResetService;

  beforeEach(() => {
    user = makeUser();
    tokenRepo = makeTokenRepo();
    sent = [];
    changedNotices = [];
    failSend = false;
    audit = makeAuditRecorder();

    const usersService = {
      findByEmail: async (email: string) => (email === user.email ? user : null),
      findById: async (id: string) => (id === user.id ? user : null),
      setPassword: async (target: User, passwordHash: string) => {
        target.passwordHash = passwordHash;
        target.passwordChangedAt = new Date();
        target.failedLoginCount = 0;
        target.lockedUntil = null;
        return target;
      },
      markEmailVerified: async (target: User) => {
        target.emailVerified = true;
        return target;
      },
    } as unknown as UsersService;
    const emailGateway: EmailGateway = {
      sendPasswordReset: async (message) => {
        if (failSend) throw new Error("SMTP down");
        sent.push(message);
      },
      sendPasswordChanged: async (message) => {
        if (failSend) throw new Error("SMTP down");
        changedNotices.push(message);
      },
      sendEmailVerification: async () => {},
    };

    service = new PasswordResetService(
      tokenRepo as never,
      usersService,
      audit.service,
      emailGateway,
    );
  });

  function tokenFromEmail(index = 0): string {
    const url = new URL(sent[index].resetUrl);
    return url.searchParams.get("token")!;
  }

  describe("requestReset", () => {
    it("emails a one-time link and stores only the token hash", async () => {
      const result = await service.requestReset(user.email, "10.0.0.1");

      equal(result.message, FORGOT_PASSWORD_MESSAGE);
      equal(sent.length, 1);
      match(sent[0].resetUrl, /\/dat-lai-mat-khau\?token=/);

      const token = tokenFromEmail();
      equal(tokenRepo.rows.length, 1);
      equal(tokenRepo.rows[0].tokenHash, hashResetToken(token));
      notEqual(tokenRepo.rows[0].tokenHash, token);
      ok(tokenRepo.rows[0].expiresAt.getTime() > Date.now());
      ok(audit.entries.some((entry) => entry.action === "auth.password_reset.requested"));
    });

    it("still answers generically when the email cannot be sent, and audits it", async () => {
      failSend = true;
      const result = await service.requestReset(user.email);

      equal(result.message, FORGOT_PASSWORD_MESSAGE);
      const entry = audit.entries.find((item) => item.action === "auth.password_reset.requested");
      equal(entry?.newValues?.emailSent, false);
    });

    it("answers the same way for unknown emails without sending anything", async () => {
      const result = await service.requestReset("khong-ton-tai@example.com");

      equal(result.message, FORGOT_PASSWORD_MESSAGE);
      equal(sent.length, 0);
      equal(tokenRepo.rows.length, 0);
    });

    it("does not send to banned accounts", async () => {
      user.status = UserStatus.BANNED;
      await service.requestReset(user.email);

      equal(sent.length, 0);
    });

    it("does not resend within the cooldown", async () => {
      await service.requestReset(user.email);
      await service.requestReset(user.email);

      equal(sent.length, 1);
    });

    it("invalidates the previous link when a new one is issued", async () => {
      await service.requestReset(user.email);
      tokenRepo.rows[0].createdAt = new Date(Date.now() - 5 * 60_000);
      const firstToken = tokenFromEmail(0);

      await service.requestReset(user.email);
      equal(sent.length, 2);

      await rejects(service.resetPassword(firstToken, "matkhaumoi123"), BadRequestException);
      await service.resetPassword(tokenFromEmail(1), "matkhaumoi123");
    });
  });

  describe("resetPassword", () => {
    it("sets the new password, unlocks the account and marks the change time", async () => {
      await service.requestReset(user.email);
      const result = await service.resetPassword(tokenFromEmail(), "matkhaumoi123");

      match(result.message, /thành công/);
      ok(await bcrypt.compare("matkhaumoi123", user.passwordHash));
      equal(user.failedLoginCount, 0);
      equal(user.lockedUntil, null);
      ok(user.passwordChangedAt instanceof Date);
      equal(user.emailVerified, true);
      ok(audit.entries.some((entry) => entry.action === "auth.password_reset.completed"));
    });

    it("rejects a link that was already used", async () => {
      await service.requestReset(user.email);
      const token = tokenFromEmail();

      await service.resetPassword(token, "matkhaumoi123");
      await rejects(service.resetPassword(token, "matkhaukhac123"), BadRequestException);
      ok(await bcrypt.compare("matkhaumoi123", user.passwordHash));
    });

    it("rejects an expired link", async () => {
      await service.requestReset(user.email);
      tokenRepo.rows[0].expiresAt = new Date(Date.now() - 1_000);

      await rejects(service.resetPassword(tokenFromEmail(), "matkhaumoi123"), BadRequestException);
      equal(user.passwordHash, "old-hash");
    });

    it("rejects an unknown token", async () => {
      await rejects(
        service.resetPassword("x".repeat(43), "matkhaumoi123"),
        BadRequestException,
      );
    });

    it("rejects the link if the account was banned in the meantime", async () => {
      await service.requestReset(user.email);
      user.status = UserStatus.BANNED;

      await rejects(service.resetPassword(tokenFromEmail(), "matkhaumoi123"), BadRequestException);
      equal(user.passwordHash, "old-hash");
    });
  });

  describe("changePassword", () => {
    beforeEach(async () => {
      user.passwordHash = await bcrypt.hash("matkhaucu123", 4);
    });

    it("changes the password, marks the change time and notifies the owner", async () => {
      await service.changePassword(user, "matkhaucu123", "matkhaumoi456");

      ok(await bcrypt.compare("matkhaumoi456", user.passwordHash));
      ok(user.passwordChangedAt instanceof Date);
      equal(changedNotices.length, 1);
      equal(changedNotices[0].to, user.email);
      ok(audit.entries.some((entry) => entry.action === "auth.password.changed"));
    });

    it("rejects a wrong current password with 400 and audits it", async () => {
      await rejects(
        service.changePassword(user, "sai-mat-khau", "matkhaumoi456"),
        BadRequestException,
      );

      ok(await bcrypt.compare("matkhaucu123", user.passwordHash));
      equal(user.passwordChangedAt, null);
      ok(audit.entries.some((entry) => entry.action === "auth.password.change_failed"));
    });

    it("rejects reusing the current password", async () => {
      await rejects(
        service.changePassword(user, "matkhaucu123", "matkhaucu123"),
        BadRequestException,
      );
      equal(user.passwordChangedAt, null);
    });

    it("invalidates pending reset links", async () => {
      await service.requestReset(user.email);
      const token = tokenFromEmail();

      await service.changePassword(user, "matkhaucu123", "matkhaumoi456");
      await rejects(service.resetPassword(token, "matkhaukhac789"), BadRequestException);
    });

    it("still succeeds when the notification email fails", async () => {
      failSend = true;
      await service.changePassword(user, "matkhaucu123", "matkhaumoi456");

      ok(await bcrypt.compare("matkhaumoi456", user.passwordHash));
    });
  });
});

describe("issuedBeforePasswordChange", () => {
  const changedAt = new Date("2026-09-28T10:00:00.500Z");
  const changedAtSeconds = Math.floor(changedAt.getTime() / 1000);

  it("accepts every token when the password was never changed", () => {
    equal(issuedBeforePasswordChange(makeUser(), 1), false);
  });

  it("rejects tokens issued before the change", () => {
    equal(issuedBeforePasswordChange(makeUser({ passwordChangedAt: changedAt }), changedAtSeconds - 1), true);
  });

  it("accepts tokens issued in the same second or later", () => {
    const user = makeUser({ passwordChangedAt: changedAt });

    equal(issuedBeforePasswordChange(user, changedAtSeconds), false);
    equal(issuedBeforePasswordChange(user, changedAtSeconds + 60), false);
  });

  it("rejects tokens without iat once the password has changed", () => {
    equal(issuedBeforePasswordChange(makeUser({ passwordChangedAt: changedAt }), undefined), true);
  });
});
