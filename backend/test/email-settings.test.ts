import { deepEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { EMAIL_CATEGORY_KEYS } from "../src/integrations/email/email-categories";
import type { EmailGateway, NotificationEmail } from "../src/integrations/email/email.gateway";
import { PolicyEmailGateway } from "../src/integrations/email/policy-email.gateway";
import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import { emailCategoryOf } from "../src/modules/notifications/notifications.service";
import { EMAIL_SETTINGS_KEY, EmailSettingsService, parseEmailSettings } from "../src/modules/support/email-settings.service";
import { makeAuditRecorder } from "./helpers/audit";

const ADMIN = { id: "admin-1" } as never;

function recordingGateway() {
  const sent: string[] = [];
  const gateway: EmailGateway = {
    sendPasswordReset: async (m) => void sent.push(`reset:${m.to}`),
    sendPasswordChanged: async (m) => void sent.push(`changed:${m.to}`),
    sendEmailVerification: async (m) => void sent.push(`verify:${m.to}`),
    sendStepUpCode: async (m) => void sent.push(`otp:${m.to}`),
    sendNotification: async (m: NotificationEmail) => void sent.push(`notify:${m.category ?? "none"}:${m.to}`),
  };
  return { gateway, sent };
}

const notification = (category?: NotificationEmail["category"]): NotificationEmail => ({
  to: "a@x.vn",
  name: "A",
  subject: "S",
  paragraphs: ["p"],
  category,
});

describe("EmailSettingsService", () => {
  let rows: Map<string, { key: string; value: string; updatedBy?: string; updatedAt?: Date }>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: EmailSettingsService;

  beforeEach(() => {
    rows = new Map();
    audit = makeAuditRecorder();
    const repo = {
      findOne: async ({ where }: { where: { key: string } }) => rows.get(where.key) ?? null,
      save: async (row: { key: string; value: string; updatedBy?: string }) => {
        const saved = { ...row, updatedAt: new Date("2026-11-24T03:00:00Z") };
        rows.set(row.key, saved);
        return saved;
      },
    };
    service = new EmailSettingsService(repo as never, audit.service);
  });

  it("should send every category by default", async () => {
    const settings = await service.get();
    equal(settings.enabled, true);
    equal(settings.categories.length, EMAIL_CATEGORY_KEYS.length);
    equal(settings.categories.every((c) => c.enabled), true);
    equal(await service.isEnabled("pledge_settlement"), true);
  });

  it("should turn a single category off, keep the rest and audit the change", async () => {
    const saved = await service.update({ categories: { campaign_updates: false } }, ADMIN);
    equal(saved.categories.find((c) => c.key === "campaign_updates")?.enabled, false);
    equal(await service.isEnabled("campaign_updates"), false);
    equal(await service.isEnabled("password_reset"), true);
    equal(rows.get(EMAIL_SETTINGS_KEY)?.updatedBy, "admin-1");
    equal(audit.entries[0].action, "admin.email_settings.update");
  });

  it("should block every category when the master switch is off but remember per-category choices", async () => {
    await service.update({ categories: { comments: false } }, ADMIN);
    await service.update({ enabled: false }, ADMIN);
    equal(await service.isEnabled("step_up_code"), false);
    equal(await service.isEnabled("donation_receipt"), false);
    await service.update({ enabled: true }, ADMIN);
    equal(await service.isEnabled("donation_receipt"), true);
    equal(await service.isEnabled("comments"), false);
  });

  it("should reject unknown categories and non-boolean values", async () => {
    await rejects(service.update({ categories: { spam: false } }, ADMIN), /không hợp lệ/);
    await rejects(service.update({ categories: { comments: "no" as unknown as boolean } }, ADMIN), /true hoặc false/);
    equal(rows.size, 0);
  });

  it("should fall back to all-on for corrupted values and default new categories to on", () => {
    deepEqual(parseEmailSettings("{bad json").enabled, true);
    const parsed = parseEmailSettings(JSON.stringify({ enabled: true, categories: { comments: false } }));
    equal(parsed.categories.comments, false);
    equal(parsed.categories.refunds, true);
  });
});

describe("PolicyEmailGateway", () => {
  it("should skip disabled categories and forward enabled ones", async () => {
    const { gateway, sent } = recordingGateway();
    const off = new Set(["step_up_code", "pledge_settlement"]);
    const policy = new PolicyEmailGateway(gateway, { isEnabled: async (c) => !off.has(c) }, false);

    await policy.sendStepUpCode({ to: "a@x.vn", name: "A", code: "123456", actionLabel: "x", expiresInMinutes: 10 } as never);
    await policy.sendPasswordReset({ to: "a@x.vn", name: "A", resetUrl: "u", expiresInMinutes: 30 } as never);
    await policy.sendNotification(notification("pledge_settlement"));
    await policy.sendNotification(notification("refunds"));
    await policy.sendNotification(notification());

    deepEqual(sent, ["reset:a@x.vn", "notify:refunds:a@x.vn", "notify:none:a@x.vn"]);
  });

  it("should still send when the settings cannot be read", async () => {
    const { gateway, sent } = recordingGateway();
    const policy = new PolicyEmailGateway(gateway, { isEnabled: async () => Promise.reject(new Error("db down")) }, false);
    await policy.sendPasswordReset({ to: "a@x.vn", name: "A", resetUrl: "u", expiresInMinutes: 30 } as never);
    deepEqual(sent, ["reset:a@x.vn"]);
  });
});

describe("emailCategoryOf", () => {
  it("should map notification types and respect explicit categories", () => {
    equal(emailCategoryOf({ type: NotificationType.CAMPAIGN_APPROVED }), "campaign_owner");
    equal(emailCategoryOf({ type: NotificationType.DONATION_RECEIVED }), "donation_received");
    equal(emailCategoryOf({ type: NotificationType.REFUND_REJECTED }), "refunds");
    equal(emailCategoryOf({ type: NotificationType.SYSTEM }), "other");
    equal(emailCategoryOf({ type: NotificationType.CAMPAIGN_ENDED, emailCategory: "pledge_settlement" }), "pledge_settlement");
  });
});
