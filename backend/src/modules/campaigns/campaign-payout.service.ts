import { ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { User, UserRole } from "../users/entities/user.entity";
import { CampaignDisbursement } from "./entities/campaign-disbursement.entity";
import { CampaignPayoutAccount } from "./entities/campaign-payout-account.entity";
import { Campaign } from "./entities/campaign.entity";

export type PayoutAccountInput = { bankName: string; bankAccountNumber: string; bankAccountName: string };

export type PayoutAccountView = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  updatedAt: Date;
};

export type PayoutDisbursementView = {
  amount: number;
  donationCount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferReference: string;
  proofUrl: string | null;
  disbursedAt: Date;
};

const maskAccount = (value: string) => `•••• ${value.slice(-4)}`;
const describe = (a: PayoutAccountInput) => `${a.bankName} ${maskAccount(a.bankAccountNumber)} (${a.bankAccountName})`;

/**
 * Tài khoản nhận tiền của chiến dịch. Chủ dự án khai báo/đổi (cần mã OTP vì đổi tài khoản là
 * cách chiếm tiền phổ biến khi lộ phiên đăng nhập); admin xem đầy đủ để chuyển khoản tay.
 * Mỗi lần đổi đều ghi nhật ký và gửi email báo chủ dự án.
 */
@Injectable()
export class CampaignPayoutService {
  constructor(
    @InjectRepository(CampaignPayoutAccount)
    private readonly payoutRepo: Repository<CampaignPayoutAccount>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @InjectRepository(CampaignDisbursement)
    private readonly disbursementRepo: Repository<CampaignDisbursement> | null = null,
  ) {}

  /** Chủ dự án hoặc admin; `null` = chưa khai báo. */
  async get(campaignId: string, viewer: Pick<User, "id" | "role">): Promise<PayoutAccountView | null> {
    const campaign = await this.getCampaign(campaignId);
    if (campaign.ownerId !== viewer.id && viewer.role !== UserRole.ADMIN) {
      throw new NotFoundException("Campaign not found");
    }
    const account = await this.payoutRepo.findOne({ where: { campaignId } });
    return account ? this.toView(account) : null;
  }

  /**
   * Các tài khoản (khác nhau) chủ dự án đã khai báo ở những chiến dịch trước, mới nhất trước —
   * để form tạo chiến dịch gợi ý dùng lại (như Kickstarter), mỗi chiến dịch vẫn lưu riêng.
   */
  async listMine(owner: Pick<User, "id">): Promise<Array<Omit<PayoutAccountView, "updatedAt">>> {
    const rows = await this.payoutRepo
      .createQueryBuilder("p")
      .innerJoin(Campaign, "c", "c.id = p.campaign_id")
      .where("c.owner_id = :ownerId", { ownerId: owner.id })
      .orderBy("p.updated_at", "DESC")
      .take(50)
      .getMany();
    const seen = new Set<string>();
    const result: Array<Omit<PayoutAccountView, "updatedAt">> = [];
    for (const row of rows) {
      const key = `${row.bankName}|${row.bankAccountNumber}|${row.bankAccountName}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ bankName: row.bankName, bankAccountNumber: row.bankAccountNumber, bankAccountName: row.bankAccountName });
    }
    return result.slice(0, 5);
  }

  /** Lần giải ngân của chiến dịch (chủ dự án hoặc admin); `null` = chưa giải ngân. */
  async disbursement(campaignId: string, viewer: Pick<User, "id" | "role">): Promise<PayoutDisbursementView | null> {
    await this.get(campaignId, viewer);
    const row = await this.disbursementRepo?.findOne({ where: { campaignId } });
    return row
      ? {
          amount: Number(row.amount),
          donationCount: row.donationCount,
          bankName: row.bankName,
          bankAccountNumber: row.bankAccountNumber,
          bankAccountName: row.bankAccountName,
          transferReference: row.transferReference,
          proofUrl: row.proofUrl ?? null,
          disbursedAt: row.disbursedAt,
        }
      : null;
  }

  async set(campaignId: string, input: PayoutAccountInput, owner: Pick<User, "id">): Promise<PayoutAccountView> {
    const campaign = await this.getCampaign(campaignId);
    if (campaign.ownerId !== owner.id) {
      throw new ForbiddenException("Chỉ chủ dự án được khai báo tài khoản nhận tiền.");
    }
    const previous = await this.payoutRepo.findOne({ where: { campaignId } });
    await this.payoutRepo.save(
      this.payoutRepo.create({
        campaignId,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        updatedBy: owner.id,
      }),
    );
    await this.auditService.record({
      userId: owner.id,
      action: previous ? "campaign.payout.update" : "campaign.payout.create",
      entity: "campaign",
      entityId: campaignId,
      ...(previous ? { oldValues: { account: describe(previous) } } : {}),
      newValues: { account: describe(input) },
    });
    await this.notificationsService
      .notify({
        userId: owner.id,
        type: NotificationType.SYSTEM,
        title: previous ? "Đã đổi tài khoản nhận tiền" : "Đã lưu tài khoản nhận tiền",
        message: `Tài khoản nhận tiền của “${campaign.title}” là ${describe(input)}. Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ Góp Mầm ngay.`,
        link: "/dashboard",
        relatedId: campaignId,
        email: true,
        emailCategory: "campaign_owner",
      })
      .catch(() => undefined);
    // Đọc lại để có `updated_at` đúng của bản ghi vừa lưu.
    const saved = await this.payoutRepo.findOneOrFail({ where: { campaignId } });
    return this.toView(saved);
  }

  private async getCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  private toView(account: CampaignPayoutAccount): PayoutAccountView {
    return {
      bankName: account.bankName,
      bankAccountNumber: account.bankAccountNumber,
      bankAccountName: account.bankAccountName,
      updatedAt: account.updatedAt,
    };
  }
}
