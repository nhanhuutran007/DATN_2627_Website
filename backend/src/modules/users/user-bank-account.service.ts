import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserBankAccount } from "./entities/user-bank-account.entity";
import type { User } from "./entities/user.entity";

export type BankAccountInput = { bankName: string; bankAccountNumber: string; bankAccountName: string };
export type BankAccountView = BankAccountInput & { updatedAt: Date };

const describe = (a: BankAccountInput) => `${a.bankName} •••• ${a.bankAccountNumber.slice(-4)} (${a.bankAccountName})`;

/**
 * Tài khoản ngân hàng mặc định của mỗi tài khoản người dùng. Lưu/đổi cần mã OTP (đổi nơi nhận
 * tiền là cách chiếm tiền phổ biến khi lộ phiên đăng nhập), ghi nhật ký và gửi email báo chính chủ.
 */
@Injectable()
export class UserBankAccountService {
  constructor(
    @InjectRepository(UserBankAccount)
    private readonly repo: Repository<UserBankAccount>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async get(user: Pick<User, "id">): Promise<BankAccountView | null> {
    const row = await this.repo.findOne({ where: { userId: user.id } });
    return row ? this.toView(row) : null;
  }

  async set(user: Pick<User, "id">, input: BankAccountInput): Promise<BankAccountView> {
    const previous = await this.repo.findOne({ where: { userId: user.id } });
    await this.repo.save(
      this.repo.create({
        userId: user.id,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
      }),
    );
    await this.auditService.record({
      userId: user.id,
      action: previous ? "user.bank_account.update" : "user.bank_account.create",
      entity: "user",
      entityId: user.id,
      ...(previous ? { oldValues: { account: describe(previous) } } : {}),
      newValues: { account: describe(input) },
    });
    await this.notify(
      user.id,
      previous ? "Đã đổi tài khoản ngân hàng" : "Đã lưu tài khoản ngân hàng",
      `Tài khoản ngân hàng của bạn trên Góp Mầm là ${describe(input)}.`,
    );
    const saved = await this.repo.findOneOrFail({ where: { userId: user.id } });
    return this.toView(saved);
  }

  async remove(user: Pick<User, "id">): Promise<void> {
    const previous = await this.repo.findOne({ where: { userId: user.id } });
    if (!previous) throw new NotFoundException("Bạn chưa lưu tài khoản ngân hàng.");
    await this.repo.delete({ userId: user.id });
    await this.auditService.record({
      userId: user.id,
      action: "user.bank_account.delete",
      entity: "user",
      entityId: user.id,
      oldValues: { account: describe(previous) },
    });
    await this.notify(user.id, "Đã xóa tài khoản ngân hàng", `Tài khoản ${describe(previous)} đã bị xóa khỏi hồ sơ của bạn.`);
  }

  private notify(userId: string, title: string, message: string) {
    return this.notificationsService
      .notify({
        userId,
        type: NotificationType.SYSTEM,
        title,
        message: `${message} Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ Góp Mầm ngay.`,
        link: "/ho-so",
        email: true,
      })
      .catch(() => undefined);
  }

  private toView(row: UserBankAccount): BankAccountView {
    return {
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      updatedAt: row.updatedAt,
    };
  }
}
