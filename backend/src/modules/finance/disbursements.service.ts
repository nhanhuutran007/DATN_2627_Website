import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { CampaignDisbursement } from "../campaigns/entities/campaign-disbursement.entity";
import { CampaignPayoutAccount } from "../campaigns/entities/campaign-payout-account.entity";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { DonationStatus, OUTSTANDING_DONATION_STATUSES } from "../donations/entities/donation.entity";
import { MediaFile, MediaPurpose } from "../media/entities/media-file.entity";
import { MEDIA_URL_PREFIX } from "../media/media.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";

/** Chiến dịch đã khép lại có thể có tiền để giải ngân. */
const CLOSED_STATUSES = [CampaignStatus.SUCCESS, CampaignStatus.ENDED];

/**
 * - `collecting`: còn cam kết chưa thu xong (chờ thanh toán / chưa tới lượt) → chưa gom đủ;
 * - `ready`: đã thu xong, chưa giải ngân;
 * - `disbursed`: đã chuyển cho chủ dự án.
 */
export type DisbursementState = "collecting" | "ready" | "disbursed";

export type DisbursementRow = {
  campaign: { id: string; title: string; status: CampaignStatus; goalAmount: number; endDate: Date };
  owner: { id: string; name: string; email: string };
  state: DisbursementState;
  /** Tổng các khoản đã thu (completed). */
  collected: number;
  paidCount: number;
  /** Cam kết chưa thu (đang chờ thanh toán…). */
  outstanding: number;
  outstandingCount: number;
  payoutAccount: { bankName: string; bankAccountNumber: string; bankAccountName: string; updatedAt: Date } | null;
  disbursement: DisbursementView | null;
};

export type DisbursementView = {
  amount: number;
  donationCount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferReference: string;
  proofUrl: string | null;
  adminNotes: string | null;
  disbursedAt: Date;
};

export type DisbursementInput = { transferReference: string; proofMediaId?: string; adminNotes?: string };

type AggregateRow = {
  id: string;
  title: string;
  status: CampaignStatus;
  goalAmount: string;
  endDate: Date;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  collected: string | null;
  paidCount: string | null;
  outstanding: string | null;
  outstandingCount: string | null;
};

const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;
const maskAccount = (value: string) => `•••• ${value.slice(-4)}`;

/**
 * Giải ngân tiền gây quỹ: hệ thống không giữ tiền người ủng hộ trong ví nữa; tiền người ủng hộ
 * trả (QR SePay) về tài khoản Góp Mầm, khi thu xong admin gom và chuyển cho chủ dự án MỘT lần
 * (SePay không có API chi nên chuyển khoản tay rồi nhập mã giao dịch).
 */
@Injectable()
export class DisbursementsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignDisbursement)
    private readonly disbursementRepo: Repository<CampaignDisbursement>,
    @InjectRepository(CampaignPayoutAccount)
    private readonly payoutRepo: Repository<CampaignPayoutAccount>,
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(state?: DisbursementState, campaignId?: string): Promise<DisbursementRow[]> {
    const query = this.campaignRepo
      .createQueryBuilder("c")
      .innerJoin("c.owner", "o")
      .leftJoin("c.donations", "d")
      .select([
        "c.id AS id",
        "c.title AS title",
        "c.status AS status",
        "c.goal_amount AS goalAmount",
        "c.end_date AS endDate",
        "o.id AS ownerId",
        "o.name AS ownerName",
        "o.email AS ownerEmail",
      ])
      .addSelect("SUM(CASE WHEN d.status = :completed THEN d.amount ELSE 0 END)", "collected")
      .addSelect("SUM(CASE WHEN d.status = :completed THEN 1 ELSE 0 END)", "paidCount")
      .addSelect("SUM(CASE WHEN d.status IN (:...outstandingStatuses) THEN d.amount ELSE 0 END)", "outstanding")
      .addSelect("SUM(CASE WHEN d.status IN (:...outstandingStatuses) THEN 1 ELSE 0 END)", "outstandingCount")
      .where("c.status IN (:...closed)", { closed: CLOSED_STATUSES })
      .andWhere("c.is_simulated = 0")
      .setParameters({ completed: DonationStatus.COMPLETED, outstandingStatuses: [...OUTSTANDING_DONATION_STATUSES] })
      .groupBy("c.id")
      .addGroupBy("o.id")
      .having("collected > 0 OR outstanding > 0")
      .orderBy("c.end_date", "ASC");
    if (campaignId) query.andWhere("c.id = :campaignId", { campaignId });
    const rows = await query.getRawMany<AggregateRow>();
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const [accounts, disbursements] = await Promise.all([
      this.payoutRepo.find({ where: { campaignId: In(ids) } }),
      this.disbursementRepo.find({ where: { campaignId: In(ids) } }),
    ]);
    const accountOf = new Map(accounts.map((a) => [a.campaignId, a]));
    const disbursementOf = new Map(disbursements.map((d) => [d.campaignId, d]));

    const result = rows.map((row): DisbursementRow => {
      const account = accountOf.get(row.id);
      const disbursement = disbursementOf.get(row.id);
      const outstandingCount = Number(row.outstandingCount ?? 0);
      return {
        campaign: { id: row.id, title: row.title, status: row.status, goalAmount: Number(row.goalAmount), endDate: row.endDate },
        owner: { id: row.ownerId, name: row.ownerName, email: row.ownerEmail },
        state: disbursement ? "disbursed" : outstandingCount > 0 ? "collecting" : "ready",
        collected: Number(row.collected ?? 0),
        paidCount: Number(row.paidCount ?? 0),
        outstanding: Number(row.outstanding ?? 0),
        outstandingCount,
        payoutAccount: account
          ? { bankName: account.bankName, bankAccountNumber: account.bankAccountNumber, bankAccountName: account.bankAccountName, updatedAt: account.updatedAt }
          : null,
        disbursement: disbursement ? this.toView(disbursement) : null,
      };
    });
    return state ? result.filter((row) => row.state === state) : result;
  }

  /** Admin đã chuyển khoản tổng tiền đã thu cho chủ dự án: ghi nhận một lần duy nhất. */
  async disburse(campaignId: string, input: DisbursementInput, admin: User): Promise<DisbursementView> {
    const reference = input.transferReference?.trim();
    if (!reference) throw new BadRequestException("Nhập mã giao dịch chuyển khoản cho chủ dự án.");
    const [row] = await this.list(undefined, campaignId);
    if (!row) throw new NotFoundException("Chiến dịch không có tiền để giải ngân.");
    if (row.owner.id === admin.id) throw new ForbiddenException("Không tự giải ngân cho chiến dịch của chính mình.");
    if (row.state === "disbursed") throw new ConflictException("Chiến dịch này đã được giải ngân.");
    if (row.state === "collecting") {
      throw new ConflictException(
        `Còn ${row.outstandingCount} cam kết chưa thanh toán (${money(row.outstanding)}). Chờ người ủng hộ trả hoặc hết hạn rồi giải ngân một lần.`,
      );
    }
    if (row.collected <= 0) throw new ConflictException("Chiến dịch chưa thu được khoản nào.");
    if (!row.payoutAccount) throw new ConflictException("Chủ dự án chưa khai báo tài khoản nhận tiền.");

    const proofUrl = input.proofMediaId ? await this.resolveProof(input.proofMediaId, admin) : null;
    const disbursedAt = new Date();
    let saved: CampaignDisbursement;
    try {
      saved = await this.disbursementRepo.save(
        this.disbursementRepo.create({
          campaignId,
          amount: row.collected,
          donationCount: row.paidCount,
          bankName: row.payoutAccount.bankName,
          bankAccountNumber: row.payoutAccount.bankAccountNumber,
          bankAccountName: row.payoutAccount.bankAccountName,
          transferReference: reference,
          proofUrl,
          adminNotes: input.adminNotes?.trim() || null,
          disbursedBy: admin.id,
          disbursedAt,
        }),
      );
    } catch (error) {
      // Khóa duy nhất `campaign_id`: hai admin bấm cùng lúc thì chỉ một lần được ghi.
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new ConflictException("Chiến dịch này đã được giải ngân.");
      throw error;
    }
    const account = `${row.payoutAccount.bankName} ${maskAccount(row.payoutAccount.bankAccountNumber)}`;
    await this.auditService.record({
      userId: admin.id,
      action: "campaign.disburse",
      entity: "campaign",
      entityId: campaignId,
      newValues: { amount: row.collected, donationCount: row.paidCount, account, transferReference: reference, proof: !!proofUrl },
    });
    await this.notificationsService
      .notify({
        userId: row.owner.id,
        type: NotificationType.SYSTEM,
        title: "Đã giải ngân tiền gây quỹ",
        message: `Góp Mầm đã chuyển ${money(row.collected)} (${row.paidCount} khoản ủng hộ) của "${row.campaign.title}" về ${account} — mã giao dịch ${reference}.`,
        link: "/dashboard",
        relatedId: campaignId,
        email: true,
        emailCategory: "campaign_owner",
      })
      .catch(() => undefined);
    return this.toView(saved);
  }

  /** Cho chủ dự án xem trạng thái giải ngân của chiến dịch mình. */
  async findForCampaign(campaignId: string): Promise<DisbursementView | null> {
    const row = await this.disbursementRepo.findOne({ where: { campaignId } });
    return row ? this.toView(row) : null;
  }

  private async resolveProof(mediaId: string, admin: User): Promise<string> {
    const file = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!file || file.purpose !== MediaPurpose.REFUND_PROOF) {
      throw new BadRequestException("Chứng từ không tồn tại hoặc không phải ảnh chứng từ chuyển khoản.");
    }
    if (file.ownerId !== admin.id) throw new ForbiddenException("Chỉ dùng được chứng từ do chính bạn tải lên.");
    return `${MEDIA_URL_PREFIX}${file.storageKey}`;
  }

  private toView(row: CampaignDisbursement): DisbursementView {
    return {
      amount: Number(row.amount),
      donationCount: row.donationCount,
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      transferReference: row.transferReference,
      proofUrl: row.proofUrl ?? null,
      adminNotes: row.adminNotes ?? null,
      disbursedAt: row.disbursedAt,
    };
  }
}
