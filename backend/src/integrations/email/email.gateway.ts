import { randomUUID } from "node:crypto";

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

/**
 * Chi tiết khoản cam kết trừ tiền thất bại: email "Cần xử lý" theo bố cục email
 * "Please fix your payment method" của Kickstarter.
 */
export type ChargeFailedDetails = {
  campaignTitle: string;
  amount: number;
  /** Lý do cổng thanh toán trả về (`lastChargeError`); trống thì dùng câu mặc định. */
  reason?: string | null;
  /** Hạn chót cập nhật thanh toán, quá hạn thì cam kết bị hủy. */
  deadline: Date;
  graceDays: number;
  /** Đường dẫn tương đối tới trang cập nhật/thử lại thanh toán. */
  fixLink: string;
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
  /** Có thì dùng template "Cần xử lý" thay cho email thông báo chung. */
  chargeFailed?: ChargeFailedDetails;
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

const EMAIL_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const KS_TEXT = "#282828";
const KS_GREY = "#656969";
const KS_BORDER = "#dcdedd";
const KS_ALERT = "#e0402b";

/** Logo đính kèm inline (CID) cho mọi email (xem `layoutEmailHtml`). */
export function emailLogoAttachment(): EmailAttachment {
  return {
    filename: "gopmam-logo.png",
    content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
    contentType: "image/png",
    cid: EMAIL_LOGO_CID,
  };
}

function formatVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

/** "15:30 ngày 28/11/2026" (giờ Việt Nam), dùng cho hạn chót cần đọc rõ năm. */
function formatVietnamDeadline(date: Date): string {
  const tz = { timeZone: "Asia/Ho_Chi_Minh" } as const;
  return (
    `${date.toLocaleTimeString("vi-VN", { ...tz, hour: "2-digit", minute: "2-digit" })} ngày ` +
    date.toLocaleDateString("vi-VN", { ...tz, day: "2-digit", month: "2-digit", year: "numeric" })
  );
}

/** Liên kết gạch chân cùng màu chữ xung quanh (kiểu Kickstarter). `href`/`label` chưa escape. */
function emailLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" target="_blank" style="color:inherit;text-decoration:underline">${escapeHtml(label)}</a>`;
}

/** Khối hai cột phía dưới thẻ chính: nhãn đậm bên trái, các dòng (HTML đã escape) bên phải. */
type EmailSection = { label: string; rows: string[]; bullets?: boolean };

type EmailLayout = {
  /** Văn bản thuần (sẽ được escape). */
  title: string;
  /** Biểu tượng `!` đỏ + tiêu đề đỏ, cho email cần người nhận xử lý. */
  alert?: boolean;
  /** Các đoạn HTML đã escape, căn giữa dưới tiêu đề. */
  intro: string[];
  /** Hộp xám nổi bật (lý do lỗi, mã OTP, thời điểm...): `value` là HTML đã escape. */
  box?: { label: string; value: string; large?: boolean };
  /** Nút tối màu full-width; `href`/`label` chưa escape. */
  button?: { href: string; label: string };
  sections?: EmailSection[];
};

function sectionRows(section: EmailSection): string {
  const bullets = section.bullets ?? true;
  return section.rows
    .map((row, i) => {
      const pt = i === 0 ? 18 : 12;
      const cell = `font-family:${EMAIL_FONT};font-size:14px;line-height:21px;color:${KS_GREY};padding-top:${pt}px`;
      const dot = bullets ? `<td valign="top" style="width:18px;${cell}">&bull;</td>` : "";
      return `<tr>${dot}<td valign="top" style="${cell}">${row}</td></tr>`;
    })
    .join("\n                        ");
}

function sectionHtml(section: EmailSection): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid ${KS_BORDER};border-top:0">
            <tr>
              <td style="padding:12px 8.5% 30px">
                <table role="presentation" align="left" class="ks-col" width="37%" cellspacing="0" cellpadding="0" style="width:37%">
                  <tr><td style="padding-top:18px;font-family:${EMAIL_FONT};font-size:12px;line-height:18px;font-weight:700;color:${KS_TEXT}">${section.label}</td></tr>
                </table>
                <table role="presentation" align="left" class="ks-col" width="62%" cellspacing="0" cellpadding="0" style="width:62%">
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        ${sectionRows(section)}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
}

/**
 * Khung HTML chung của mọi email, theo bố cục email giao dịch của Kickstarter: logo trên nền
 * xám, thẻ trắng viền mảnh (tiêu đề + đoạn mở đầu căn giữa, hộp xám, nút tối màu), các khối
 * hai cột "nhãn đậm | nội dung xám" nối liền bên dưới, và chân thư gồm các liên kết gạch chân.
 * Font hệ thống vì Gmail không tải web font; trên điện thoại hai cột xếp chồng.
 */
function layoutEmailHtml(layout: EmailLayout): string {
  const base = frontendBaseUrl();
  const h = escapeHtml;
  const titleColor = layout.alert ? KS_ALERT : KS_TEXT;
  const icon = layout.alert
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 6px"><tr><td align="center" style="width:24px;height:24px;border-radius:12px;background:${KS_ALERT};color:#ffffff;font-family:${EMAIL_FONT};font-size:15px;font-weight:700;line-height:24px">!</td></tr></table>`
    : "";
  const intro = layout.intro
    .map((p) => `<p style="margin:0 0 12px">${p}</p>`)
    .join("\n                    ");
  const box = layout.box
    ? `<tr>
                    <td align="center" style="padding:12px;border:1px solid ${KS_BORDER};border-radius:3px;background:#efeff3">
                      <div style="font-family:${EMAIL_FONT};font-size:12px;line-height:18px;color:${KS_GREY}">${h(layout.box.label)}</div>
                      <div style="font-family:${EMAIL_FONT};${layout.box.large ? "font-size:32px;line-height:44px;font-weight:700;letter-spacing:8px" : "font-size:18px;line-height:30px"};color:${KS_TEXT}">${layout.box.value}</div>
                    </td>
                  </tr>`
    : "";
  const button = layout.button
    ? `<tr>
                    <td style="padding-top:12px">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="padding:12px;border-radius:3px;background:${KS_TEXT};font-family:${EMAIL_FONT};font-size:14px;line-height:21px"><a href="${h(layout.button.href)}" target="_blank" style="display:block;color:#ffffff;text-decoration:none">${h(layout.button.label)}</a></td>
                        </tr>
                      </table>
                    </td>
                  </tr>`
    : "";
  const footerLink = (path: string, label: string) =>
    `<a href="${h(`${base}${path}`)}" target="_blank" style="color:${KS_TEXT};text-decoration:underline">${label}</a>`;

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${h(layout.title)}</title>
    <style>
      @media all and (max-width: 539px) {
        .ks-col { width: 100% !important; }
        .ks-narrow { width: 86% !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f0f0f0;-webkit-text-size-adjust:100%;color:${KS_TEXT}">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f0f0">
      <tr>
        <td align="center" style="padding:54px 0 42px">
          <a href="${h(base)}" target="_blank" style="text-decoration:none"><img src="cid:${EMAIL_LOGO_CID}" width="198" height="44" alt="Góp Mầm" style="display:block;border:0;width:198px;height:44px;font-family:${EMAIL_FONT};font-size:22px;font-weight:800;color:#151d36"></a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:0 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
            <tr>
              <td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid ${KS_BORDER}">
            <tr>
              <td align="center" style="padding-top:30px">
                ${icon}
                <div style="font-family:${EMAIL_FONT};font-size:24px;line-height:30px;color:${titleColor}">${h(layout.title)}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0 30px">
                <table role="presentation" class="ks-narrow" width="66%" cellspacing="0" cellpadding="0" style="width:66%">
                  <tr>
                    <td align="center" style="padding-bottom:12px;font-family:${EMAIL_FONT};font-size:14px;line-height:21px;color:${KS_TEXT}">
                    ${intro}
                    </td>
                  </tr>
                  ${box}
                  ${button}
                </table>
              </td>
            </tr>
          </table>
          ${(layout.sections ?? []).map(sectionHtml).join("\n          ")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:48px 12px 72px;font-family:${EMAIL_FONT};font-size:12px;line-height:18px;color:${KS_TEXT}">
          <p style="margin:0 0 24px">${footerLink("/thong-bao", "Xem tất cả thông báo")}</p>
          <p style="margin:0 0 12px">Góp Mầm · Nền tảng gây quỹ cộng đồng minh bạch</p>
          <p style="margin:0 0 12px">${footerLink("/lien-he", "Liên hệ")}</p>
          <p style="margin:0">${footerLink("/chinh-sach-bao-mat", "Chính sách bảo mật")}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Khối "Cần hỗ trợ?" dùng chung ở cuối email. */
function helpSection(): EmailSection {
  return {
    label: "Cần hỗ trợ?",
    bullets: false,
    rows: [
      `${emailLink(`${frontendBaseUrl()}/lien-he`, "Liên hệ với chúng tôi")} nếu bạn có thắc mắc, và cảm ơn bạn đã đồng hành cùng Góp Mầm.`,
    ],
  };
}

export function renderEmailVerificationEmail(message: EmailVerificationEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = message.verifyUrl;

  return {
    subject: "Xác minh email tài khoản Góp Mầm",
    text: [
      `Xin chào ${message.name},`,
      "",
      "Cảm ơn bạn đã tạo tài khoản Góp Mầm. Mở liên kết sau để xác minh địa chỉ email",
      `(hết hạn sau ${message.expiresInHours} giờ, chỉ dùng được một lần):`,
      url,
      "",
      "Nếu bạn không tạo tài khoản, hãy bỏ qua email này.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: layoutEmailHtml({
      title: "Xác minh email của bạn",
      intro: [
        `Xin chào ${name},`,
        "Cảm ơn bạn đã tạo tài khoản Góp Mầm! Bấm nút bên dưới để xác nhận đây là địa chỉ email của bạn.",
      ],
      button: { href: url, label: "Xác minh email" },
      sections: [
        {
          label: "Lưu ý.",
          rows: [
            `Liên kết hết hạn sau ${message.expiresInHours} giờ và chỉ dùng được một lần.`,
            "Nếu bạn không tạo tài khoản, hãy bỏ qua email này.",
            `Nút không bấm được? Dán đường dẫn này vào trình duyệt: <span style="word-break:break-all">${emailLink(url, url)}</span>`,
          ],
        },
      ],
    }),
    attachments: [emailLogoAttachment()],
  };
}

export function renderPasswordResetEmail(message: PasswordResetEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const url = message.resetUrl;

  return {
    subject: "Yêu cầu đặt lại mật khẩu Góp Mầm",
    text: [
      `Xin chào ${message.name},`,
      "",
      "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn.",
      `Để đặt lại mật khẩu, hãy mở liên kết sau (hết hạn sau ${message.expiresInMinutes} phút, chỉ dùng được một lần):`,
      url,
      "",
      "Nếu bạn không yêu cầu, đừng lo. Mật khẩu của bạn vẫn an toàn và bạn có thể bỏ qua email này.",
      "",
      "Góp Mầm",
    ].join("\n"),
    html: layoutEmailHtml({
      title: "Đặt lại mật khẩu",
      intro: [
        `Xin chào ${name},`,
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Góp Mầm của bạn. Để chọn mật khẩu mới, bạn chỉ cần bấm nút bên dưới.",
      ],
      button: { href: url, label: "Đặt lại mật khẩu" },
      sections: [
        {
          label: "Lưu ý.",
          rows: [
            `Liên kết hết hạn sau ${message.expiresInMinutes} phút và chỉ dùng được một lần.`,
            `Nút không bấm được? Dán đường dẫn này vào trình duyệt: <span style="word-break:break-all">${emailLink(url, url)}</span>`,
          ],
        },
        {
          label: "Không phải bạn<br>yêu cầu?",
          bullets: false,
          rows: ["Đừng lo. Mật khẩu của bạn vẫn an toàn và bạn có thể bỏ qua email này."],
        },
      ],
    }),
    attachments: [emailLogoAttachment()],
  };
}

export function renderPasswordChangedEmail(message: PasswordChangedEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const when = formatVietnamTime(message.changedAt);
  const forgotUrl = `${frontendBaseUrl()}/quen-mat-khau`;

  return {
    subject: "Mật khẩu tài khoản Góp Mầm vừa được thay đổi",
    text: [
      `Xin chào ${message.name},`,
      "",
      `Mật khẩu tài khoản Góp Mầm của bạn vừa được thay đổi lúc ${when} (giờ Việt Nam).`,
      "Các thiết bị khác đang đăng nhập đã bị đăng xuất.",
      "",
      "Nếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay tại:",
      forgotUrl,
      "",
      "Góp Mầm",
    ].join("\n"),
    html: layoutEmailHtml({
      title: "Mật khẩu đã được thay đổi",
      intro: [
        `Xin chào ${name},`,
        "Mật khẩu tài khoản Góp Mầm của bạn vừa được thay đổi. Các thiết bị khác đang đăng nhập đã bị đăng xuất.",
      ],
      box: { label: "Thời điểm thay đổi (giờ Việt Nam):", value: escapeHtml(when) },
      sections: [
        {
          label: "Không phải bạn<br>thực hiện?",
          rows: [
            `${emailLink(forgotUrl, "Đặt lại mật khẩu ngay")} để lấy lại quyền kiểm soát tài khoản.`,
            "Nếu chính bạn đã đổi mật khẩu, bạn không cần làm gì thêm.",
          ],
        },
      ],
    }),
    attachments: [emailLogoAttachment()],
  };
}

export function renderStepUpCodeEmail(message: StepUpCodeEmail): RenderedEmail {
  const name = escapeHtml(message.name);
  const action = escapeHtml(message.actionLabel);

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
    html: layoutEmailHtml({
      title: "Mã xác minh",
      intro: [`Xin chào ${name},`, `Dùng mã dưới đây để ${action}.`],
      box: { label: `Mã hết hạn sau ${message.expiresInMinutes} phút`, value: escapeHtml(message.code), large: true },
      sections: [
        {
          label: "Giữ an toàn<br>tài khoản.",
          rows: [
            "Mã chỉ dùng được một lần.",
            "Không chia sẻ mã này cho bất kỳ ai, kể cả người tự xưng là nhân viên Góp Mầm.",
            "Nếu không phải bạn yêu cầu, hãy đổi mật khẩu ngay.",
          ],
        },
      ],
    }),
    attachments: [emailLogoAttachment()],
  };
}

/**
 * Email "Cần xử lý" khi trừ tiền khoản cam kết thất bại, theo email "Please fix your
 * payment method" của Kickstarter.
 */
export function renderChargeFailedEmail(message: NotificationEmail & { chargeFailed: ChargeFailedDetails }): RenderedEmail {
  const cf = message.chargeFailed;
  const base = frontendBaseUrl();
  const fixUrl = `${base}${cf.fixLink}`;
  const loginUrl = `${base}/dang-nhap`;
  const helpUrl = `${base}/lien-he`;
  const reason = cf.reason?.trim() || "Ngân hàng hoặc đơn vị phát hành thẻ đã từ chối giao dịch.";
  const amount = `${cf.amount.toLocaleString("vi-VN")} ₫`;
  const deadline = formatVietnamDeadline(cf.deadline);
  const title = cf.campaignTitle;
  const h = escapeHtml;
  const subject = `Vui lòng cập nhật phương thức thanh toán cho ${title}`;
  const bankTip =
    "Liên hệ ngân hàng của bạn để hỏi vì sao giao dịch bị từ chối. Cung cấp thông tin giao dịch như số tiền bạn đã cam kết và thời điểm Góp Mầm thử trừ tiền.";
  const loginTip = "vào Bảng điều khiển và bấm “Cập nhật thanh toán” ở khoản ủng hộ đang cần xử lý.";
  const dropNote =
    "Nếu đến hạn mà vẫn chưa trừ được tiền, khoản cam kết sẽ bị hủy và bạn sẽ không còn là người ủng hộ của dự án này. Bạn sẽ không bị trừ đồng nào.";

  return {
    subject,
    text: [
      "Cần xử lý",
      "",
      `Ôi không! Khoản cam kết ${amount} cho "${title}" đã bị từ chối khi trừ tiền, nhưng đừng lo! ` +
        `Bạn có đúng ${cf.graceDays} ngày (tính đến từng phút) để hoàn tất khoản ủng hộ, hạn chót là ${deadline} (giờ Việt Nam).`,
      "",
      "Lý do giao dịch thất bại:",
      reason,
      "",
      `Cập nhật hoặc thử lại phương thức thanh toán: ${fixUrl}`,
      "",
      "Cách hoàn tất khoản ủng hộ:",
      `• ${bankTip}`,
      `• Cập nhật hoặc thử lại phương thức thanh toán (${fixUrl}) trước khi hết ${cf.graceDays} ngày ân hạn.`,
      `• Đăng nhập tài khoản Góp Mầm (${loginUrl}), ${loginTip}`,
      "",
      "Sắp thành công rồi. Đừng bỏ lỡ.",
      dropNote,
      `Cần hỗ trợ? Liên hệ với chúng tôi (${helpUrl}), và cảm ơn bạn đã giúp những dự án ý nghĩa thành hiện thực.`,
      "",
      "Góp Mầm",
    ].join("\n"),
    html: layoutEmailHtml({
      title: "Cần xử lý",
      alert: true,
      intro: [
        `Ôi không! Khoản cam kết ${h(amount)} cho <b>${h(title)}</b> đã bị từ chối khi trừ tiền, nhưng đừng lo! ` +
          `Bạn có đúng ${cf.graceDays} ngày (tính đến từng phút) để hoàn tất khoản ủng hộ, hạn chót là <b>${h(deadline)}</b> (giờ Việt Nam).`,
      ],
      box: { label: "Lý do giao dịch thất bại:", value: h(reason) },
      button: { href: fixUrl, label: "Cập nhật hoặc thử lại phương thức thanh toán" },
      sections: [
        {
          label: "Cách hoàn tất<br>khoản ủng hộ.",
          rows: [
            h(bankTip),
            `${emailLink(fixUrl, "Cập nhật hoặc thử lại phương thức thanh toán")} trước khi hết ${cf.graceDays} ngày ân hạn.`,
            `${emailLink(loginUrl, "Đăng nhập tài khoản Góp Mầm")}, ${h(loginTip)}`,
          ],
        },
        {
          label: "Sắp thành công rồi.<br>Đừng bỏ lỡ.",
          bullets: false,
          rows: [
            h(dropNote),
            `Cần hỗ trợ? ${emailLink(helpUrl, "Liên hệ với chúng tôi")}, và cảm ơn bạn đã giúp những dự án ý nghĩa thành hiện thực.`,
          ],
        },
      ],
    }),
    attachments: [emailLogoAttachment()],
  };
}

/** Email kèm thông báo trong ứng dụng (lời mời cộng tác, kết quả xét duyệt, khoản ủng hộ...). */
export function renderNotificationEmail(message: NotificationEmail): RenderedEmail {
  if (message.chargeFailed) {
    return renderChargeFailedEmail({ ...message, chargeFailed: message.chargeFailed });
  }
  const name = escapeHtml(message.name);
  const url = message.link ? `${frontendBaseUrl()}${message.link}` : null;

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
    html: layoutEmailHtml({
      title: message.subject,
      intro: [`Xin chào ${name},`, ...message.paragraphs.map(escapeHtml)],
      button: url ? { href: url, label: message.linkLabel ?? "Xem chi tiết" } : undefined,
      sections: [helpSection()],
    }),
    attachments: [emailLogoAttachment()],
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

/** Che bớt địa chỉ email khi ghi log: "an***@gmail.com". */
function maskEmail(address: string): string {
  return address.replace(/^(.{1,2})[^@]*@/, "$1***@");
}

/** Gửi email thật qua SMTP (vd. Gmail + App Password, Resend). */
export class SmtpEmailGateway implements EmailGateway {
  private readonly logger = new Logger("EmailGateway");

  constructor(
    private readonly transporter: Pick<Transporter, "sendMail">,
    private readonly from: string,
  ) {}

  /**
   * Mỗi email kèm `X-Entity-Ref-ID` ngẫu nhiên: Gmail gom các thư cùng tiêu đề vào một cuộc
   * hội thoại và ẩn ("...") phần nội dung trùng với thư trước, nên email lặp lại (vd. mời lại
   * cùng một cộng tác viên) trông như không đến. Header này khiến Gmail hiển thị đầy đủ từng thư.
   * Ghi log khi gửi xong để đối chiếu được với hộp thư người nhận.
   */
  private async send(to: string, email: RenderedEmail): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      headers: { "X-Entity-Ref-ID": randomUUID() },
      ...email,
    });
    this.logger.log(`Đã gửi email "${email.subject}" tới ${maskEmail(to)} (${info?.messageId ?? "không có message-id"})`);
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    await this.send(message.to, renderPasswordResetEmail(message));
  }

  async sendPasswordChanged(message: PasswordChangedEmail): Promise<void> {
    await this.send(message.to, renderPasswordChangedEmail(message));
  }

  async sendEmailVerification(message: EmailVerificationEmail): Promise<void> {
    await this.send(message.to, renderEmailVerificationEmail(message));
  }

  async sendNotification(message: NotificationEmail): Promise<void> {
    await this.send(message.to, renderNotificationEmail(message));
  }

  async sendStepUpCode(message: StepUpCodeEmail): Promise<void> {
    await this.send(message.to, renderStepUpCodeEmail(message));
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
