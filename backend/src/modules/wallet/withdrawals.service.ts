import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, FindOptionsWhere, Like, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { vnDateRange } from "../../common/query/range";
import { MediaFile, MediaPurpose } from "../media/entities/media-file.entity";
import { MEDIA_URL_PREFIX } from "../media/media.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";
import { Wallet, WalletTxType, WalletWithdrawal, WithdrawalStatus } from "./entities/wallet.entity";
import { WalletReconciliationService } from "./wallet-reconciliation.service";
import { WalletService } from "./wallet.service";

/** Rút tối thiểu mỗi lần (tránh phí chuyển khoản lẻ). */
export const MIN_WITHDRAW = 50_000;
/** Số yêu cầu đang chờ tối đa của một người. */
export const MAX_PENDING_WITHDRAWALS = 3;

export type WithdrawalInput = {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export type ApproveWithdrawalInput = { adminNotes: string; transferReference?: string; proofMediaId?: string };

export type WithdrawalView = {
  id: string;
  amount: number;
  bankName: string;
  /** Chỉ 4 số cuối với người dùng; admin xem đủ để chuyển khoản. */
  bankAccountNumber: string;
  bankAccountName: string;
  status: WithdrawalStatus;
  transferReference: string | null;
  proofUrl: string | null;
  adminNotes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  user?: { id: string; name: string; email: string };
};

export type WithdrawalPage = { items: WithdrawalView[]; total: number; offset: number; limit: number };

function money(value: number | string): string {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

const maskAccount = (value: string) => `•••• ${value.slice(-4)}`;

/**
 * Rút tiền từ ví về tài khoản ngân hàng. SePay chỉ nhận tiền (không có API chi) nên admin
 * chuyển khoản tay từ tài khoản Góp Mầm rồi nhập mã giao dịch. Tiền được khóa ngay khi
 * gửi yêu cầu (`withdrawing`), mọi bước đổi trạng thái + số dư chạy chung transaction và
 * có điều kiện, nên một yêu cầu không thể bị trả/hoàn hai lần.
 */
@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    private readonly dataSource: DataSource,
    private readonly wallet: WalletService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @Inject(WalletReconciliationService)
    private readonly reconciliation: WalletReconciliationService | null = null,
  ) {}

  async request(user: User, input: WithdrawalInput): Promise<WithdrawalView> {
    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount < MIN_WITHDRAW) {
      throw new BadRequestException(`Số tiền rút tối thiểu ${money(MIN_WITHDRAW)}.`);
    }
    const pending = await this.withdrawalRepo.count({ where: { userId: user.id, status: WithdrawalStatus.PENDING } });
    if (pending >= MAX_PENDING_WITHDRAWALS) {
      throw new ConflictException(`Bạn đang có ${pending} yêu cầu rút chờ xử lý. Vui lòng chờ hoặc hủy bớt.`);
    }
    const saved = await this.dataSource.transaction(async (manager) => {
      await this.reconciliation?.assertConsistent(user.id, "user", manager);
      // Khóa tiền ngay: số dư → chờ rút (có điều kiện, không thể âm ví).
      const locked = await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => "balance - :amount", withdrawing: () => "withdrawing + :amount" })
        .where("user_id = :userId AND balance >= :amount", { userId: user.id, amount })
        .execute();
      if (!locked.affected) {
        throw new BadRequestException("Số dư ví không đủ để rút số tiền này.");
      }
      const withdrawal = await manager.save(
        manager.create(WalletWithdrawal, {
          userId: user.id,
          amount,
          bankName: input.bankName,
          bankAccountNumber: input.bankAccountNumber,
          bankAccountName: input.bankAccountName,
          status: WithdrawalStatus.PENDING,
        }),
      );
      await this.wallet.record(manager, user.id, WalletTxType.WITHDRAW_REQUEST, amount, { withdrawalId: withdrawal.id });
      return withdrawal;
    });
    await this.auditService.record({
      userId: user.id,
      action: "wallet.withdraw.request",
      entity: "wallet_withdrawal",
      entityId: saved.id,
      newValues: { amount, bankAccount: `${input.bankName} ${maskAccount(input.bankAccountNumber)}` },
    });
    await this.notificationsService
      .notify({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Đã nhận yêu cầu rút tiền",
        message: `Yêu cầu rút ${money(amount)} về ${input.bankName} ${maskAccount(input.bankAccountNumber)} đang chờ quản trị viên chuyển khoản.`,
        link: "/vi",
        relatedId: saved.id,
      })
      .catch(() => undefined);
    return this.toView(saved, false);
  }

  /** Người dùng hủy yêu cầu còn chờ: tiền trả về số dư. */
  async cancel(id: string, user: User): Promise<WithdrawalView> {
    const withdrawal = await this.get(id);
    if (withdrawal.userId !== user.id) throw new NotFoundException("Không tìm thấy yêu cầu rút.");
    const done = await this.close(withdrawal, WithdrawalStatus.CANCELLED, { note: "Người dùng hủy yêu cầu" });
    if (!done) throw new ConflictException("Yêu cầu đã được xử lý.");
    await this.auditService.record({
      userId: user.id,
      action: "wallet.withdraw.cancel",
      entity: "wallet_withdrawal",
      entityId: id,
      newValues: { amount: Number(withdrawal.amount) },
    });
    return this.toView({ ...withdrawal, status: WithdrawalStatus.CANCELLED } as WalletWithdrawal, false);
  }

  async listMine(user: User): Promise<WithdrawalView[]> {
    const rows = await this.withdrawalRepo.find({ where: { userId: user.id }, order: { createdAt: "DESC" }, take: 20 });
    return rows.map((row) => this.toView(row, false));
  }

  async adminList(
    status: WithdrawalStatus | undefined,
    offset = 0,
    limit = 20,
    filters: { q?: string; from?: string; to?: string } = {},
  ): Promise<WithdrawalPage> {
    const createdAt = vnDateRange(filters.from, filters.to);
    const base: FindOptionsWhere<WalletWithdrawal> = {
      ...(status ? { status } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const keyword = filters.q?.trim();
    const like = keyword ? Like(`%${keyword}%`) : undefined;
    const [rows, total] = await this.withdrawalRepo.findAndCount({
      where: like
        ? [{ ...base, user: { name: like } }, { ...base, user: { email: like } }, { ...base, bankAccountName: like }]
        : base,
      relations: { user: true },
      // Hàng chờ: cũ nhất trước để xử lý theo thứ tự; còn lại mới nhất trước.
      order: { createdAt: status === WithdrawalStatus.PENDING ? "ASC" : "DESC" },
      skip: offset,
      take: Math.min(limit, 100),
    });
    return { items: rows.map((row) => this.toView(row, true)), total, offset, limit };
  }

  /** Admin đã chuyển khoản xong: nhập mã giao dịch (bắt buộc) và ảnh chứng từ (tùy chọn). */
  async approve(id: string, input: ApproveWithdrawalInput, admin: User): Promise<WithdrawalView> {
    const reference = input.transferReference?.trim();
    if (!reference) {
      throw new BadRequestException("Nhập mã giao dịch chuyển khoản đã thực hiện cho người dùng.");
    }
    const withdrawal = await this.get(id);
    if (withdrawal.userId === admin.id) throw new ForbiddenException("Không tự duyệt yêu cầu rút của chính mình.");
    // Không chi tiền thật cho ví đang lệch sổ (vd. số dư bị sửa thẳng trong cơ sở dữ liệu).
    await this.reconciliation?.assertConsistent(withdrawal.userId, "admin");
    const proofUrl = input.proofMediaId ? await this.resolveProof(input.proofMediaId, admin) : null;
    const amount = Number(withdrawal.amount);
    const reviewedAt = new Date();
    const done = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        WalletWithdrawal,
        { id, status: WithdrawalStatus.PENDING },
        { status: WithdrawalStatus.COMPLETED, transferReference: reference, proofUrl, adminNotes: input.adminNotes, reviewedBy: admin.id, reviewedAt },
      );
      if (!claimed.affected) return false;
      const paid = await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({ withdrawing: () => "withdrawing - :amount" })
        .where("user_id = :userId AND withdrawing >= :amount", { userId: withdrawal.userId, amount })
        .execute();
      if (!paid.affected) {
        throw new InternalServerErrorException("Ví không còn khoản chờ rút tương ứng.");
      }
      await this.wallet.record(manager, withdrawal.userId, WalletTxType.WITHDRAW_PAID, amount, {
        withdrawalId: id,
        note: reference,
      });
      return true;
    });
    if (!done) throw new ConflictException("Yêu cầu đã được xử lý.");
    await this.auditService.record({
      userId: admin.id,
      action: "wallet.withdraw.approve",
      entity: "wallet_withdrawal",
      entityId: id,
      oldValues: { status: WithdrawalStatus.PENDING },
      newValues: { status: WithdrawalStatus.COMPLETED, amount, transferReference: reference, proof: !!proofUrl },
    });
    await this.notificationsService
      .notify({
        userId: withdrawal.userId,
        type: NotificationType.SYSTEM,
        title: "Đã chuyển tiền rút về tài khoản",
        message: `Góp Mầm đã chuyển ${money(amount)} về ${withdrawal.bankName} ${maskAccount(withdrawal.bankAccountNumber)} (mã giao dịch ${reference}).`,
        link: "/vi",
        relatedId: id,
        email: true,
        emailCategory: "wallet",
      })
      .catch(() => undefined);
    return this.toView({ ...withdrawal, status: WithdrawalStatus.COMPLETED, transferReference: reference, proofUrl, adminNotes: input.adminNotes, reviewedAt } as WalletWithdrawal, true);
  }

  /** Admin từ chối (sai thông tin tài khoản, nghi gian lận…): tiền trả về số dư, kèm lý do. */
  async reject(id: string, adminNotes: string, admin: User): Promise<WithdrawalView> {
    const withdrawal = await this.get(id);
    const reviewedAt = new Date();
    const done = await this.close(withdrawal, WithdrawalStatus.REJECTED, {
      note: `Từ chối: ${adminNotes}`.slice(0, 255),
      adminNotes,
      reviewedBy: admin.id,
      reviewedAt,
    });
    if (!done) throw new ConflictException("Yêu cầu đã được xử lý.");
    await this.auditService.record({
      userId: admin.id,
      action: "wallet.withdraw.reject",
      entity: "wallet_withdrawal",
      entityId: id,
      oldValues: { status: WithdrawalStatus.PENDING },
      newValues: { status: WithdrawalStatus.REJECTED, amount: Number(withdrawal.amount), adminNotes },
    });
    await this.notificationsService
      .notify({
        userId: withdrawal.userId,
        type: NotificationType.SYSTEM,
        title: "Yêu cầu rút tiền bị từ chối",
        message: `Yêu cầu rút ${money(withdrawal.amount)} bị từ chối: ${adminNotes}. Số tiền đã trả lại số dư ví.`,
        link: "/vi",
        relatedId: id,
        email: true,
        emailCategory: "wallet",
      })
      .catch(() => undefined);
    return this.toView({ ...withdrawal, status: WithdrawalStatus.REJECTED, adminNotes, reviewedAt } as WalletWithdrawal, true);
  }

  /** Đóng yêu cầu còn chờ (hủy/từ chối) và trả tiền chờ rút về số dư, cùng transaction. */
  private async close(
    withdrawal: WalletWithdrawal,
    status: WithdrawalStatus.CANCELLED | WithdrawalStatus.REJECTED,
    extra: { note: string; adminNotes?: string; reviewedBy?: string; reviewedAt?: Date },
  ): Promise<boolean> {
    const amount = Number(withdrawal.amount);
    return this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        WalletWithdrawal,
        { id: withdrawal.id, status: WithdrawalStatus.PENDING },
        {
          status,
          ...(extra.adminNotes !== undefined ? { adminNotes: extra.adminNotes } : {}),
          ...(extra.reviewedBy ? { reviewedBy: extra.reviewedBy, reviewedAt: extra.reviewedAt } : {}),
        },
      );
      if (!claimed.affected) return false;
      const restored = await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({ withdrawing: () => "withdrawing - :amount", balance: () => "balance + :amount" })
        .where("user_id = :userId AND withdrawing >= :amount", { userId: withdrawal.userId, amount })
        .execute();
      if (!restored.affected) {
        throw new InternalServerErrorException("Ví không còn khoản chờ rút tương ứng.");
      }
      await this.wallet.record(manager, withdrawal.userId, WalletTxType.WITHDRAW_CANCEL, amount, {
        withdrawalId: withdrawal.id,
        note: extra.note,
      });
      return true;
    });
  }

  private async get(id: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.withdrawalRepo.findOne({ where: { id } });
    if (!withdrawal) throw new NotFoundException("Không tìm thấy yêu cầu rút.");
    return withdrawal;
  }

  private async resolveProof(mediaId: string, admin: User): Promise<string> {
    const file = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!file || file.purpose !== MediaPurpose.REFUND_PROOF) {
      throw new BadRequestException("Chứng từ không tồn tại hoặc không phải ảnh chứng từ chuyển khoản.");
    }
    if (file.ownerId !== admin.id) {
      throw new ForbiddenException("Chỉ dùng được chứng từ do chính bạn tải lên.");
    }
    return `${MEDIA_URL_PREFIX}${file.storageKey}`;
  }

  private toView(row: WalletWithdrawal, forAdmin: boolean): WithdrawalView {
    return {
      id: row.id,
      amount: Number(row.amount),
      bankName: row.bankName,
      bankAccountNumber: forAdmin ? row.bankAccountNumber : maskAccount(row.bankAccountNumber),
      bankAccountName: row.bankAccountName,
      status: row.status,
      transferReference: row.transferReference ?? null,
      proofUrl: row.proofUrl ?? null,
      adminNotes: row.adminNotes ?? null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt,
      ...(forAdmin && row.user ? { user: { id: row.user.id, name: row.user.name, email: row.user.email } } : {}),
    };
  }
}
