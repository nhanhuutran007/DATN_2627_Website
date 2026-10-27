import { equal, match, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import { DemoWalletGateway } from "../src/integrations/payment/payment.gateway";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationsService } from "../src/modules/donations/donations.service";
import { DonationStatus, RefundMethod } from "../src/modules/donations/entities/donation.entity";
import { csvCell, toCsv } from "../src/modules/finance/csv";
import { RefundRequestStatus } from "../src/modules/finance/entities/refund-request.entity";
import {
  FinanceService,
  needsManualRefund,
  pseudonym,
  REFUND_WINDOW_DAYS,
  resolveRange,
} from "../src/modules/finance/finance.service";
import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const DAY = 86_400_000;
const DONOR = { id: "22222222-2222-4222-8222-222222222222", role: UserRole.USER, name: "Donor" } as any;
const OTHER = { id: "33333333-3333-4333-8333-333333333333", role: UserRole.USER } as any;
const ADMIN = { id: "99999999-9999-4999-8999-999999999999", role: UserRole.ADMIN } as any;
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const DONATION_ID = "55555555-5555-4555-8555-555555555555";

describe("csv", () => {
  it("bọc ngoặc kép, nhân đôi dấu ngoặc và chặn formula injection", () => {
    equal(csvCell('a "b"'), '"a ""b"""');
    equal(csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
    equal(csvCell("+1"), `"'+1"`);
    equal(csvCell("-5"), `"'-5"`);
    equal(csvCell("@cmd"), `"'@cmd"`);
    equal(csvCell(null), "");
    equal(csvCell(1500000), '"1500000"');
  });

  it("có BOM UTF-8 và dòng CRLF", () => {
    const csv = toCsv(["a", "b"], [["Tiếng Việt", 1]]);
    ok(csv.startsWith("﻿"));
    ok(csv.includes('"a","b"\r\n"Tiếng Việt","1"\r\n'));
  });

  it("mã giả danh ổn định, không chứa id gốc", () => {
    equal(pseudonym(DONOR.id), pseudonym(DONOR.id));
    ok(!pseudonym(DONOR.id).includes(DONOR.id.slice(0, 8)));
    match(pseudonym(DONOR.id), /^NUH-[0-9A-F]{10}$/);
  });

  it("khoảng ngày bao trọn ngày cuối; mặc định 30 ngày", () => {
    const r = resolveRange({ from: "2026-10-01", to: "2026-10-01" });
    equal(r.from.toISOString(), "2026-10-01T00:00:00.000Z");
    equal(r.to.toISOString(), "2026-10-01T23:59:59.999Z");
    const now = new Date("2026-10-31T00:00:00Z");
    equal(Math.round((now.getTime() - resolveRange({}, now).from.getTime()) / DAY), 30);
  });
});

describe("FinanceService — hoàn tiền", () => {
  let donation: any;
  let campaign: any;
  let requests: any[];
  let campaignUpdates: number;
  let tierUpdates: number;
  let claimAffected: number;
  let gatewayOk: boolean;
  let grossRaised: number;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: FinanceService;

  beforeEach(() => {
    donation = {
      id: DONATION_ID, userId: DONOR.id, campaignId: "c1", amount: "300000.00", status: DonationStatus.COMPLETED,
      transactionId: "DEMO-1", completedAt: new Date(Date.now() - 2 * DAY), rewardTierId: "tier-1", currency: "VND",
    };
    campaign = { id: "c1", title: "Thư viện", ownerId: OWNER_ID, status: CampaignStatus.ACTIVE, currentAmount: 300000, goalAmount: 1000000, backerCount: 1 };
    requests = [];
    campaignUpdates = 0;
    tierUpdates = 0;
    claimAffected = 1;
    gatewayOk = true;
    grossRaised = 300000;
    audit = makeAuditRecorder();
    notifier = makeNotifierRecorder();
    const refundRepo: any = {
      findOne: async ({ where }: any) => requests.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
      create: (dto: any) => ({ ...dto }),
      save: async (r: any) => {
        if (!r.id) {
          r.id = `r-${requests.length + 1}`;
          requests.push(r);
        }
        return r;
      },
    };
    const donationRepo: any = { findOne: async () => donation, sum: async () => grossRaised };
    const campaignRepo: any = { findOne: async () => campaign };
    const qb: any = {
      update: (entity: any) => {
        if (entity.name === "Campaign") campaignUpdates++;
        if (entity.name === "RewardTier") tierUpdates++;
        return qb;
      },
      set: () => qb, where: () => qb, andWhere: () => qb, setParameter: () => qb,
      execute: async () => ({ affected: 1 }),
    };
    const manager: any = {
      update: async (_e: any, where: any, patch: any) => {
        if (where.status === DonationStatus.COMPLETED) {
          if (!claimAffected) return { affected: 0 };
          Object.assign(donation, patch);
        }
        return { affected: 1 };
      },
      createQueryBuilder: () => qb,
    };
    const dataSource: any = {
      transaction: async (fn: any) => {
        const snapshot = { ...donation };
        try {
          return await fn(manager);
        } catch (error) {
          Object.assign(donation, snapshot); // rollback
          throw error;
        }
      },
    };
    const gateway: any = {
      refundTransaction: async () => (gatewayOk ? { success: true, refundId: "DEMO-RF-1" } : { success: false, refundId: "" }),
    };
    const mediaRepo: any = {
      findOne: async ({ where }: any) =>
        ({
          "proof-1": { id: "proof-1", purpose: "refund_proof", ownerId: ADMIN.id, storageKey: "refunds/p.png" },
          "proof-other": { id: "proof-other", purpose: "refund_proof", ownerId: OTHER.id, storageKey: "refunds/o.png" },
          "avatar-1": { id: "avatar-1", purpose: "avatar", ownerId: ADMIN.id, storageKey: "avatars/a.png" },
        })[where.id as string] ?? null,
    };
    service = new FinanceService(
      refundRepo, donationRepo, campaignRepo, dataSource, gateway, audit.service, notifier.service, mediaRepo,
    );
  });

  it("yêu cầu hoàn trong thời hạn khi chiến dịch đang gây quỹ", async () => {
    const r = await service.requestRefund(DONATION_ID, { reason: "Tôi chuyển nhầm số tiền." }, DONOR);
    equal(r.status, RefundRequestStatus.PENDING);
    equal(audit.entries.at(-1)?.action, "refund.request");
  });

  it("khoản qua SePay bắt buộc tài khoản nhận hoàn; audit chỉ lưu 4 số cuối", async () => {
    donation.paymentMethod = "sepay";
    await rejects(service.requestRefund(DONATION_ID, { reason: "Tôi chuyển nhầm số tiền." }, DONOR), BadRequestException);
    const r = await service.requestRefund(
      DONATION_ID,
      { reason: "Tôi chuyển nhầm số tiền.", bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" },
      DONOR,
    );
    equal(r.bankAccountNumber, "0123456789");
    equal(r.bankAccountName, "NGUYEN VAN A");
    const logged = JSON.stringify(audit.entries.at(-1));
    ok(logged.includes("***6789"));
    ok(!logged.includes("0123456789"));
  });

  it("ví demo không cần tài khoản; khai thiếu một phần thì từ chối", async () => {
    ok(!needsManualRefund("wallet"));
    ok(needsManualRefund("sepay"));
    await rejects(
      service.requestRefund(DONATION_ID, { reason: "Tôi chuyển nhầm số tiền.", bankName: "Vietcombank" }, DONOR),
      BadRequestException,
    );
    const r = await service.requestRefund(DONATION_ID, { reason: "Tôi chuyển nhầm số tiền." }, DONOR);
    equal(r.bankAccountNumber, null);
  });

  it(`quá ${REFUND_WINDOW_DAYS} ngày khi chiến dịch còn chạy → từ chối; chiến dịch thất bại → được`, async () => {
    donation.completedAt = new Date(Date.now() - (REFUND_WINDOW_DAYS + 1) * DAY);
    await rejects(service.requestRefund(DONATION_ID, { reason: "Muốn rút lại khoản ủng hộ." }, DONOR), ConflictException);
    campaign.status = CampaignStatus.FAILED;
    const r = await service.requestRefund(DONATION_ID, { reason: "Chiến dịch không đạt mục tiêu." }, DONOR);
    equal(r.status, RefundRequestStatus.PENDING);
  });

  it("chiến dịch đã đóng sau khi không đạt mục tiêu → vẫn yêu cầu hoàn được; đã đạt mục tiêu → không", async () => {
    donation.completedAt = new Date(Date.now() - (REFUND_WINDOW_DAYS + 30) * DAY);
    campaign.status = CampaignStatus.ENDED;
    const r = await service.requestRefund(DONATION_ID, { reason: "Chiến dịch đã đóng, không đạt mục tiêu." }, DONOR);
    equal(r.status, RefundRequestStatus.PENDING);
    requests.length = 0;
    // Tổng gộp tính cả khoản đã hoàn: chiến dịch từng đạt mục tiêu thì hoàn bớt cũng không đổi kết quả
    grossRaised = 1000000;
    await rejects(service.requestRefund(DONATION_ID, { reason: "Muốn rút lại khoản ủng hộ." }, DONOR), ConflictException);
  });

  it("không yêu cầu được khoản của người khác, khoản chưa xác nhận hoặc trùng yêu cầu", async () => {
    await rejects(service.requestRefund(DONATION_ID, { reason: "Không phải khoản của tôi." }, OTHER), NotFoundException);
    await service.requestRefund(DONATION_ID, { reason: "Yêu cầu lần một hợp lệ." }, DONOR);
    await rejects(service.requestRefund(DONATION_ID, { reason: "Yêu cầu lần hai bị trùng." }, DONOR), ConflictException);
    donation.status = DonationStatus.PENDING;
    await rejects(service.requestRefund(DONATION_ID, { reason: "Khoản chưa xác nhận." }, DONOR), ConflictException);
  });

  it("duyệt → hoàn tiền, trừ số liệu chiến dịch, trả suất quà, audit, báo 2 bên", async () => {
    const req = await service.requestRefund(DONATION_ID, { reason: "Tôi chuyển nhầm số tiền." }, DONOR);
    const approved = await service.approve(req.id, "Xác minh chuyển nhầm", ADMIN);
    equal(approved.status, RefundRequestStatus.APPROVED);
    equal(donation.status, DonationStatus.REFUNDED);
    ok(donation.refundedAt);
    equal(campaignUpdates, 1);
    equal(tierUpdates, 1);
    ok(audit.entries.some((e) => e.action === "donation.refund" && (e.newValues as any).refundReference === "DEMO-RF-1"));
    ok(notifier.notified.some((n) => n.userId === DONOR.id && n.type === NotificationType.REFUND_APPROVED));
    ok(notifier.notified.some((n) => n.userId === OWNER_ID && n.type === NotificationType.DONATION_REFUNDED));
    await rejects(service.approve(req.id, "Duyệt lại lần nữa", ADMIN), ConflictException);
  });

  it("từ chối → báo người ủng hộ kèm lý do, không hoàn tiền", async () => {
    const req = await service.requestRefund(DONATION_ID, { reason: "Tôi đổi ý không ủng hộ." }, DONOR);
    const rejected = await service.reject(req.id, "Quá thời hạn đổi ý", ADMIN);
    equal(rejected.status, RefundRequestStatus.REJECTED);
    equal(donation.status, DonationStatus.COMPLETED);
    ok(notifier.notified.some((n) => n.type === NotificationType.REFUND_REJECTED && n.message.includes("Quá thời hạn")));
  });

  it("không hoàn 2 lần (đua yêu cầu)", async () => {
    claimAffected = 0;
    await rejects(service.refundDonation(DONATION_ID, "Hoàn trùng", ADMIN), ConflictException);
    equal(campaignUpdates, 0);
  });

  it("cổng thanh toán lỗi → rollback, giữ nguyên trạng thái", async () => {
    gatewayOk = false;
    await rejects(service.refundDonation(DONATION_ID, "Thử hoàn khi cổng lỗi", ADMIN), BadGatewayException);
    equal(donation.status, DonationStatus.COMPLETED);
    equal(campaignUpdates, 0);
  });

  it("khoản SePay: bắt buộc mã chuyển khoản, không gọi cổng, lưu mã thật + chứng từ", async () => {
    donation.paymentMethod = "sepay";
    gatewayOk = false; // cổng không được gọi — nếu gọi sẽ lỗi BadGateway
    await rejects(service.refundDonation(DONATION_ID, "Hoàn chuyển nhầm", ADMIN), BadRequestException);
    await rejects(
      service.refundDonation(DONATION_ID, "Hoàn chuyển nhầm", ADMIN, {
        manual: { transferReference: "FT2629301234", proofMediaId: "avatar-1" },
      }),
      BadRequestException,
    );
    await rejects(
      service.refundDonation(DONATION_ID, "Hoàn chuyển nhầm", ADMIN, {
        manual: { transferReference: "FT2629301234", proofMediaId: "proof-other" },
      }),
      ForbiddenException,
    );
    equal(donation.status, DonationStatus.COMPLETED);
    const refunded = await service.refundDonation(DONATION_ID, "Hoàn chuyển nhầm", ADMIN, {
      manual: { transferReference: "FT2629301234", proofMediaId: "proof-1" },
    });
    equal(refunded.refundReference, "FT2629301234");
    equal(refunded.refundMethod, RefundMethod.MANUAL_TRANSFER);
    equal(refunded.refundProofUrl, "/api/v1/media/refunds/p.png");
    equal(campaignUpdates, 1);
    ok(notifier.notified.some((n) => n.userId === DONOR.id && n.message.includes("FT2629301234")));
  });

  it("ví demo vẫn hoàn qua cổng và đánh dấu gateway", async () => {
    const refunded = await service.refundDonation(DONATION_ID, "Hoàn qua ví demo", ADMIN);
    equal(refunded.refundReference, "DEMO-RF-1");
    equal(refunded.refundMethod, RefundMethod.GATEWAY);
  });

  it("khoản đã hoàn không hoàn lại được", async () => {
    donation.status = DonationStatus.REFUNDED;
    await rejects(service.refundDonation(DONATION_ID, "Hoàn lại lần nữa", ADMIN), ConflictException);
  });
});

describe("FinanceService — xuất danh sách hoàn tiền", () => {
  it("CSV có tài khoản nhận hoàn, đánh dấu khoản cần chuyển khoản tay, lọc trạng thái và ghi audit", async () => {
    let where: any;
    const refundRepo: any = {
      find: async (options: any) => {
        where = options.where;
        return [
          {
            id: "r-1", createdAt: new Date("2026-10-20T03:00:00Z"), status: RefundRequestStatus.PENDING, donationId: DONATION_ID,
            reason: "Chuyển nhầm", bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A",
            user: { name: "Donor", email: "donor@example.com" },
            donation: { amount: "300000.00", paymentMethod: "sepay", transferCode: "GM7K2QX9AB", campaign: { title: "Thư viện" } },
          },
        ];
      },
    };
    const audit = makeAuditRecorder();
    const service = new FinanceService(
      refundRepo, {} as any, {} as any, {} as any, {} as any, audit.service, {} as any, {} as any,
    );
    const file = await service.exportRefundsCsv({ status: RefundRequestStatus.PENDING }, ADMIN, new Date("2026-10-20T05:00:00Z"));
    equal(where.status, RefundRequestStatus.PENDING);
    equal(file.rows, 1);
    equal(file.filename, "hoan-tien_pending_2026-10-20.csv");
    ok(file.content.includes('"0123456789"'));
    ok(file.content.includes('"GM7K2QX9AB"'));
    ok(file.content.includes('"sepay","co","300000"'));
    equal(audit.entries.at(-1)?.action, "finance.export_refunds");
  });
});

describe("FinanceService — đối soát", () => {
  it("cộng giao dịch theo chiến dịch và phát hiện số liệu lệch sổ", async () => {
    const t = new Date("2026-10-01T10:00:00Z");
    const donations = [
      { campaignId: "c1", amount: "100000", status: DonationStatus.COMPLETED, completedAt: t },
      { campaignId: "c1", amount: "50000", status: DonationStatus.REFUNDED, completedAt: t, refundedAt: t },
      { campaignId: "c2", amount: "70000", status: DonationStatus.COMPLETED, completedAt: t },
    ];
    let call = 0;
    const donationRepo: any = {
      find: async () => (call++ === 0 ? donations : donations.filter((d) => d.status === DonationStatus.REFUNDED)),
      createQueryBuilder: () => {
        const qb: any = {
          select: () => qb, addSelect: () => qb, where: () => qb, andWhere: () => qb, groupBy: () => qb,
          getRawMany: async () => [
            { campaignId: "c1", total: "100000", backers: "1" },
            { campaignId: "c2", total: "70000", backers: "1" },
          ],
        };
        return qb;
      },
    };
    const campaignRepo: any = {
      find: async () => [
        { id: "c1", title: "Khớp", currentAmount: "100000.00", backerCount: 1 },
        { id: "c2", title: "Lệch", currentAmount: "90000.00", backerCount: 2 },
      ],
    };
    const service = new FinanceService({} as any, donationRepo, campaignRepo, {} as any, {} as any, makeAuditRecorder().service, makeNotifierRecorder().service, {} as any);
    const report = await service.reconcile({ from: "2026-10-01", to: "2026-10-01" });
    equal(report.totals.completedAmount, 220000);
    equal(report.totals.refundedAmount, 50000);
    equal(report.totals.netAmount, 170000);
    equal(report.mismatches, 1);
    equal(report.campaigns.find((c) => c.campaignId === "c2")?.mismatch, true);
    equal(report.campaigns.find((c) => c.campaignId === "c1")?.mismatch, false);
  });
});

describe("DonationsService — biên nhận & quyền xem", () => {
  function makeService(donation: any) {
    const donationRepo: any = { findOne: async () => donation };
    return new DonationsService(donationRepo, {} as any, {} as any, new DemoWalletGateway(), makeAuditRecorder().service, makeNotifierRecorder().service);
  }
  const base = {
    id: DONATION_ID, userId: DONOR.id, campaignId: "c1", amount: "300000.00", currency: "VND",
    status: DonationStatus.COMPLETED, completedAt: new Date("2026-10-01T03:00:00Z"), createdAt: new Date(),
    isAnonymous: false, user: { name: "Donor" }, campaign: { title: "Thư viện" }, rewardTier: { title: "Sổ tay" },
  };

  it("người khác không xem được khoản ủng hộ (404, chống IDOR); admin xem được", async () => {
    const service = makeService(base);
    await rejects(service.findForUser(DONATION_ID, OTHER), NotFoundException);
    equal((await service.findForUser(DONATION_ID, ADMIN)).id, DONATION_ID);
  });

  it("biên nhận có số biên nhận, phần quà; khoản đã hoàn có thông tin hoàn", async () => {
    const receipt = await makeService(base).getReceipt(DONATION_ID, DONOR);
    equal(receipt.receiptNumber, "GM-20261001-55555555");
    equal(receipt.amount, 300000);
    equal(receipt.rewardTitle, "Sổ tay");
    equal(receipt.refund, null);
    const refunded = await makeService({ ...base, status: DonationStatus.REFUNDED, refundReference: "DEMO-RF-1" }).getReceipt(DONATION_ID, DONOR);
    equal(refunded.refund?.reference, "DEMO-RF-1");
  });

  it("chưa xác nhận thì không có biên nhận", async () => {
    await rejects(makeService({ ...base, status: DonationStatus.PENDING }).getReceipt(DONATION_ID, DONOR), ConflictException);
  });
});
