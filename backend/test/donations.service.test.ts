import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  DemoWalletGateway,
  signWebhookPayload,
} from "../src/integrations/payment/payment.gateway";
import { DonationsService } from "../src/modules/donations/donations.service";
import {
  Donation,
  DonationStatus,
} from "../src/modules/donations/entities/donation.entity";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";

const WEBHOOK_SECRET = "test-webhook-secret";

function makeUser(id = "11111111-1111-1111-1111-111111111111") {
  return {
    id,
    name: "Test User",
    email: "test@example.com",
    passwordHash: "hash",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    campaigns: [],
    donations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockRepos() {
  const mockDonation: Partial<Donation> = {
    id: "22222222-2222-2222-2222-222222222222",
    userId: "11111111-1111-1111-1111-111111111111",
    campaignId: "33333333-3333-3333-3333-333333333333",
    amount: 500000,
    currency: "VND",
    status: DonationStatus.PENDING,
    paymentMethod: "wallet",
    transactionId: "DEMO-ABC12345",
    idempotencyKey: "key-123",
    message: "Chúc may mắn",
    isAnonymous: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCampaign = {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Test Campaign",
    description: "A campaign",
    category: "Giáo dục",
    ownerId: "11111111-1111-1111-1111-111111111111",
    goalAmount: 50000000,
    currentAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    status: CampaignStatus.ACTIVE,
    backerCount: 0,
    viewCount: 0,
    donations: [],
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const donationRepo: any = {
    create: (dto: any) => ({ ...mockDonation, ...dto }),
    save: async (d: any) => ({ ...mockDonation, ...d }),
    findOne: async (opts: any) => {
      if (opts?.where?.idempotencyKey) {
        return opts.where.idempotencyKey === "existing-key" ? mockDonation : null;
      }
      if (opts?.where?.id === "missing") return null;
      if (opts?.where?.id) return { ...mockDonation, id: opts.where.id };
      return mockDonation;
    },
    find: async () => [mockDonation],
  };

  const campaignRepo: any = {
    findOne: async (opts: any) => {
      if (opts?.where?.id === "missing") return null;
      return mockCampaign;
    },
    increment: async () => undefined,
  };

  // Expose để test override `update`/`findOne`, mô phỏng donation đã bị một
  // lời gọi khác xử lý trước (race condition).
  const txManager: any = {
    save: async (d: any) => d,
    increment: async () => undefined,
    update: async () => ({ affected: 1 }),
    findOne: async () => mockDonation,
  };
  const mockTransaction = async (fn: any) => fn(txManager);

  return { donationRepo, campaignRepo, mockDonation, mockCampaign, mockTransaction, txManager };
}

describe("DonationsService", () => {
  let service: DonationsService;
  let repos: ReturnType<typeof createMockRepos>;
  let gateway: DemoWalletGateway;
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    repos = createMockRepos();
    gateway = new DemoWalletGateway(WEBHOOK_SECRET);
    audit = makeAuditRecorder();
    service = new DonationsService(
      repos.donationRepo,
      repos.campaignRepo,
      { transaction: repos.mockTransaction } as any,
      gateway,
      audit.service,
    );
  });

  describe("create", () => {
    it("should create a pending donation with idempotency key", async () => {
      const dto = {
        campaignId: "33333333-3333-3333-3333-333333333333",
        amount: 500000,
        paymentMethod: "wallet",
        idempotencyKey: "unique-key-1",
      };
      const donation = await service.create(dto as any, makeUser());
      equal(donation.status, DonationStatus.PENDING);
      equal(donation.amount, 500000);
      ok(donation.transactionId?.startsWith("DEMO-"));
    });

    it("should return existing donation for duplicate idempotency key", async () => {
      const dto = {
        campaignId: "33333333-3333-3333-3333-333333333333",
        amount: 500000,
        paymentMethod: "wallet",
        idempotencyKey: "existing-key",
      };
      const donation = await service.create(dto as any, makeUser());
      equal(donation.id, "22222222-2222-2222-2222-222222222222");
    });

    it("should throw NotFoundException for missing campaign", async () => {
      repos.campaignRepo.findOne = async () => null;
      await service
        .create(
          {
            campaignId: "missing",
            amount: 500000,
            paymentMethod: "wallet",
            idempotencyKey: "key-2",
          } as any,
          makeUser(),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });

    it("should throw ConflictException for non-active campaign", async () => {
      repos.campaignRepo.findOne = async () => ({
        ...repos.mockCampaign,
        status: CampaignStatus.DRAFT,
      });
      await service
        .create(
          {
            campaignId: "33333333-3333-3333-3333-333333333333",
            amount: 500000,
            paymentMethod: "wallet",
            idempotencyKey: "key-3",
          } as any,
          makeUser(),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });

    it("should throw ConflictException for an expired campaign", async () => {
      repos.campaignRepo.findOne = async () => ({
        ...repos.mockCampaign,
        status: CampaignStatus.ACTIVE,
        endDate: new Date(Date.now() - 24 * 3600_000),
      });
      await service
        .create(
          {
            campaignId: "33333333-3333-3333-3333-333333333333",
            amount: 500000,
            paymentMethod: "wallet",
            idempotencyKey: "key-4",
          } as any,
          makeUser(),
        )
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 409);
        });
    });
  });

  describe("handleWebhook", () => {
    const DONATION_ID = "22222222-2222-2222-2222-222222222222";

    function signed(status: "completed" | "failed", donationId = DONATION_ID) {
      const dto = { donationId, status, timestamp: Date.now() };
      return { dto, signature: signWebhookPayload(WEBHOOK_SECRET, dto) };
    }

    async function expectStatus(promise: Promise<unknown>, status: number) {
      await promise
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, status);
        });
    }

    it("should complete a pending donation with a valid signature", async () => {
      const { dto, signature } = signed("completed");
      const donation = await service.handleWebhook(dto, signature);
      equal(donation.status, DonationStatus.COMPLETED);
      ok(donation.completedAt);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "donation.payment.completed");
      equal(audit.entries[0].userId, undefined);
      equal(audit.entries[0].newValues?.source, "payment-webhook");
    });

    it("should fail a pending donation with a valid signature", async () => {
      const { dto, signature } = signed("failed");
      const donation = await service.handleWebhook(dto, signature);
      equal(donation.status, DonationStatus.FAILED);
    });

    it("should reject a webhook without a signature and audit the attempt", async () => {
      const { dto } = signed("completed");
      await expectStatus(service.handleWebhook(dto, undefined), 401);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "donation.webhook.rejected");
      equal(audit.entries[0].entityId, DONATION_ID);
    });

    it("should reject a signature that does not match the payload", async () => {
      const { signature } = signed("failed");
      await expectStatus(
        service.handleWebhook(
          { donationId: DONATION_ID, status: "completed", timestamp: Date.now() },
          signature,
        ),
        401,
      );
    });

    it("should reject a signature made with another secret", async () => {
      const dto = { donationId: DONATION_ID, status: "completed" as const, timestamp: Date.now() };
      const forged = signWebhookPayload("attacker-secret", dto);
      await expectStatus(service.handleWebhook(dto, forged), 401);
    });

    it("should not look up the donation before verifying the signature", async () => {
      let lookups = 0;
      repos.donationRepo.findOne = async () => {
        lookups += 1;
        return repos.mockDonation;
      };
      await expectStatus(
        service.handleWebhook(
          { donationId: DONATION_ID, status: "completed", timestamp: Date.now() },
          "bad",
        ),
        401,
      );
      equal(lookups, 0);
    });

    it("should reject a valid signature whose timestamp is too old (replay)", async () => {
      const dto = {
        donationId: DONATION_ID,
        status: "completed" as const,
        timestamp: Date.now() - 6 * 60_000,
      };
      const signature = signWebhookPayload(WEBHOOK_SECRET, dto);
      await expectStatus(service.handleWebhook(dto, signature), 401);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "donation.webhook.rejected");
      equal(audit.entries[0].newValues?.reason, "stale-timestamp");
    });

    it("should only apply the payment once when two webhook calls race on the same donation", async () => {
      const { dto, signature } = signed("completed");
      // Mô phỏng: một request khác đã thắng update có điều kiện trước —
      // `update` trả `affected: 0`, `findOne` trả trạng thái đã COMPLETED.
      repos.txManager.update = async () => ({ affected: 0 });
      repos.txManager.findOne = async () => ({
        ...repos.mockDonation,
        status: DonationStatus.COMPLETED,
      });

      const donation = await service.handleWebhook(dto, signature);
      equal(donation.status, DonationStatus.COMPLETED);
      // Chữ ký/timestamp hợp lệ nên qua được guard PENDING, nhưng update có
      // điều kiện không ảnh hưởng dòng nào -> không ghi audit thanh toán lần 2.
      equal(audit.entries.length, 0);
    });

    it("should reject every webhook when no secret is configured", async () => {
      const unsecured = new DonationsService(
        repos.donationRepo,
        repos.campaignRepo,
        { transaction: repos.mockTransaction } as any,
        new DemoWalletGateway(),
        audit.service,
      );
      const { dto, signature } = signed("completed");
      await expectStatus(unsecured.handleWebhook(dto, signature), 401);
      await expectStatus(unsecured.handleWebhook(dto, ""), 401);
    });

    it("should return existing donation if already processed", async () => {
      repos.donationRepo.findOne = async () => ({
        ...repos.mockDonation,
        status: DonationStatus.COMPLETED,
      });
      const { dto, signature } = signed("completed");
      const donation = await service.handleWebhook(dto, signature);
      equal(donation.status, DonationStatus.COMPLETED);
      equal(audit.entries.length, 0);
    });

    it("should throw NotFoundException for missing donation", async () => {
      repos.donationRepo.findOne = async () => null;
      const { dto, signature } = signed("completed", "missing");
      await expectStatus(service.handleWebhook(dto, signature), 404);
    });
  });

  describe("confirmDemoPayment", () => {
    const DONATION_ID = "22222222-2222-2222-2222-222222222222";

    it("should let the donation owner confirm a demo wallet payment", async () => {
      const donation = await service.confirmDemoPayment(DONATION_ID, "completed", makeUser());
      equal(donation.status, DonationStatus.COMPLETED);
      equal(audit.entries.length, 1);
      equal(audit.entries[0].action, "donation.payment.completed");
      equal(audit.entries[0].userId, makeUser().id);
      equal(audit.entries[0].newValues?.source, "demo-wallet");
    });

    it("should hide donations that belong to someone else", async () => {
      await service
        .confirmDemoPayment(DONATION_ID, "completed", makeUser("99999999-9999-9999-9999-999999999999"))
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
      equal(audit.entries.length, 0);
    });

    it("should be unavailable when the gateway is not the demo wallet", async () => {
      const live = new DonationsService(
        repos.donationRepo,
        repos.campaignRepo,
        { transaction: repos.mockTransaction } as any,
        Object.assign(new DemoWalletGateway(WEBHOOK_SECRET), { mode: "live" as const }),
        audit.service,
      );
      await live
        .confirmDemoPayment(DONATION_ID, "completed", makeUser())
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 403);
        });
    });
  });

  describe("findById", () => {
    it("should return a donation by id", async () => {
      const donation = await service.findById(
        "22222222-2222-2222-2222-222222222222",
      );
      ok(donation);
      equal(donation.amount, 500000);
    });

    it("should throw NotFoundException for missing donation", async () => {
      repos.donationRepo.findOne = async () => null;
      await service
        .findById("missing")
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
        });
    });
  });

  describe("findMine", () => {
    it("should return donations for a user", async () => {
      const donations = await service.findMine(
        "11111111-1111-1111-1111-111111111111",
      );
      ok(Array.isArray(donations));
      equal(donations.length, 1);
    });
  });
});
