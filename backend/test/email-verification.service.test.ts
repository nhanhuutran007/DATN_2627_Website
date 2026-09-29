import { equal, match, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import type { EmailGateway, EmailVerificationEmail } from "../src/integrations/email/email.gateway";
import { EmailVerificationService } from "../src/modules/auth/email-verification.service";
import { hashResetToken } from "../src/modules/auth/password-reset.service";
import { User, UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { UsersService } from "../src/modules/users/users.service";
import { makeAuditRecorder } from "./helpers/audit";
import { makeTokenRepo } from "./helpers/token-repo";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Nguyễn Minh An",
    email: "an@example.com",
    passwordHash: "hash",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    ...overrides,
  } as User;
}

describe("EmailVerificationService", () => {
  let user: User;
  let tokenRepo: ReturnType<typeof makeTokenRepo>;
  let sent: EmailVerificationEmail[];
  let failSend: boolean;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: EmailVerificationService;

  beforeEach(() => {
    user = makeUser();
    tokenRepo = makeTokenRepo();
    sent = [];
    failSend = false;
    audit = makeAuditRecorder();

    const usersService = {
      findById: async (id: string) => (id === user.id ? user : null),
      markEmailVerified: async (target: User) => {
        target.emailVerified = true;
        return target;
      },
    } as unknown as UsersService;
    const emailGateway = {
      sendEmailVerification: async (message: EmailVerificationEmail) => {
        if (failSend) throw new Error("SMTP down");
        sent.push(message);
      },
    } as unknown as EmailGateway;

    service = new EmailVerificationService(tokenRepo as never, usersService, audit.service, emailGateway);
  });

  function tokenFromEmail(index = 0): string {
    return new URL(sent[index].verifyUrl).searchParams.get("token")!;
  }

  describe("sendVerification", () => {
    it("emails a one-time link and stores only the token hash", async () => {
      equal(await service.sendVerification(user), "sent");

      equal(sent.length, 1);
      equal(sent[0].to, user.email);
      match(sent[0].verifyUrl, /\/xac-minh-email\?token=/);
      equal(tokenRepo.rows.length, 1);
      equal(tokenRepo.rows[0].tokenHash, hashResetToken(tokenFromEmail()));
      ok(tokenRepo.rows[0].expiresAt.getTime() > Date.now() + 23 * 60 * 60_000);
    });

    it("does nothing for already verified accounts", async () => {
      user.emailVerified = true;

      equal(await service.sendVerification(user), "already-verified");
      equal(sent.length, 0);
    });

    it("does not resend within the cooldown", async () => {
      await service.sendVerification(user);

      equal(await service.sendVerification(user), "cooldown");
      equal(sent.length, 1);
    });

    it("reports a failed delivery without throwing", async () => {
      failSend = true;

      equal(await service.sendVerification(user), "failed");
      const entry = audit.entries.find((item) => item.action === "auth.email_verification.sent");
      equal(entry?.newValues?.emailSent, false);
    });

    it("sendVerificationForUserId never throws", async () => {
      failSend = true;
      await service.sendVerificationForUserId(user.id);
      await service.sendVerificationForUserId("unknown-id");
    });
  });

  describe("resend", () => {
    it("explains why nothing was sent", async () => {
      await service.resend(user);
      await rejects(service.resend(user), /vừa được gửi/);

      user.emailVerified = true;
      await rejects(service.resend(user), /đã được xác minh/);
    });
  });

  describe("verify", () => {
    it("marks the email as verified and audits it", async () => {
      await service.sendVerification(user);
      const result = await service.verify(tokenFromEmail());

      equal(result.email, user.email);
      equal(user.emailVerified, true);
      ok(audit.entries.some((entry) => entry.action === "auth.email_verification.completed"));
    });

    it("rejects a link that was already used", async () => {
      await service.sendVerification(user);
      const token = tokenFromEmail();

      await service.verify(token);
      await rejects(service.verify(token), BadRequestException);
    });

    it("rejects an expired link", async () => {
      await service.sendVerification(user);
      tokenRepo.rows[0].expiresAt = new Date(Date.now() - 1_000);

      await rejects(service.verify(tokenFromEmail()), BadRequestException);
      equal(user.emailVerified, false);
    });

    it("only the newest link works", async () => {
      await service.sendVerification(user);
      tokenRepo.rows[0].createdAt = new Date(Date.now() - 5 * 60_000);
      const first = tokenFromEmail(0);

      await service.sendVerification(user);
      await rejects(service.verify(first), BadRequestException);
      await service.verify(tokenFromEmail(1));
      equal(user.emailVerified, true);
    });

    it("rejects links for banned accounts", async () => {
      await service.sendVerification(user);
      user.status = UserStatus.BANNED;

      await rejects(service.verify(tokenFromEmail()), BadRequestException);
    });
  });
});
