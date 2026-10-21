import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import type { EmailGateway } from "../../integrations/email/email.gateway";
import { User } from "../users/entities/user.entity";
import { StepUpCode, StepUpPurpose } from "./entities/step-up-code.entity";

export const STEP_UP_CODE_TTL_MINUTES = 10;
export const STEP_UP_MAX_ATTEMPTS = 5;
/** Không gửi mã mới nếu vừa gửi trong khoảng này (chống spam hộp thư). */
export const STEP_UP_RESEND_COOLDOWN_MS = 60_000;
/** Sau khi nhập đúng mã, thao tác cùng mục đích được làm lại trong khoảng này mà không hỏi mã nữa. */
export const STEP_UP_TOKEN_TTL_SECONDS = 10 * 60;

/** Mã lỗi để frontend biết cần mở hộp nhập mã rồi gửi lại request. */
export const STEP_UP_REQUIRED_CODE = "step_up_required";

const ACTION_LABELS: Record<StepUpPurpose, string> = {
  [StepUpPurpose.CHANGE_PASSWORD]: "đổi mật khẩu",
  [StepUpPurpose.REFUND_REQUEST]: "gửi yêu cầu hoàn tiền",
  [StepUpPurpose.ADMIN_REFUND]: "xử lý hoàn tiền",
};

type StepUpClaims = { sub: string; typ: "step_up"; purpose: StepUpPurpose };

/**
 * Khóa ký riêng cho step-up token: dùng chung khóa access token thì token này lại
 * được JwtStrategy chấp nhận như một access token.
 */
function stepUpSecret(): string {
  return `${process.env.JWT_ACCESS_SECRET ?? "default-secret"}:step-up`;
}

export function hashStepUpCode(codeId: string, code: string): string {
  return createHmac("sha256", stepUpSecret()).update(`${codeId}:${code}`).digest("hex");
}

/**
 * Xác minh bổ sung cho thao tác nhạy cảm: gửi mã 6 số qua email, đổi mã đúng lấy
 * step-up token ngắn hạn gắn với đúng người và đúng mục đích. Dùng được cho cả tài
 * khoản đăng nhập bằng Google (không có mật khẩu để nhập lại).
 */
@Injectable()
export class StepUpService {
  constructor(
    @InjectRepository(StepUpCode)
    private readonly codeRepo: Repository<StepUpCode>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    @Inject("EmailGateway")
    private readonly emailGateway: EmailGateway,
  ) {}

  async requestCode(user: User, purpose: StepUpPurpose): Promise<{ expiresInMinutes: number }> {
    const recent = await this.codeRepo.findOne({
      where: { userId: user.id, purpose, usedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < STEP_UP_RESEND_COOLDOWN_MS) {
      throw new HttpException(
        "Mã vừa được gửi, vui lòng đợi một phút rồi thử lại.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Chỉ mã mới nhất của mỗi mục đích còn dùng được.
    await this.codeRepo.update({ userId: user.id, purpose, usedAt: IsNull() }, { usedAt: new Date() });

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const row = this.codeRepo.create({
      userId: user.id,
      purpose,
      codeHash: "",
      expiresAt: new Date(Date.now() + STEP_UP_CODE_TTL_MINUTES * 60_000),
      attempts: 0,
      usedAt: null,
    });
    // HMAC gắn với id dòng nên cần id trước khi lưu.
    row.id = randomUUID();
    row.codeHash = hashStepUpCode(row.id, code);
    await this.codeRepo.save(row);

    await this.emailGateway.sendStepUpCode({
      to: user.email,
      name: user.name,
      code,
      actionLabel: ACTION_LABELS[purpose],
      expiresInMinutes: STEP_UP_CODE_TTL_MINUTES,
    });
    return { expiresInMinutes: STEP_UP_CODE_TTL_MINUTES };
  }

  async verifyCode(
    user: User,
    purpose: StepUpPurpose,
    code: string,
  ): Promise<{ stepUpToken: string; expiresInSeconds: number }> {
    const row = await this.codeRepo.findOne({
      where: { userId: user.id, purpose, usedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException("Mã xác minh đã hết hạn, vui lòng gửi mã mới.");
    }

    if (!this.matches(row, code)) {
      row.attempts += 1;
      const exhausted = row.attempts >= STEP_UP_MAX_ATTEMPTS;
      if (exhausted) row.usedAt = new Date();
      await this.codeRepo.save(row);
      await this.auditService.record({
        userId: user.id,
        action: "auth.step_up.failed",
        entity: "user",
        entityId: user.id,
        newValues: { purpose, attempts: row.attempts },
      });
      throw new BadRequestException(
        exhausted
          ? "Nhập sai quá nhiều lần, vui lòng gửi mã mới."
          : `Mã xác minh không đúng (còn ${STEP_UP_MAX_ATTEMPTS - row.attempts} lần thử).`,
      );
    }

    row.usedAt = new Date();
    await this.codeRepo.save(row);
    await this.auditService.record({
      userId: user.id,
      action: "auth.step_up.verified",
      entity: "user",
      entityId: user.id,
      newValues: { purpose },
    });

    const claims: StepUpClaims = { sub: user.id, typ: "step_up", purpose };
    const stepUpToken = this.jwtService.sign(claims, {
      secret: stepUpSecret(),
      expiresIn: STEP_UP_TOKEN_TTL_SECONDS,
    });
    return { stepUpToken, expiresInSeconds: STEP_UP_TOKEN_TTL_SECONDS };
  }

  /** Kiểm tra step-up token ở header; thiếu/sai → 403 kèm mã để frontend hỏi OTP. */
  assertToken(user: User, purpose: StepUpPurpose, token: string | undefined): void {
    if (token) {
      try {
        const claims = this.jwtService.verify<StepUpClaims>(token, { secret: stepUpSecret() });
        if (claims.typ === "step_up" && claims.sub === user.id && claims.purpose === purpose) {
          return;
        }
      } catch {
        // Hết hạn/sai chữ ký: xử lý như chưa xác minh.
      }
    }
    throw new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      message: `Vui lòng nhập mã xác minh gửi qua email để ${ACTION_LABELS[purpose]}.`,
      code: STEP_UP_REQUIRED_CODE,
      purpose,
    });
  }

  private matches(row: StepUpCode, code: string): boolean {
    const expected = Buffer.from(row.codeHash, "hex");
    const actual = Buffer.from(hashStepUpCode(row.id, code), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
