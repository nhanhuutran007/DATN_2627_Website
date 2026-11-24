import { Logger } from "@nestjs/common";

import { emailCategoryLabel, type EmailCategory } from "./email-categories";
import type {
  EmailGateway,
  EmailVerificationEmail,
  NotificationEmail,
  PasswordChangedEmail,
  PasswordResetEmail,
  StepUpCodeEmail,
} from "./email.gateway";

/** Nguồn cấu hình: loại email này có đang được phép gửi không. */
export interface EmailPolicy {
  isEnabled(category: EmailCategory): Promise<boolean>;
}

function maskEmail(address: string): string {
  return address.replace(/^(.{1,2})[^@]*@/, "$1***@");
}

/**
 * Bọc gateway thật: loại email bị admin tắt thì không gửi, chỉ ghi log (ở môi trường phát triển kèm
 * link/mã để vẫn thử được luồng). Đọc cấu hình lỗi thì vẫn gửi — không để lỗi cấu hình chặn email
 * bảo mật như đặt lại mật khẩu.
 */
export class PolicyEmailGateway implements EmailGateway {
  private readonly logger = new Logger("EmailGateway");

  constructor(
    private readonly inner: EmailGateway,
    private readonly policy: EmailPolicy,
    private readonly revealLinks: boolean,
  ) {}

  private async allowed(category: EmailCategory, to: string, detail?: string): Promise<boolean> {
    let enabled = true;
    try {
      enabled = await this.policy.isEnabled(category);
    } catch (error) {
      this.logger.error(`Không đọc được cài đặt email, vẫn gửi: ${(error as Error).message}`);
    }
    if (!enabled) {
      const extra = this.revealLinks && detail ? ` — ${detail}` : "";
      this.logger.log(`[email đã tắt] Bỏ qua "${emailCategoryLabel(category)}" cho ${maskEmail(to)}${extra}`);
    }
    return enabled;
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    if (await this.allowed("password_reset", message.to, message.resetUrl)) await this.inner.sendPasswordReset(message);
  }

  async sendPasswordChanged(message: PasswordChangedEmail): Promise<void> {
    if (await this.allowed("password_changed", message.to)) await this.inner.sendPasswordChanged(message);
  }

  async sendEmailVerification(message: EmailVerificationEmail): Promise<void> {
    if (await this.allowed("account_verification", message.to, message.verifyUrl)) {
      await this.inner.sendEmailVerification(message);
    }
  }

  async sendStepUpCode(message: StepUpCodeEmail): Promise<void> {
    if (await this.allowed("step_up_code", message.to, `mã ${message.code}`)) await this.inner.sendStepUpCode(message);
  }

  async sendNotification(message: NotificationEmail): Promise<void> {
    if (await this.allowed(message.category ?? "other", message.to, `"${message.subject}"`)) {
      await this.inner.sendNotification(message);
    }
  }
}
