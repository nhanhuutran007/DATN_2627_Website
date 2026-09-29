import { randomBytes } from "node:crypto";

import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { type EmailGateway, frontendBaseUrl } from "../../integrations/email/email.gateway";
import { User, UserStatus } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { EmailVerificationToken } from "./entities/email-verification-token.entity";
import { hashResetToken as hashToken } from "./password-reset.service";

export const VERIFY_TOKEN_TTL_HOURS = 24;
/** Không gửi lại email xác minh nếu vừa gửi trong khoảng này (chống spam hộp thư). */
export const VERIFY_RESEND_COOLDOWN_MS = 60_000;

const INVALID_LINK_MESSAGE =
  "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy đăng nhập và yêu cầu gửi lại email xác minh.";

export type SendVerificationResult = "sent" | "cooldown" | "already-verified" | "failed";

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepo: Repository<EmailVerificationToken>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    @Inject("EmailGateway")
    private readonly emailGateway: EmailGateway,
  ) {}

  /**
   * Tạo link xác minh mới (hủy link cũ) và gửi email. Không bao giờ ném lỗi do
   * gửi mail: đăng ký vẫn thành công, người dùng có thể yêu cầu gửi lại sau.
   */
  async sendVerification(user: User): Promise<SendVerificationResult> {
    if (user.emailVerified) {
      return "already-verified";
    }

    const recent = await this.tokenRepo.findOne({
      where: { userId: user.id, usedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < VERIFY_RESEND_COOLDOWN_MS) {
      return "cooldown";
    }

    await this.tokenRepo.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });

    const token = randomBytes(32).toString("base64url");
    await this.tokenRepo.save(
      this.tokenRepo.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60_000),
        usedAt: null,
      }),
    );

    let result: SendVerificationResult = "sent";
    try {
      await this.emailGateway.sendEmailVerification({
        to: user.email,
        name: user.name,
        verifyUrl: `${frontendBaseUrl()}/xac-minh-email?token=${encodeURIComponent(token)}`,
        expiresInHours: VERIFY_TOKEN_TTL_HOURS,
      });
    } catch (error) {
      result = "failed";
      this.logger.error(
        `Gửi email xác minh cho user ${user.id} thất bại: ${(error as Error).message}`,
      );
    }

    await this.auditService.record({
      userId: user.id,
      action: "auth.email_verification.sent",
      entity: "user",
      entityId: user.id,
      newValues: { emailSent: result === "sent" },
    });
    return result;
  }

  /** Gửi email xác minh cho tài khoản vừa đăng ký; lỗi chỉ được ghi log. */
  async sendVerificationForUserId(userId: string): Promise<void> {
    try {
      const user = await this.usersService.findById(userId);
      if (user) {
        await this.sendVerification(user);
      }
    } catch (error) {
      this.logger.error(`Không tạo được email xác minh cho user ${userId}: ${(error as Error).message}`);
    }
  }

  /** Người dùng đã đăng nhập yêu cầu gửi lại email xác minh. */
  async resend(user: User): Promise<{ message: string }> {
    const result = await this.sendVerification(user);

    if (result === "already-verified") {
      throw new BadRequestException("Email của bạn đã được xác minh.");
    }
    if (result === "cooldown") {
      throw new BadRequestException("Email xác minh vừa được gửi. Vui lòng đợi một phút rồi thử lại.");
    }
    if (result === "failed") {
      throw new BadRequestException("Chưa gửi được email xác minh. Vui lòng thử lại sau ít phút.");
    }
    return { message: `Đã gửi email xác minh tới ${user.email}. Vui lòng kiểm tra hộp thư.` };
  }

  async verify(token: string): Promise<{ message: string; email: string }> {
    const record = await this.tokenRepo.findOne({
      where: { tokenHash: hashToken(token), usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (!record) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    const user = await this.usersService.findById(record.userId);
    if (!user || user.status === UserStatus.BANNED) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    const claimed = await this.tokenRepo.update(
      { id: record.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (!claimed.affected) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    if (!user.emailVerified) {
      await this.usersService.markEmailVerified(user);
      await this.auditService.record({
        userId: user.id,
        action: "auth.email_verification.completed",
        entity: "user",
        entityId: user.id,
      });
    }

    return { message: "Xác minh email thành công.", email: user.email };
  }
}
