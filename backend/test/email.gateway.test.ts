import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEmailGateway,
  LogEmailGateway,
  readSmtpConfig,
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
  SmtpEmailGateway,
} from "../src/integrations/email/email.gateway";

const message = {
  to: "an@example.com",
  name: "An <script>alert(1)</script>",
  resetUrl: "https://gopmam.example/dat-lai-mat-khau?token=abc&x=1",
  expiresInMinutes: 30,
};

describe("readSmtpConfig", () => {
  it("returns null when SMTP_HOST is not set", () => {
    equal(readSmtpConfig({}), null);
    equal(readSmtpConfig({ SMTP_HOST: "  " }), null);
  });

  it("reads Gmail settings, strips spaces from the app password and defaults the sender", () => {
    deepEqual(
      readSmtpConfig({
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587",
        SMTP_USER: "gopmam@gmail.com",
        SMTP_PASS: "abcd efgh ijkl mnop",
      }),
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        user: "gopmam@gmail.com",
        pass: "abcdefghijklmnop",
        from: "gopmam@gmail.com",
      },
    );
  });

  it("uses implicit TLS on port 465 and honours MAIL_FROM", () => {
    const config = readSmtpConfig({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_USER: "gopmam@gmail.com",
      SMTP_PASS: "secret",
      MAIL_FROM: "Góp Mầm <gopmam@gmail.com>",
    });

    equal(config?.secure, true);
    equal(config?.from, "Góp Mầm <gopmam@gmail.com>");
  });

  it("rejects incomplete or invalid settings", () => {
    throws(() => readSmtpConfig({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@gmail.com" }));
    throws(() =>
      readSmtpConfig({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "abc", SMTP_USER: "a", SMTP_PASS: "b" }),
    );
  });
});

describe("createEmailGateway", () => {
  it("falls back to the log gateway without SMTP", () => {
    ok(createEmailGateway({ NODE_ENV: "test" }) instanceof LogEmailGateway);
  });
});

describe("renderPasswordResetEmail", () => {
  it("includes the link and expiry and escapes user input in HTML", () => {
    const email = renderPasswordResetEmail(message);

    ok(email.subject.length > 0);
    ok(email.text.includes(message.resetUrl));
    ok(email.text.includes("30 phút"));
    ok(email.html.includes("https://gopmam.example/dat-lai-mat-khau?token=abc&amp;x=1"));
    ok(!email.html.includes("<script>"));
    ok(email.html.includes("&lt;script&gt;"));
  });
});

describe("SmtpEmailGateway", () => {
  it("sends the rendered email from the configured sender", async () => {
    const sent: Record<string, unknown>[] = [];
    const gateway = new SmtpEmailGateway(
      { sendMail: async (mail: Record<string, unknown>) => sent.push(mail) } as never,
      "Góp Mầm <gopmam@gmail.com>",
    );

    await gateway.sendPasswordReset(message);

    equal(sent.length, 1);
    equal(sent[0].from, "Góp Mầm <gopmam@gmail.com>");
    equal(sent[0].to, "an@example.com");
    equal(sent[0].subject, renderPasswordResetEmail(message).subject);
    ok(String(sent[0].html).includes("Đặt lại mật khẩu"));
  });
});

describe("renderPasswordChangedEmail", () => {
  it("mentions the change time in Vietnam time and links to password recovery", () => {
    const email = renderPasswordChangedEmail({
      to: "an@example.com",
      name: "An <b>",
      changedAt: new Date("2026-09-28T17:30:00Z"),
    });

    ok(email.text.includes("00:30"));
    ok(email.text.includes("/quen-mat-khau"));
    ok(email.html.includes("An &lt;b&gt;"));
  });
});
