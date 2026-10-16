import { createHmac } from "node:crypto";
import { deepEqual, equal, match, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { DemoWalletGateway } from "../src/integrations/payment/payment.gateway";
import {
  generateTransferCode,
  parseSepayIpn,
  SepayGateway,
  sepayConfigFromEnv,
} from "../src/integrations/payment/sepay";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationsService } from "../src/modules/donations/donations.service";
import { type Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import type { User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const SECRET = "sandbox-secret";
const DONOR_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "44444444-4444-4444-4444-444444444444";
const DONATION_ID = "22222222-2222-2222-2222-222222222222";
const CAMPAIGN_ID = "33333333-3333-3333-3333-333333333333";

const gateway = () => new SepayGateway({ env: "sandbox", merchantId: "MC_TEST", secretKey: SECRET, ipnSecret: SECRET });

function ipnBody(overrides: { amount?: string; status?: string; type?: string; invoice?: string } = {}) {
  return {
    timestamp: 1760000000,
    notification_type: overrides.type ?? "ORDER_PAID",
    order: {
      id: "1",
      order_id: "SEPAY-68BA83CE637C1",
      order_status: overrides.status ?? "CAPTURED",
      order_currency: "VND",
      order_amount: overrides.amount ?? "200000.00",
      order_invoice_number: overrides.invoice ?? "GM7K2QX9AB",
    },
    transaction: { id: "9", transaction_id: "TXN123", transaction_status: "APPROVED" },
    customer: { id: "5", customer_id: null },
  };
}

function setup(options: { sepay?: SepayGateway | null; donation?: Partial<Donation> } = {}) {
  const donation: Partial<Donation> = {
    id: DONATION_ID,
    userId: DONOR_ID,
    campaignId: CAMPAIGN_ID,
    amount: 200000,
    status: DonationStatus.PENDING,
    paymentMethod: "sepay",
    transactionId: "DEMO-ABC12345",
    transferCode: "GM7K2QX9AB",
    ...options.donation,
  };
  const campaign = { id: CAMPAIGN_ID, title: "Thư viện cho em", ownerId: OWNER_ID, status: CampaignStatus.ACTIVE, endDate: new Date(Date.now() + 86400000) };
  const updates: Record<string, unknown>[] = [];
  const saved: Partial<Donation>[] = [];
  const donationRepo = {
    create: (d: Partial<Donation>) => d,
    save: async (d: Partial<Donation>) => {
      saved.push(d);
      return { id: DONATION_ID, ...d };
    },
    findOne: async (opts: { where: { id?: string; transferCode?: string; idempotencyKey?: string } }) => {
      if (opts.where.idempotencyKey) return null;
      if (opts.where.transferCode) return opts.where.transferCode === donation.transferCode ? donation : null;
      return opts.where.id === donation.id ? donation : null;
    },
  };
  const txManager = {
    update: async (_entity: unknown, _where: unknown, values: Record<string, unknown>) => {
      updates.push(values);
      return { affected: 1 };
    },
    increment: async () => undefined,
  };
  const dataSource = {
    transaction: async (fn: (manager: typeof txManager) => unknown) => fn(txManager),
    getRepository: () => ({ findOne: async () => null }),
  };
  const audit = makeAuditRecorder();
  const notifier = makeNotifierRecorder();
  const service = new DonationsService(
    donationRepo as never,
    { findOne: async () => campaign } as never,
    dataSource as never,
    new DemoWalletGateway("secret"),
    audit.service,
    notifier.service,
    options.sepay === undefined ? gateway() : options.sepay,
  );
  return { service, updates, saved, audit, notifier };
}

const donor = { id: DONOR_ID } as User;

describe("SePay gateway", () => {
  it("chỉ bật khi có merchant + secret; mặc định sandbox", () => {
    equal(sepayConfigFromEnv({}), null);
    equal(sepayConfigFromEnv({ SEPAY_MERCHANT_ID: "MC" }), null);
    deepEqual(sepayConfigFromEnv({ SEPAY_MERCHANT_ID: "MC", SEPAY_SECRET_KEY: "s" }), {
      env: "sandbox",
      merchantId: "MC",
      secretKey: "s",
      ipnSecret: "s",
    });
    equal(sepayConfigFromEnv({ SEPAY_MERCHANT_ID: "MC", SEPAY_SECRET_KEY: "s", SEPAY_ENV: "production" })?.env, "production");
  });

  it("form thanh toán có chữ ký HMAC-SHA256 đúng theo các trường đã ký", () => {
    const form = gateway().buildCheckout({
      invoiceNumber: "GM7K2QX9AB",
      amount: 200000,
      description: "Ung ho Gop Mam GM7K2QX9AB",
      successUrl: "https://gopmam.com/ok",
      errorUrl: "https://gopmam.com/err",
      cancelUrl: "https://gopmam.com/cancel",
    });
    equal(form.action, "https://pay-sandbox.sepay.vn/v1/checkout/init");
    equal(form.fields.merchant, "MC_TEST");
    equal(form.fields.order_amount, "200000");
    const signed = Object.keys(form.fields)
      .filter((key) => key !== "signature")
      .map((key) => `${key}=${form.fields[key]}`)
      .join(",");
    equal(form.fields.signature, createHmac("sha256", SECRET).update(signed).digest("base64"));
  });

  it("so khớp X-Secret-Key", () => {
    ok(gateway().verifyIpnSecret(SECRET));
    ok(!gateway().verifyIpnSecret("wrong"));
    ok(!gateway().verifyIpnSecret(undefined));
  });

  it("đọc IPN, bỏ qua payload thiếu trường", () => {
    const ipn = parseSepayIpn(ipnBody());
    equal(ipn?.invoiceNumber, "GM7K2QX9AB");
    equal(ipn?.amount, 200000);
    equal(ipn?.transactionId, "TXN123");
    equal(parseSepayIpn({ order: { order_amount: "1" } }), null);
    equal(parseSepayIpn("x"), null);
  });

  it("mã đơn GM + 8 ký tự không dễ nhầm", () => {
    match(generateTransferCode(), /^GM[2-9A-HJKMNP-Z]{8}$/);
  });
});

describe("DonationsService – SePay", () => {
  it("đơn mới có mã đơn riêng; chặn chọn SePay khi chưa cấu hình", async () => {
    const { service, saved } = setup();
    await service.create({ campaignId: CAMPAIGN_ID, amount: 200000, paymentMethod: "sepay", idempotencyKey: "k-1" }, donor);
    match(saved[0]?.transferCode ?? "", /^GM/);
    await rejects(
      setup({ sepay: null }).service.create({ campaignId: CAMPAIGN_ID, amount: 200000, paymentMethod: "sepay", idempotencyKey: "k-2" }, donor),
      (err: { status?: number }) => err.status === 400,
    );
  });

  it("paymentOptions không lộ thông tin merchant", () => {
    deepEqual(setup().service.paymentOptions(), { sepay: { env: "sandbox" }, demoWallet: true });
    deepEqual(setup({ sepay: null }).service.paymentOptions(), { sepay: null, demoWallet: true });
  });

  it("checkout dùng mã đơn làm order_invoice_number, chỉ cho chủ đơn đang chờ", async () => {
    const form = await setup().service.createSepayCheckout(DONATION_ID, donor);
    equal(form.fields.order_invoice_number, "GM7K2QX9AB");
    ok(form.fields.success_url.includes(`donation=${DONATION_ID}&payment=success`));
    await rejects(setup().service.createSepayCheckout(DONATION_ID, { id: OWNER_ID } as User), (err: { status?: number }) => err.status === 404);
    await rejects(
      setup({ donation: { status: DonationStatus.COMPLETED } }).service.createSepayCheckout(DONATION_ID, donor),
      (err: { status?: number }) => err.status === 409,
    );
  });

  it("SePay production tắt hẳn ví demo (không tạo, không tự xác nhận được)", async () => {
    const live = new SepayGateway({ env: "production", merchantId: "MC", secretKey: SECRET, ipnSecret: SECRET });
    const { service } = setup({ sepay: live, donation: { paymentMethod: "wallet" } });
    deepEqual(service.paymentOptions(), { sepay: { env: "production" }, demoWallet: false });
    await rejects(
      service.create({ campaignId: CAMPAIGN_ID, amount: 200000, paymentMethod: "wallet", idempotencyKey: "k-3" }, donor),
      (err: { status?: number }) => err.status === 400,
    );
    await rejects(service.confirmDemoPayment(DONATION_ID, "completed", donor), (err: { status?: number }) => err.status === 403);
  });

  it("không cho người ủng hộ tự xác nhận đơn SePay", async () => {
    await rejects(setup().service.confirmDemoPayment(DONATION_ID, "completed", donor), (err: { status?: number }) => err.status === 403);
  });

  it("IPN sai secret bị từ chối và ghi audit", async () => {
    const { service, audit, updates } = setup();
    await rejects(service.handleSepayIpn(ipnBody(), "wrong"), (err: { status?: number }) => err.status === 401);
    equal(updates.length, 0);
    ok(audit.entries.some((r) => r.action === "donation.sepay.rejected"));
  });

  it("IPN hợp lệ ghi nhận thanh toán và gửi email cho người ủng hộ + chủ dự án", async () => {
    const { service, updates, notifier } = setup();
    deepEqual(await service.handleSepayIpn(ipnBody(), SECRET), { success: true, applied: true });
    equal(updates[0]?.status, DonationStatus.COMPLETED);
    equal(updates[0]?.transactionId, "SEPAY-TXN123");
    const toDonor = notifier.notified.find((n) => n.userId === DONOR_ID);
    equal(toDonor?.email, true);
    equal(toDonor?.link, `/bien-nhan/${DONATION_ID}`);
    equal(notifier.notified.find((n) => n.userId === OWNER_ID)?.email, true);
  });

  it("IPN sai số tiền hoặc chưa CAPTURED chỉ ghi audit, không cộng tiền", async () => {
    const mismatch = setup();
    deepEqual(await mismatch.service.handleSepayIpn(ipnBody({ amount: "10000" }), SECRET), { success: true, applied: false });
    equal(mismatch.updates.length, 0);
    ok(mismatch.audit.entries.some((r) => r.action === "donation.sepay.amount-mismatch"));

    const voided = setup();
    await voided.service.handleSepayIpn(ipnBody({ type: "TRANSACTION_VOID", status: "CANCELLED" }), SECRET);
    equal(voided.updates.length, 0);
  });

  it("IPN không khớp đơn nào vẫn trả 200 để SePay không gửi lại", async () => {
    const { service, audit } = setup();
    deepEqual(await service.handleSepayIpn(ipnBody({ invoice: "GMZZZZZZZZ" }), SECRET), { success: true, applied: false });
    ok(audit.entries.some((r) => r.action === "donation.sepay.unmatched"));
  });
});
