import { Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

export type PasswordResetEmail = {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export type PasswordChangedEmail = {
  to: string;
  name: string;
  changedAt: Date;
};

export interface EmailGateway {
  sendPasswordReset(message: PasswordResetEmail): Promise<void>;
  sendPasswordChanged(message: PasswordChangedEmail): Promise<void>;
}

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPasswordResetEmail(message: PasswordResetEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = escapeHtml(message.resetUrl);

  return {
    subject: "Đặt lại mật khẩu tài khoản Góp Mầm",
    text: [
      `Xin chào ${message.name},`,
      "",
      "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn.",
      `Mở liên kết sau để chọn mật khẩu mới (hết hạn sau ${message.expiresInMinutes} phút, chỉ dùng được một lần):`,
      message.resetUrl,
      "",
      "Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141c33">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:bold">Đặt lại mật khẩu</p>
          <p style="margin:0 0 12px;line-height:1.6">Xin chào ${name},</p>
          <p style="margin:0 0 24px;line-height:1.6">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn. Bấm nút dưới đây để chọn mật khẩu mới.</p>
          <p style="margin:0 0 24px">
            <a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#16a34a;color:#ffffff;font-weight:bold;text-decoration:none">Đặt lại mật khẩu</a>
          </p>
          <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#4b5563">Liên kết hết hạn sau ${message.expiresInMinutes} phút và chỉ dùng được một lần. Nếu nút không bấm được, hãy dán đường dẫn này vào trình duyệt:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${url}" style="color:#16a34a">${url}</a></p>
          <p style="margin:0;line-height:1.6;font-size:14px;color:#4b5563">Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function formatVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function renderPasswordChangedEmail(message: PasswordChangedEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const when = formatVietnamTime(message.changedAt);
  const forgotUrl = escapeHtml(`${frontendBaseUrl()}/quen-mat-khau`);

  return {
    subject: "Mật khẩu tài khoản Góp Mầm vừa được thay đổi",
    text: [
      `Xin chào ${message.name},`,
      "",
      `Mật khẩu tài khoản Góp Mầm của bạn vừa được thay đổi lúc ${when} (giờ Việt Nam).`,
      "Các thiết bị khác đang đăng nhập đã bị đăng xuất.",
      "",
      "Nếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay tại:",
      `${frontendBaseUrl()}/quen-mat-khau`,
      "",
      "Góp Mầm",
    ].join("\n"),
    html: `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141c33">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:bold">Mật khẩu đã được thay đổi</p>
          <p style="margin:0 0 12px;line-height:1.6">Xin chào ${name},</p>
          <p style="margin:0 0 12px;line-height:1.6">Mật khẩu tài khoản Góp Mầm của bạn vừa được thay đổi lúc <b>${escapeHtml(when)}</b> (giờ Việt Nam). Các thiết bị khác đang đăng nhập đã bị đăng xuất.</p>
          <p style="margin:0 0 24px;line-height:1.6">Nếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay:</p>
          <p style="margin:0 0 24px">
            <a href="${forgotUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#b42318;color:#ffffff;font-weight:bold;text-decoration:none">Đặt lại mật khẩu</a>
          </p>
          <p style="margin:0;line-height:1.6;font-size:14px;color:#4b5563">Nếu chính bạn đã đổi mật khẩu, bạn không cần làm gì thêm.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

/** Gốc URL frontend dùng trong link email (không kèm dấu "/" cuối). */
export function frontendBaseUrl(env: Env = process.env): string {
  return (env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Gateway demo khi chưa cấu hình SMTP: ghi nội dung email vào log backend.
 *
 * Link chứa token còn hiệu lực, nên chỉ in ra khi `revealLinks` bật (môi
 * trường phát triển); production chỉ ghi cảnh báo, không lộ token vào log.
 */
export class LogEmailGateway implements EmailGateway {
  private readonly logger = new Logger("EmailGateway");

  constructor(private readonly revealLinks: boolean) {}

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    if (!this.revealLinks) {
      this.logger.warn(
        `Chưa cấu hình SMTP: không gửi được email đặt lại mật khẩu cho ${message.to}`,
      );
      return;
    }

    this.logger.log(
      `[demo email] Đặt lại mật khẩu cho ${message.to}: ${message.resetUrl} ` +
        `(hết hạn sau ${message.expiresInMinutes} phút)`,
    );
  }

  async sendPasswordChanged(message: PasswordChangedEmail): Promise<void> {
    this.logger.log(`[demo email] Báo đổi mật khẩu cho ${message.to}`);
  }
}

/** Gửi email thật qua SMTP (vd. Gmail + App Password). */
export class SmtpEmailGateway implements EmailGateway {
  constructor(
    private readonly transporter: Pick<Transporter, "sendMail">,
    private readonly from: string,
  ) {}

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      ...renderPasswordResetEmail(message),
    });
  }

  async sendPasswordChanged(message: PasswordChangedEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      ...renderPasswordChangedEmail(message),
    });
  }
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type Env = Record<string, string | undefined>;

/** Đọc cấu hình SMTP; trả `null` khi chưa đặt `SMTP_HOST` (dùng gateway ghi log). */
export function readSmtpConfig(env: Env = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    return null;
  }

  const port = Number(env.SMTP_PORT?.trim() || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");
  }

  const user = env.SMTP_USER?.trim() ?? "";
  // App Password của Gmail hiển thị theo nhóm "abcd efgh ijkl mnop".
  const pass = (env.SMTP_PASS ?? "").replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS are required when SMTP_HOST is set");
  }

  const secureSetting = env.SMTP_SECURE?.trim().toLowerCase();

  return {
    host,
    port,
    // 465 dùng TLS ngay từ đầu; 587 nâng cấp lên TLS bằng STARTTLS.
    secure: secureSetting ? secureSetting === "true" : port === 465,
    user,
    pass,
    from: env.MAIL_FROM?.trim() || user,
  };
}

export function createEmailGateway(env: Env = process.env): EmailGateway {
  const logger = new Logger("EmailGateway");
  const smtp = readSmtpConfig(env);

  if (!smtp) {
    logger.warn("SMTP chưa được cấu hình: email sẽ chỉ được ghi vào log.");
    return new LogEmailGateway(env.NODE_ENV !== "production");
  }

  const transporter = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: !smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  // Kiểm tra đăng nhập SMTP lúc khởi động để phát hiện sớm sai cấu hình,
  // nhưng không chặn backend khởi động nếu máy chủ mail tạm thời lỗi.
  transporter
    .verify()
    .then(() => logger.log(`SMTP sẵn sàng (${smtp.host}:${smtp.port}, gửi từ ${smtp.from})`))
    .catch((error: Error) =>
      logger.error(`Không đăng nhập được SMTP ${smtp.host}:${smtp.port}: ${error.message}`),
    );

  return new SmtpEmailGateway(transporter, smtp.from);
}
