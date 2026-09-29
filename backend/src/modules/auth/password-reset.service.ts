import { createHash, randomBytes } from "node:crypto";

import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { IsNull, MoreThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { type EmailGateway, frontendBaseUrl } from "../../integrations/email/email.gateway";
import { User, UserStatus } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { PasswordResetToken } from "./entities/password-reset-token.entity";

export const RESET_TOKEN_TTL_MINUTES = 30;
/** Không gửi email mới nếu vừa gửi trong khoảng này (chống spam hộp thư). */
export const RESET_RESEND_COOLDOWN_MS = 60_000;

/** Phản hồi giống nhau dù email có tồn tại hay không, tránh dò tài khoản. */
export const FORGOT_PASSWORD_MESSAGE =
  "Nếu email này đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.";

const INVALID_LINK_MESSAGE =
  "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.";

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Quản lý mật khẩu: quên / đặt lại qua email và đổi mật khẩu khi đã đăng nhập.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepo: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    @Inject("EmailGateway")
    private readonly emailGateway: EmailGateway,
  ) {}

  async requestReset(email: string, requestedIp?: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user || user.status === UserStatus.BANNED) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const recent = await this.tokenRepo.findOne({
      where: { userId: user.id, usedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < RESET_RESEND_COOLDOWN_MS) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    // Chỉ link mới nhất còn dùng được.
    await this.tokenRepo.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });

    const token = randomBytes(32).toString("base64url");
    await this.tokenRepo.save(
      this.tokenRepo.create({
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
        usedAt: null,
        requestedIp: requestedIp?.slice(0, 45) ?? null,
      }),
    );

    // Lỗi gửi mail không được lộ ra response (vẫn trả thông điệp chung để
    // không tiết lộ email có tồn tại), nhưng phải ghi log và audit để xử lý.
    let emailSent = true;
    try {
      await this.emailGateway.sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl: `${frontendBaseUrl()}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (error) {
      emailSent = false;
      this.logger.error(
        `Gửi email đặt lại mật khẩu cho user ${user.id} thất bại: ${(error as Error).message}`,
      );
    }

    await this.auditService.record({
      userId: user.id,
      action: "auth.password_reset.requested",
      entity: "user",
      entityId: user.id,
      newValues: { emailSent },
    });

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.tokenRepo.findOne({
      where: {
        tokenHash: hashResetToken(token),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!record) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    const user = await this.usersService.findById(record.userId);
    if (!user || user.status === UserStatus.BANNED) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    // Đánh dấu đã dùng có điều kiện: hai request đồng thời chỉ một cái thắng.
    const claimed = await this.tokenRepo.update(
      { id: record.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (!claimed.affected) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    await this.usersService.setPassword(user, await bcrypt.hash(newPassword, 10));
    // Mở được link trong email nghĩa là người dùng sở hữu địa chỉ email này.
    if (!user.emailVerified) {
      await this.usersService.markEmailVerified(user);
    }
    await this.tokenRepo.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });
    await this.auditService.record({
      userId: user.id,
      action: "auth.password_reset.completed",
      entity: "user",
      entityId: user.id,
    });

    return { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới." };
  }

  /**
   * Đổi mật khẩu cho người dùng đang đăng nhập. Mọi JWT cũ bị vô hiệu (qua
   * `passwordChangedAt`) và link quên mật khẩu còn hạn bị hủy; controller cấp
   * token mới để phiên hiện tại tiếp tục.
   *
   * Sai mật khẩu hiện tại trả 400 chứ không phải 401: 401 làm frontend hiểu là
   * phiên hết hạn và tự đăng xuất.
   */
  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      await this.auditService.record({
        userId: user.id,
        action: "auth.password.change_failed",
        entity: "user",
        entityId: user.id,
        newValues: { reason: "invalid-current-password" },
      });
      throw new BadRequestException("Mật khẩu hiện tại không đúng.");
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }

    await this.usersService.setPassword(user, await bcrypt.hash(newPassword, 10));
    await this.tokenRepo.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });
    await this.auditService.record({
      userId: user.id,
      action: "auth.password.changed",
      entity: "user",
      entityId: user.id,
    });

    // Báo cho chủ tài khoản để phát hiện nếu không phải họ đổi.
    try {
      await this.emailGateway.sendPasswordChanged({
        to: user.email,
        name: user.name,
        changedAt: user.passwordChangedAt ?? new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Gửi email báo đổi mật khẩu cho user ${user.id} thất bại: ${(error as Error).message}`,
      );
    }
  }
}
