import { Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

import { EMAIL_LOGO_CID, EMAIL_LOGO_PNG_BASE64 } from "./email-logo";

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

export type EmailVerificationEmail = {
  to: string;
  name: string;
  verifyUrl: string;
  expiresInHours: number;
};

/** Mã OTP xác minh bổ sung trước thao tác nhạy cảm (đổi mật khẩu, hoàn tiền...). */
export type StepUpCodeEmail = {
  to: string;
  name: string;
  code: string;
  /** Mô tả thao tác cần xác minh, vd. "đổi mật khẩu". */
  actionLabel: string;
  expiresInMinutes: number;
};

/** Email kèm thông báo trong ứng dụng (vd. kết quả xét duyệt chiến dịch). */
export type NotificationEmail = {
  to: string;
  name: string;
  subject: string;
  /** Nội dung thuần văn bản; mỗi phần tử là một đoạn. */
  paragraphs: string[];
  /** Đường dẫn tương đối trong web (vd. `/dashboard`), ghép với FRONTEND_URL. */
  link?: string;
  linkLabel?: string;
};

export interface EmailGateway {
  sendPasswordReset(message: PasswordResetEmail): Promise<void>;
  sendPasswordChanged(message: PasswordChangedEmail): Promise<void>;
  sendEmailVerification(message: EmailVerificationEmail): Promise<void>;
  sendNotification(message: NotificationEmail): Promise<void>;
  sendStepUpCode(message: StepUpCodeEmail): Promise<void>;
}

/** Ảnh nhúng trong email, tham chiếu bằng `cid:` trong HTML (định dạng của nodemailer). */
export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  cid: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailVerificationEmail(message: EmailVerificationEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = escapeHtml(message.verifyUrl);

  return {
    subject: "Xác minh email tài khoản Góp Mầm",
    text: [
      `Xin chào ${message.name},`,
      "",
      "Cảm ơn bạn đã tạo tài khoản Góp Mầm. Mở liên kết sau để xác minh địa chỉ email",
      `(hết hạn sau ${message.expiresInHours} giờ, chỉ dùng được một lần):`,
      message.verifyUrl,
      "",
      "Nếu bạn không tạo tài khoản, hãy bỏ qua email này.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141c33">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:bold">Xác minh email của bạn</p>
          <p style="margin:0 0 12px;line-height:1.6">Xin chào ${name},</p>
          <p style="margin:0 0 24px;line-height:1.6">Cảm ơn bạn đã tạo tài khoản Góp Mầm. Bấm nút dưới đây để xác nhận đây là địa chỉ email của bạn.</p>
          <p style="margin:0 0 24px">
            <a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#16a34a;color:#ffffff;font-weight:bold;text-decoration:none">Xác minh email</a>
          </p>
          <p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#4b5563">Liên kết hết hạn sau ${message.expiresInHours} giờ và chỉ dùng được một lần. Nếu nút không bấm được, hãy dán đường dẫn này vào trình duyệt:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${url}" style="color:#16a34a">${url}</a></p>
          <p style="margin:0;line-height:1.6;font-size:14px;color:#4b5563">Nếu bạn không tạo tài khoản, hãy bỏ qua email này.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

const EMAIL_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Logo đính kèm inline (CID) cho các email dùng `brandedEmailHtml`. */
export function emailLogoAttachment(): EmailAttachment {
  return {
    filename: "gopmam-logo.png",
    content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
    contentType: "image/png",
    cid: EMAIL_LOGO_CID,
  };
}

/**
 * Khung HTML chung cho email tài khoản (theo phong cách GoFundMe): nền xám nhạt, thẻ trắng bo góc
 * có logo ảnh ở đầu, tiêu đề, nội dung căn trái và chân thư ngoài thẻ. `title`/`body` là HTML đã escape.
 * Font hệ thống (Segoe UI/Roboto/Helvetica) vì Gmail không tải web font; chữ "GÓP MẦM" nằm trong logo ảnh.
 */
function brandedEmailHtml(title: string, body: string): string {
  const home = escapeHtml(frontendBaseUrl());
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f4;-webkit-text-size-adjust:100%">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4">
      <tr>
        <td align="center" style="padding:32px 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px">
            <tr>
              <td align="center" style="padding:32px 32px 8px">
                <a href="${home}" style="text-decoration:none"><img src="cid:${EMAIL_LOGO_CID}" width="198" height="44" alt="Góp Mầm" style="display:block;border:0;width:198px;height:44px;font-family:${EMAIL_FONT};font-size:22px;font-weight:800;color:#151d36"></a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#232323;text-align:left">
                <h1 style="margin:0 0 20px;font-family:${EMAIL_FONT};font-size:24px;line-height:1.3;font-weight:700;color:#151d36">${title}</h1>
${body}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
            <tr>
              <td style="padding:20px 32px 0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:#6b7385;text-align:center">
                <p style="margin:0 0 6px">Bạn nhận được email này vì nó chứa thông tin quan trọng về tài khoản Góp Mầm của bạn.</p>
                <p style="margin:0">Có câu hỏi? <a href="${home}" style="color:#4a5268;text-decoration:underline">Liên hệ với chúng tôi</a> · <strong style="color:#4a5268">Góp Mầm</strong>, nền tảng gây quỹ cộng đồng minh bạch</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Nút hành động chính trong email: viên thuốc màu thương hiệu, căn trái. */
function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:999px;background:#e0402b"><a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;border-radius:999px;font-family:${EMAIL_FONT};font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none">${label}</a></td></tr></table>`;
}

export function renderPasswordResetEmail(message: PasswordResetEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = escapeHtml(message.resetUrl);

  return {
    subject: "Yêu cầu đặt lại mật khẩu Góp Mầm",
    text: [
      `Xin chào ${message.name},`,
      "",
      "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn.",
      `Để đặt lại mật khẩu, hãy mở liên kết sau (hết hạn sau ${message.expiresInMinutes} phút, chỉ dùng được một lần):`,
      message.resetUrl,
      "",
      "Nếu bạn không yêu cầu, đừng lo. Mật khẩu của bạn vẫn an toàn và bạn có thể bỏ qua email này.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: brandedEmailHtml(
      "Đặt lại mật khẩu",
      `                <p style="margin:0 0 16px">Xin chào ${name},</p>
                <p style="margin:0 0 16px">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn. Để chọn mật khẩu mới, bạn chỉ cần bấm nút bên dưới.</p>
                <div style="margin:28px 0">${emailButton(url, "Đặt lại mật khẩu")}</div>
                <p style="margin:0 0 24px;font-size:14px;color:#4a5268">Liên kết hết hạn sau ${message.expiresInMinutes} phút và chỉ dùng được một lần.</p>
                <p style="margin:0;padding-top:20px;border-top:1px solid #ececec">Nếu bạn không yêu cầu, đừng lo. Mật khẩu của bạn vẫn an toàn và bạn có thể bỏ qua email này.</p>
                <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#6b7385">Nút không bấm được? Dán đường dẫn này vào trình duyệt:<br><a href="${url}" style="color:#6b7385;word-break:break-all">${url}</a></p>`,
    ),
    attachments: [emailLogoAttachment()],
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

export function renderStepUpCodeEmail(message: StepUpCodeEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const action = escapeHtml(message.actionLabel);
  const code = escapeHtml(message.code);

  return {
    subject: `Mã xác minh Góp Mầm: ${message.code}`,
    text: [
      `Xin chào ${message.name},`,
      "",
      `Mã xác minh để ${message.actionLabel} là: ${message.code}`,
      `Mã hết hạn sau ${message.expiresInMinutes} phút và chỉ dùng được một lần.`,
      "",
      "Không chia sẻ mã này cho bất kỳ ai, kể cả người tự xưng là nhân viên Góp Mầm.",
      "Nếu không phải bạn yêu cầu, hãy đổi mật khẩu ngay.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141c33">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:bold">Mã xác minh</p>
          <p style="margin:0 0 12px;line-height:1.6">Xin chào ${name},</p>
          <p style="margin:0 0 16px;line-height:1.6">Mã xác minh để ${action} là:</p>
          <p style="margin:0 0 16px;font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
          <p style="margin:0 0 12px;line-height:1.6">Mã hết hạn sau ${message.expiresInMinutes} phút và chỉ dùng được một lần.</p>
          <p style="margin:0;line-height:1.6;font-size:14px;color:#4b5563">Không chia sẻ mã này cho bất kỳ ai. Nếu không phải bạn yêu cầu, hãy đổi mật khẩu ngay.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export function renderNotificationEmail(message: NotificationEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = message.link ? `${frontendBaseUrl()}${message.link}` : null;
  const label = escapeHtml(message.linkLabel ?? "Xem chi tiết");
  const paragraphs = message.paragraphs
    .map((p) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(p)}</p>`)
    .join("\n          ");

  return {
    subject: message.subject,
    text: [
      `Xin chào ${message.name},`,
      "",
      ...message.paragraphs,
      ...(url ? ["", url] : []),
      "",
      "Góp Mầm",
    ].join("\n"),
    html: `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141c33">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 16px;font-size:20px;font-weight:bold">${escapeHtml(message.subject)}</p>
          <p style="margin:0 0 12px;line-height:1.6">Xin chào ${name},</p>
          ${paragraphs}
          ${url ? `<p style="margin:12px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#16a34a;color:#ffffff;font-weight:bold;text-decoration:none">${label}</a></p>` : ""}
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

  async sendEmailVerification(message: EmailVerificationEmail): Promise<void> {
    if (!this.revealLinks) {
      this.logger.warn(`Chưa cấu hình SMTP: không gửi được email xác minh cho ${message.to}`);
      return;
    }

    this.logger.log(
      `[demo email] Xác minh email cho ${message.to}: ${message.verifyUrl} ` +
        `(hết hạn sau ${message.expiresInHours} giờ)`,
    );
  }

  async sendNotification(message: NotificationEmail): Promise<void> {
    this.logger.log(`[demo email] Thông báo "${message.subject}" cho ${message.to}`);
  }

  async sendStepUpCode(message: StepUpCodeEmail): Promise<void> {
    if (!this.revealLinks) {
      this.logger.warn(`Chưa cấu hình SMTP: không gửi được mã xác minh cho ${message.to}`);
      return;
    }

    this.logger.log(
      `[demo email] Mã xác minh để ${message.actionLabel} cho ${message.to}: ${message.code} ` +
        `(hết hạn sau ${message.expiresInMinutes} phút)`,
    );
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

  async sendEmailVerification(message: EmailVerificationEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      ...renderEmailVerificationEmail(message),
    });
  }

  async sendNotification(message: NotificationEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      ...renderNotificationEmail(message),
    });
  }

  async sendStepUpCode(message: StepUpCodeEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      ...renderStepUpCodeEmail(message),
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
