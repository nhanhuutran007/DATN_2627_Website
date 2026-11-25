import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, LessThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { frontendBaseUrl } from "../../integrations/email/email.gateway";
import {
  generateTransferCode,
  type SepayCheckoutForm,
  SepayGateway,
  type SepayIpn,
} from "../../integrations/payment/sepay";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";
import { TopupStatus, Wallet, WalletTopup, WalletTransaction, WalletTxType } from "./entities/wallet.entity";
import { WalletReconciliationService } from "./wallet-reconciliation.service";

/** Mức nạp tối thiểu/tối đa mỗi lần. */
/**
 * Nạp ví đã tắt (không giữ tiền người dùng). Bật lại chỉ để kiểm thử dữ liệu cũ: `WALLET_TOPUP_ENABLED=true`.
 */
export function topupsEnabled(): boolean {
  return process.env.WALLET_TOPUP_ENABLED === "true";
}

export const MIN_TOPUP = 10_000;
export const MAX_TOPUP = 100_000_000;
/** Đơn nạp chưa thanh toán tự hết hạn (khớp TTL đơn ủng hộ SePay). */
export const TOPUP_TTL_MINUTES = 30;
/** Tiền tố mã đơn nạp ví trên SePay (khoản ủng hộ dùng `GM`). */
export const TOPUP_PREFIX = "NP";

export type WalletSummary = { balance: number; held: number; withdrawing: number };

export type WalletView = WalletSummary & {
  transactions: {
    id: string;
    type: WalletTxType;
    amount: number;
    balanceAfter: number;
    heldAfter: number;
    withdrawingAfter: number;
    donationId: string | null;
    topupId: string | null;
    withdrawalId: string | null;
    note: string | null;
    createdAt: Date;
  }[];
  /** Cho phép nạp thử không qua SePay (chỉ môi trường demo/sandbox). */
  demoTopup: boolean;
  /** Cổng SePay đã cấu hình (nạp thật). */
  sepay: boolean;
};

export type TopupStart = { topup: WalletTopup; checkout: SepayCheckoutForm | null };

/** Khoản ủng hộ cần thao tác ví (chỉ các trường dùng tới). */
type DonationRef = { id: string; userId: string; amount: number | string };

function money(value: number | string): string {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

/**
 * Ví Góp Mầm. Các thao tác giữ/trừ/hoàn nhận `EntityManager` để chạy chung transaction
 * với việc đổi trạng thái khoản ủng hộ: hoặc cả hai cùng xong, hoặc không có gì đổi.
 * Mỗi cập nhật số dư đều có điều kiện trong SQL (`balance >= x`, `held >= x`) nên hai
 * yêu cầu đồng thời không làm âm ví; sổ giao dịch có UNIQUE chống làm trùng một khoản.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    @InjectRepository(WalletTopup)
    private readonly topupRepo: Repository<WalletTopup>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @Inject("WalletSepayGateway")
    private readonly sepay: SepayGateway | null = null,
    @Optional()
    @Inject(WalletReconciliationService)
    private readonly reconciliation: WalletReconciliationService | null = null,
  ) {}

  /** Nạp thử không qua SePay: chỉ khi SePay không chạy production (giống ví demo cũ). */
  demoTopupEnabled(): boolean {
    return this.sepay?.env !== "production";
  }

  async summary(userId: string): Promise<WalletSummary> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    return {
      balance: Number(wallet?.balance ?? 0),
      held: Number(wallet?.held ?? 0),
      withdrawing: Number(wallet?.withdrawing ?? 0),
    };
  }

  async getMine(user: User, limit = 30): Promise<WalletView> {
    const [summary, transactions] = await Promise.all([
      this.summary(user.id),
      this.txRepo.find({ where: { userId: user.id }, order: { createdAt: "DESC" }, take: Math.min(limit, 100) }),
    ]);
    return {
      ...summary,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
        heldAfter: Number(tx.heldAfter),
        withdrawingAfter: Number(tx.withdrawingAfter ?? 0),
        donationId: tx.donationId ?? null,
        topupId: tx.topupId ?? null,
        withdrawalId: tx.withdrawalId ?? null,
        note: tx.note ?? null,
        createdAt: tx.createdAt,
      })),
      demoTopup: this.demoTopupEnabled(),
      sepay: !!this.sepay,
    };
  }

  // ---------- Giữ / trừ / hoàn cho khoản ủng hộ (chạy trong transaction của khoản đó) ----------

  /** Ủng hộ bằng ví: số dư → tiền giữ. `false` nếu số dư không đủ (không đổi gì). */
  async hold(manager: EntityManager, donation: DonationRef): Promise<boolean> {
    const amount = Number(donation.amount);
    // Ví lệch sổ (tiền thêm/bớt ngoài giao dịch) không được tiêu cho tới khi admin đối soát.
    await this.reconciliation?.assertConsistent(donation.userId, "user", manager);
    // Một câu UPDATE có điều kiện (khóa X ngay): ví chưa có dòng = số dư 0 = không đủ.
    // Không INSERT IGNORE trước đó: khóa S của nó + UPDATE đồng thời gây deadlock.
    const result = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => "balance - :amount", held: () => "held + :amount" })
      .where("user_id = :userId AND balance >= :amount", { userId: donation.userId, amount })
      .execute();
    if (!result.affected) return false;
    await this.record(manager, donation.userId, WalletTxType.HOLD, amount, { donationId: donation.id });
    return true;
  }

  /** Chiến dịch đạt mục tiêu: trừ hẳn tiền đang giữ. */
  async capture(manager: EntityManager, donation: DonationRef): Promise<void> {
    const amount = Number(donation.amount);
    const result = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ held: () => "held - :amount" })
      .where("user_id = :userId AND held >= :amount", { userId: donation.userId, amount })
      .execute();
    if (!result.affected) {
      // Không bao giờ xảy ra nếu sổ đúng: dừng lại thay vì ghi nhận tiền không có thật.
      throw new InternalServerErrorException(`Ví không đủ tiền giữ cho khoản ${donation.id}`);
    }
    await this.record(manager, donation.userId, WalletTxType.CAPTURE, amount, { donationId: donation.id });
  }

  /** Không đạt mục tiêu / bị hủy / rút cam kết: tiền giữ trả về số dư. */
  async release(manager: EntityManager, donation: DonationRef): Promise<void> {
    const amount = Number(donation.amount);
    const result = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ held: () => "held - :amount", balance: () => "balance + :amount" })
      .where("user_id = :userId AND held >= :amount", { userId: donation.userId, amount })
      .execute();
    if (!result.affected) {
      throw new InternalServerErrorException(`Ví không đủ tiền giữ cho khoản ${donation.id}`);
    }
    await this.record(manager, donation.userId, WalletTxType.RELEASE, amount, { donationId: donation.id });
  }

  /** Admin hoàn khoản ủng hộ bằng ví đã bị trừ: cộng lại vào số dư. Trả mã tham chiếu. */
  async refund(manager: EntityManager, donation: DonationRef, note?: string): Promise<string> {
    const amount = Number(donation.amount);
    await this.credit(manager, donation.userId, amount);
    const tx = await this.record(manager, donation.userId, WalletTxType.REFUND, amount, {
      donationId: donation.id,
      note: note?.slice(0, 255) ?? null,
    });
    return `VI-${tx.id.slice(0, 8).toUpperCase()}`;
  }

  // ---------- Nạp ví qua SePay ----------

  async createTopup(user: User, amount: number): Promise<TopupStart> {
    // Mô hình trả sau: Góp Mầm không giữ tiền người dùng nên ngừng nhận nạp ví. Số dư cũ vẫn rút được.
    if (!topupsEnabled()) {
      throw new ForbiddenException("Ví Góp Mầm đã ngừng nhận nạp tiền. Ủng hộ bằng cam kết, chỉ thanh toán khi dự án đạt mục tiêu.");
    }
    if (!Number.isInteger(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
      throw new BadRequestException(`Số tiền nạp từ ${money(MIN_TOPUP)} đến ${money(MAX_TOPUP)}.`);
    }
    if (!this.sepay && !this.demoTopupEnabled()) {
      throw new ServiceUnavailableException("Chưa cấu hình cổng nạp tiền.");
    }
    const topup = await this.topupRepo.save(
      this.topupRepo.create({
        userId: user.id,
        amount,
        status: TopupStatus.PENDING,
        transferCode: generateTransferCode(TOPUP_PREFIX),
        transactionId: null,
        completedAt: null,
      }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "wallet.topup.create",
      entity: "wallet_topup",
      entityId: topup.id,
      newValues: { amount, transferCode: topup.transferCode },
    });
    return { topup, checkout: this.sepay ? this.checkoutFor(topup) : null };
  }

  /** Form SePay cho đơn nạp đang chờ của chính mình (bấm "Thanh toán lại"). */
  async checkout(topupId: string, user: User): Promise<SepayCheckoutForm> {
    if (!this.sepay) throw new ServiceUnavailableException("Cổng SePay chưa được cấu hình.");
    const topup = await this.ownTopup(topupId, user);
    if (topup.status !== TopupStatus.PENDING) throw new ConflictException("Đơn nạp không còn chờ thanh toán.");
    return this.checkoutFor(topup);
  }

  /** Mã đơn thuộc về nạp ví (để IPN SePay chuyển đúng nơi xử lý). */
  isTopupInvoice(invoiceNumber: string): boolean {
    return invoiceNumber.startsWith(TOPUP_PREFIX);
  }

  /** IPN SePay của đơn nạp (chữ ký đã được kiểm tra ở nơi gọi). */
  async handleTopupIpn(ipn: SepayIpn): Promise<{ success: true; applied: boolean }> {
    const topup = await this.topupRepo.findOne({ where: { transferCode: ipn.invoiceNumber } });
    if (!topup) {
      await this.auditService.record({
        action: "wallet.topup.unmatched",
        entity: "wallet_topup",
        newValues: { invoiceNumber: ipn.invoiceNumber, amount: ipn.amount, transactionId: ipn.transactionId },
      });
      return { success: true, applied: false };
    }
    const paid = ipn.notificationType === "ORDER_PAID" && ipn.orderStatus === "CAPTURED";
    const amountMatches = ipn.currency === "VND" && Math.round(ipn.amount) === Math.round(Number(topup.amount));
    if (!paid || !amountMatches) {
      await this.auditService.record({
        action: paid ? "wallet.topup.amount-mismatch" : "wallet.topup.ignored",
        entity: "wallet_topup",
        entityId: topup.id,
        newValues: { notificationType: ipn.notificationType, orderStatus: ipn.orderStatus, amount: ipn.amount, expected: Number(topup.amount) },
      });
      return { success: true, applied: false };
    }
    const applied = await this.applyTopupPaid(topup, `SEPAY-${ipn.transactionId}`.slice(0, 255), "sepay-ipn");
    return { success: true, applied };
  }

  /** Hỏi thẳng SePay khi IPN chưa tới (người dùng quay lại trang ví). */
  async syncTopup(topupId: string, user: User): Promise<WalletTopup> {
    const topup = await this.ownTopup(topupId, user);
    if (topup.status === TopupStatus.COMPLETED || !this.sepay) return topup;
    let order;
    try {
      order = await this.sepay.fetchOrder(topup.transferCode);
    } catch {
      throw new ServiceUnavailableException("Không kết nối được SePay. Vui lòng thử lại sau.");
    }
    if (order && order.orderStatus === "CAPTURED" && order.currency === "VND" && Math.round(order.amount) === Math.round(Number(topup.amount))) {
      await this.applyTopupPaid(topup, `SEPAY-${order.orderId}`.slice(0, 255), "sepay-sync", user.id);
    }
    return (await this.topupRepo.findOne({ where: { id: topup.id } })) ?? topup;
  }

  /** Nạp thử (môi trường demo): xác nhận như SePay đã báo thành công. */
  async confirmDemoTopup(topupId: string, user: User): Promise<WalletTopup> {
    if (!this.demoTopupEnabled()) throw new ConflictException("Nạp thử đã tắt ở môi trường này.");
    const topup = await this.ownTopup(topupId, user);
    await this.applyTopupPaid(topup, `DEMO-${topup.transferCode}`, "demo", user.id);
    return (await this.topupRepo.findOne({ where: { id: topup.id } })) ?? topup;
  }

  async cancelTopup(topupId: string, user: User): Promise<WalletTopup> {
    const topup = await this.ownTopup(topupId, user);
    await this.topupRepo.update({ id: topup.id, status: TopupStatus.PENDING }, { status: TopupStatus.CANCELLED });
    return (await this.topupRepo.findOne({ where: { id: topup.id } })) ?? topup;
  }

  async listTopups(user: User): Promise<WalletTopup[]> {
    return this.topupRepo.find({ where: { userId: user.id }, order: { createdAt: "DESC" }, take: 20 });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredTopups(): Promise<void> {
    const expired = await this.expirePendingTopups();
    if (expired > 0) this.logger.log(`Wallet top-ups expired: ${expired}`);
  }

  async expirePendingTopups(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - TOPUP_TTL_MINUTES * 60_000);
    const result = await this.topupRepo.update(
      { status: TopupStatus.PENDING, createdAt: LessThan(cutoff) },
      { status: TopupStatus.EXPIRED },
    );
    return result.affected ?? 0;
  }

  /**
   * Cộng tiền nạp đúng một lần: đổi trạng thái có điều kiện rồi cộng số dư trong cùng
   * transaction. Nhận cả đơn đã hết hạn/hủy (tiền đã thật sự chuyển tới).
   */
  private async applyTopupPaid(topup: WalletTopup, transactionId: string, source: string, actorId?: string): Promise<boolean> {
    const amount = Number(topup.amount);
    const applied = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        WalletTopup,
        { id: topup.id, status: In([TopupStatus.PENDING, TopupStatus.EXPIRED, TopupStatus.CANCELLED]) },
        { status: TopupStatus.COMPLETED, transactionId, completedAt: new Date() },
      );
      if (!claimed.affected) return false;
      await this.credit(manager, topup.userId, amount);
      await this.record(manager, topup.userId, WalletTxType.TOPUP, amount, { topupId: topup.id, note: transactionId });
      return true;
    });
    if (!applied) return false;
    await this.auditService.record({
      userId: actorId ?? null,
      action: "wallet.topup.completed",
      entity: "wallet_topup",
      entityId: topup.id,
      oldValues: { status: topup.status },
      newValues: { status: TopupStatus.COMPLETED, amount, transactionId, source },
    });
    await this.notificationsService
      .notify({
        userId: topup.userId,
        type: NotificationType.SYSTEM,
        title: "Nạp ví thành công",
        message: `Đã cộng ${money(amount)} vào ví Góp Mầm của bạn.`,
        link: "/vi",
        relatedId: topup.id,
      })
      .catch(() => undefined);
    return true;
  }

  private checkoutFor(topup: WalletTopup): SepayCheckoutForm {
    const base = `${frontendBaseUrl()}/vi?topup=${topup.id}`;
    return this.sepay!.buildCheckout({
      invoiceNumber: topup.transferCode,
      amount: Math.round(Number(topup.amount)),
      description: `Nap vi Gop Mam ${topup.transferCode}`,
      successUrl: `${base}&payment=success`,
      errorUrl: `${base}&payment=error`,
      cancelUrl: `${base}&payment=cancel`,
    });
  }

  private async ownTopup(id: string, user: User): Promise<WalletTopup> {
    const topup = await this.topupRepo.findOne({ where: { id } });
    if (!topup || topup.userId !== user.id) throw new NotFoundException("Không tìm thấy đơn nạp.");
    return topup;
  }

  /**
   * Cộng số dư bằng một câu upsert (tạo ví nếu chưa có). Một câu duy nhất lấy khóa X
   * ngay, tránh deadlock của kiểu "INSERT IGNORE rồi UPDATE" khi chạy đồng thời.
   */
  private async credit(manager: EntityManager, userId: string, amount: number): Promise<void> {
    await manager.query(
      "INSERT INTO wallets (user_id, balance, held) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE balance = balance + ?",
      [userId, amount, amount],
    );
  }

  /** Ghi sổ kèm số dư sau giao dịch (đọc lại trong cùng transaction). Dùng chung với rút tiền. */
  async record(
    manager: EntityManager,
    userId: string,
    type: WalletTxType,
    amount: number,
    refs: { donationId?: string; topupId?: string; withdrawalId?: string; note?: string | null },
  ): Promise<WalletTransaction> {
    const wallet = await manager.findOne(Wallet, { where: { userId } });
    return manager.save(
      manager.create(WalletTransaction, {
        userId,
        type,
        amount,
        balanceAfter: Number(wallet?.balance ?? 0),
        heldAfter: Number(wallet?.held ?? 0),
        withdrawingAfter: Number(wallet?.withdrawing ?? 0),
        donationId: refs.donationId ?? null,
        topupId: refs.topupId ?? null,
        withdrawalId: refs.withdrawalId ?? null,
        note: refs.note ?? null,
      }),
    );
  }
}
