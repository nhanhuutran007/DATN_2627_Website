import { equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { DemoWalletGateway } from "../src/integrations/payment/payment.gateway";
import { DonationsService } from "../src/modules/donations/donations.service";
import {
  Donation,
  DonationStatus,
} from "../src/modules/donations/entities/donation.entity";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";

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

  const mockTransaction = async (fn: any) => {
    const manager = {
      save: async (d: any) => d,
      increment: async () => undefined,
    };
    return fn(manager);
  };

  return { donationRepo, campaignRepo, mockDonation, mockCampaign, mockTransaction };
}

describe("DonationsService", () => {
  let service: DonationsService;
  let repos: ReturnType<typeof createMockRepos>;
  let gateway: DemoWalletGateway;

  beforeEach(() => {
    repos = createMockRepos();
    gateway = new DemoWalletGateway();
    service = new DonationsService(
      repos.donationRepo,
      repos.campaignRepo,
      { transaction: repos.mockTransaction } as any,
      gateway,
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
    it("should complete a pending donation", async () => {
      const dto = {
        donationId: "22222222-2222-2222-2222-222222222222",
        status: "completed" as const,
      };
      const donation = await service.handleWebhook(dto);
      equal(donation.status, DonationStatus.COMPLETED);
      ok(donation.completedAt);
    });

    it("should fail a pending donation", async () => {
      const dto = {
        donationId: "22222222-2222-2222-2222-222222222222",
        status: "failed" as const,
      };
      const donation = await service.handleWebhook(dto);
      equal(donation.status, DonationStatus.FAILED);
    });

    it("should return existing donation if already processed", async () => {
      repos.donationRepo.findOne = async () => ({
        ...repos.mockDonation,
        status: DonationStatus.COMPLETED,
      });
      const dto = {
        donationId: "22222222-2222-2222-2222-222222222222",
        status: "completed" as const,
      };
      const donation = await service.handleWebhook(dto);
      equal(donation.status, DonationStatus.COMPLETED);
    });

    it("should throw NotFoundException for missing donation", async () => {
      repos.donationRepo.findOne = async () => null;
      await service
        .handleWebhook({ donationId: "missing", status: "completed" })
        .then(() => {
          throw new Error("should have thrown");
        })
        .catch((err) => {
          equal(err.status, 404);
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
