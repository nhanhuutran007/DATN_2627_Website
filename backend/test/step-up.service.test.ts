import { equal, match, ok, rejects, throws } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

import type { EmailGateway, StepUpCodeEmail } from "../src/integrations/email/email.gateway";
import { StepUpCode, StepUpPurpose } from "../src/modules/auth/entities/step-up-code.entity";
import { RequireStepUp, StepUpGuard } from "../src/modules/auth/guards/step-up.guard";
import {
  STEP_UP_MAX_ATTEMPTS,
  STEP_UP_REQUIRED_CODE,
  StepUpService,
} from "../src/modules/auth/step-up.service";
import type { User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const user = { id: "user-1", email: "a@example.com", name: "An" } as User;
const otherUser = { id: "user-2", email: "b@example.com", name: "Bình" } as User;

type Where = { userId: string; purpose: StepUpPurpose };

/** Bảng `step_up_codes` giả: `findOne`/`update` chỉ xét mã chưa dùng (`usedAt` null). */
function makeCodeRepo() {
  const rows: StepUpCode[] = [];
  const open = (where: Where) =>
    rows.filter((row) => row.userId === where.userId && row.purpose === where.purpose && !row.usedAt);
  const repo = {
    create: (data: Partial<StepUpCode>) => Object.assign(new StepUpCode(), data),
    save: async (row: StepUpCode) => {
      if (!rows.includes(row)) {
        row.createdAt = new Date();
        rows.push(row);
      }
      return row;
    },
    findOne: async ({ where }: { where: Where }) => open(where).at(-1) ?? null,
    update: async (where: Where, patch: Partial<StepUpCode>) => {
      for (const row of open(where)) Object.assign(row, patch);
      return { affected: 1 };
    },
  };
  return { rows, repo };
}

describe("StepUpService", () => {
  let service: StepUpService;
  let codes: ReturnType<typeof makeCodeRepo>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let sent: StepUpCodeEmail[];

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    codes = makeCodeRepo();
    audit = makeAuditRecorder();
    sent = [];
    const emailGateway = {
      sendStepUpCode: async (message: StepUpCodeEmail) => {
        sent.push(message);
      },
    } as unknown as EmailGateway;
    service = new StepUpService(codes.repo as never, new JwtService(), audit.service, emailGateway);
  });

  it("gửi mã 6 số qua email, chỉ lưu HMAC", async () => {
    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);

    equal(sent.length, 1);
    match(sent[0].code, /^\d{6}$/);
    equal(sent[0].actionLabel, "đổi mật khẩu");
    equal(codes.rows.length, 1);
    ok(codes.rows[0].codeHash !== sent[0].code);
    equal(codes.rows[0].codeHash.length, 64);
  });

  it("chặn gửi lại trong 60 giây", async () => {
    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);
    await rejects(service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD), { status: 429 });
  });

  it("gửi mã mới làm mã cũ hết hiệu lực", async () => {
    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);
    const oldCode = sent[0].code;
    codes.rows[0].createdAt = new Date(Date.now() - 120_000);

    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);

    ok(codes.rows[0].usedAt);
    if (oldCode !== sent[1].code) {
      await rejects(service.verifyCode(user, StepUpPurpose.CHANGE_PASSWORD, oldCode), { status: 400 });
    }
  });

  it("mã đúng → step-up token dùng được cho đúng người, đúng mục đích; mã chỉ dùng một lần", async () => {
    await service.requestCode(user, StepUpPurpose.REFUND_REQUEST);
    const { stepUpToken } = await service.verifyCode(user, StepUpPurpose.REFUND_REQUEST, sent[0].code);

    service.assertToken(user, StepUpPurpose.REFUND_REQUEST, stepUpToken);
    throws(() => service.assertToken(user, StepUpPurpose.CHANGE_PASSWORD, stepUpToken), { status: 403 });
    throws(() => service.assertToken(otherUser, StepUpPurpose.REFUND_REQUEST, stepUpToken), { status: 403 });
    await rejects(service.verifyCode(user, StepUpPurpose.REFUND_REQUEST, sent[0].code), { status: 400 });
    equal(audit.entries.at(-1)?.action, "auth.step_up.verified");
  });

  it("step-up token không dùng được như access token", async () => {
    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);
    const { stepUpToken } = await service.verifyCode(user, StepUpPurpose.CHANGE_PASSWORD, sent[0].code);

    throws(() => new JwtService().verify(stepUpToken, { secret: "test-access-secret" }));
  });

  it(`sai ${STEP_UP_MAX_ATTEMPTS} lần thì mã bị hủy, ghi audit mỗi lần sai`, async () => {
    await service.requestCode(user, StepUpPurpose.ADMIN_REFUND);
    const wrong = sent[0].code === "000000" ? "111111" : "000000";

    for (let i = 1; i < STEP_UP_MAX_ATTEMPTS; i++) {
      await rejects(service.verifyCode(user, StepUpPurpose.ADMIN_REFUND, wrong), /còn/);
    }
    await rejects(service.verifyCode(user, StepUpPurpose.ADMIN_REFUND, wrong), /quá nhiều lần/);
    await rejects(service.verifyCode(user, StepUpPurpose.ADMIN_REFUND, sent[0].code), /hết hạn/);
    equal(audit.entries.filter((entry) => entry.action === "auth.step_up.failed").length, STEP_UP_MAX_ATTEMPTS);
  });

  it("mã quá hạn bị từ chối", async () => {
    await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);
    codes.rows[0].expiresAt = new Date(Date.now() - 1000);

    await rejects(service.verifyCode(user, StepUpPurpose.CHANGE_PASSWORD, sent[0].code), { status: 400 });
  });

  it("thiếu/sai token → 403 kèm mã step_up_required và mục đích", () => {
    try {
      service.assertToken(user, StepUpPurpose.CHANGE_PASSWORD, "garbage");
      throw new Error("should have thrown");
    } catch (error) {
      const response = (error as { getResponse: () => { code: string; purpose: string } }).getResponse();
      equal(response.code, STEP_UP_REQUIRED_CODE);
      equal(response.purpose, StepUpPurpose.CHANGE_PASSWORD);
    }
  });

  describe("StepUpGuard", () => {
    class Target {
      @RequireStepUp(StepUpPurpose.CHANGE_PASSWORD)
      protectedAction() {}
      openAction() {}
    }

    function context(handler: () => void, headers: Record<string, string> = {}): ExecutionContext {
      return {
        getHandler: () => handler,
        getClass: () => Target,
        switchToHttp: () => ({ getRequest: () => ({ user, headers }) }),
      } as unknown as ExecutionContext;
    }

    it("cho qua endpoint không yêu cầu step-up, chặn endpoint có yêu cầu khi thiếu header", () => {
      const guard = new StepUpGuard(new Reflector(), service);
      equal(guard.canActivate(context(Target.prototype.openAction)), true);
      throws(() => guard.canActivate(context(Target.prototype.protectedAction)), { status: 403 });
    });

    it("cho qua khi header có step-up token hợp lệ", async () => {
      await service.requestCode(user, StepUpPurpose.CHANGE_PASSWORD);
      const { stepUpToken } = await service.verifyCode(user, StepUpPurpose.CHANGE_PASSWORD, sent[0].code);
      const guard = new StepUpGuard(new Reflector(), service);

      equal(
        guard.canActivate(context(Target.prototype.protectedAction, { "x-step-up-token": stepUpToken })),
        true,
      );
    });
  });
});
