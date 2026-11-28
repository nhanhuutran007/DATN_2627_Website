import { randomBytes } from "node:crypto";

import { ConflictException, ForbiddenException, Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { DataSource, EntityManager, In, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { hashIdentity } from "../../common/identity-hash";
import { RiskAlert, RiskAlertLevel, RiskAlertStatus, RiskEntityType, RiskMethod } from "../admin/entities/risk-alert.entity";
import { Donation } from "../donations/entities/donation.entity";
import { computePledgeStanding } from "../donations/pledge-policy";
import { AccountTombstone } from "./entities/account-tombstone.entity";
import { UserBankAccount } from "./entities/user-bank-account.entity";
import { User, UserRole, UserStatus } from "./entities/user.entity";

/** Tên hiển thị thay cho tài khoản đã xóa (bình luận, danh sách ủng hộ… vẫn còn nhưng không lộ danh tính). */
export const DELETED_USER_NAME = "Người dùng đã xóa";

/** Chiến dịch còn nghĩa vụ với người ủng hộ: phải kết thúc/hủy trước khi xóa tài khoản. */
const OPEN_CAMPAIGN_STATUSES = ["pending", "approved", "active", "paused", "success"];
/** Khoản ủng hộ chưa tất toán. */
const OPEN_DONATION_STATUSES = ["pending", "pledged", "awaiting_payment", "charge_failed"];
/** Hồ sơ tổ chức còn hiệu lực do người này đại diện. */
const OPEN_ORGANIZATION_STATUSES = ["pending", "needs_info", "verified", "suspended"];

/** Bảng phụ xóa kèm khi xóa tài khoản (dữ liệu cá nhân, không phải lịch sử giao dịch). */
const PERSONAL_TABLES = [
  "notifications",
  "behavior_events",
  "campaign_follows",
  "campaign_post_likes",
  "organization_members",
  "user_bank_accounts",
  "step_up_codes",
  "email_verification_tokens",
  "password_reset_tokens",
];

export type DeletionCheck = { canDelete: boolean; blockers: string[] };

/**
 * Xóa tài khoản kiểu Kickstarter — "xóa nhưng không mất dấu":
 * - Người dùng tự xóa: ẩn danh hóa tại chỗ (giữ id cho sổ cái/bình luận/nhật ký), giải phóng email,
 *   xóa dữ liệu cá nhân phụ, thu hồi mọi phiên đăng nhập.
 * - Để lại `AccountTombstone` gồm mã băm email/Google/SĐT/số tài khoản: tài khoản bị khóa vì vi phạm
 *   không đăng ký lại được bằng các định danh đó; đăng ký lại bằng email của tài khoản thường thì
 *   mang theo số lần bỏ cam kết; định danh của tài khoản vi phạm xuất hiện lại → cảnh báo cho admin.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AccountTombstone)
    private readonly tombstoneRepo: Repository<AccountTombstone>,
    private readonly auditService: AuditService,
    @Optional()
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepo: Repository<RiskAlert> | null = null,
  ) {}

  /** Những việc phải xong trước khi tự xóa tài khoản (rỗng = xóa được). */
  async check(user: Pick<User, "id" | "role">, manager: EntityManager = this.dataSource.manager): Promise<DeletionCheck> {
    const blockers: string[] = [];
    if (user.role === UserRole.ADMIN) {
      blockers.push("Tài khoản quản trị không tự xóa được. Nhờ quản trị viên khác thu quyền quản trị trước.");
    }
    const count = async (sql: string, params: unknown[]) => Number((await manager.query(sql, params))[0]?.n ?? 0);
    const campaigns = await count(
      `SELECT COUNT(*) AS n FROM campaigns WHERE owner_id = ? AND status IN (${OPEN_CAMPAIGN_STATUSES.map(() => "?").join(",")})`,
      [user.id, ...OPEN_CAMPAIGN_STATUSES],
    );
    if (campaigns > 0) {
      blockers.push(
        `Bạn còn ${campaigns} chiến dịch đang chờ duyệt, đang gây quỹ hoặc đã gây quỹ thành công (còn nghĩa vụ báo cáo/giải ngân). Hãy hủy chiến dịch hoặc chờ quản trị viên đóng chiến dịch trước.`,
      );
    }
    const donations = await count(
      `SELECT COUNT(*) AS n FROM donations WHERE user_id = ? AND status IN (${OPEN_DONATION_STATUSES.map(() => "?").join(",")})`,
      [user.id, ...OPEN_DONATION_STATUSES],
    );
    if (donations > 0) {
      blockers.push(`Bạn còn ${donations} khoản cam kết/ủng hộ chưa tất toán. Hãy rút cam kết hoặc thanh toán trước khi xóa tài khoản.`);
    }
    const refunds = await count(`SELECT COUNT(*) AS n FROM refund_requests WHERE user_id = ? AND status = 'pending'`, [user.id]);
    if (refunds > 0) {
      blockers.push(`Bạn còn ${refunds} yêu cầu hoàn tiền đang chờ xử lý.`);
    }
    const organizations = await count(
      `SELECT COUNT(*) AS n FROM organizations WHERE representative_id = ? AND deleted_at IS NULL AND status IN (${OPEN_ORGANIZATION_STATUSES.map(() => "?").join(",")})`,
      [user.id, ...OPEN_ORGANIZATION_STATUSES],
    );
    if (organizations > 0) {
      blockers.push("Bạn đang là người đại diện của hồ sơ tổ chức. Hãy chuyển quyền đại diện hoặc liên hệ quản trị viên trước.");
    }
    return { canDelete: blockers.length === 0, blockers };
  }

  /** Người dùng tự xóa tài khoản (đã qua OTP ở controller). */
  async deleteSelf(user: User, reason?: string | null): Promise<void> {
    if (user.deletedAt) throw new ConflictException("Tài khoản đã bị xóa.");
    await this.dataSource.transaction(async (manager) => {
      // Khóa hàng để hai yêu cầu xóa đồng thời không chạy chồng.
      await manager.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
      const check = await this.check(user, manager);
      if (!check.canDelete) {
        throw new ConflictException(check.blockers.join(" "));
      }
      await this.tombstoneAndAnonymize(manager, user, "self", reason ?? null);
    });
    await this.auditService.record({
      userId: user.id,
      action: "user.self_delete",
      entity: "user",
      entityId: user.id,
      oldValues: { role: user.role, status: user.status },
      newValues: { deleted: true, reason: reason ?? null },
    });
  }

  /**
   * Quản trị viên xóa tài khoản đã bị khóa vì vi phạm nhưng có lịch sử (không xóa hẳn được):
   * ẩn danh hóa như tự xóa và đánh dấu tombstone là vi phạm → định danh cũ không đăng ký lại được.
   */
  async deleteBanned(user: User, admin: User, reason: string): Promise<void> {
    if (user.status !== UserStatus.BANNED) {
      throw new ConflictException("Chỉ xóa kiểu này với tài khoản đã bị khóa vì vi phạm.");
    }
    if (user.deletedAt) throw new ConflictException("Tài khoản đã bị xóa.");
    await this.dataSource.transaction((manager) => this.tombstoneAndAnonymize(manager, user, "admin", reason));
    await this.auditService.record({
      userId: admin.id,
      action: "user.delete.banned",
      entity: "user",
      entityId: user.id,
      oldValues: { role: user.role, status: user.status },
      newValues: { deleted: true, reason },
    });
  }

  private async tombstoneAndAnonymize(manager: EntityManager, user: User, by: "self" | "admin", reason: string | null): Promise<void> {
    const banks = await manager.find(UserBankAccount, { where: { userId: user.id } });
    const payoutRows: Array<{ n: string }> = await manager.query(
      "SELECT DISTINCT bank_account_number AS n FROM campaign_payout_accounts p JOIN campaigns c ON c.id = p.campaign_id WHERE c.owner_id = ?",
      [user.id],
    );
    const bankHashes = [...new Set([...banks.map((b) => b.bankAccountNumber), ...payoutRows.map((r) => r.n)].map((n) => hashIdentity("bank", n)).filter(Boolean))] as string[];
    const phoneHashes = [...new Set([user.phone, user.contactPhone].map((p) => hashIdentity("phone", p)).filter(Boolean))] as string[];
    const standing = await computePledgeStanding(manager.getRepository(Donation), user).catch(() => null);

    await manager.save(
      manager.create(AccountTombstone, {
        userId: user.id,
        emailHash: hashIdentity("email", user.email)!,
        googleHash: hashIdentity("google", user.googleId),
        phoneHashes,
        bankHashes,
        wasBanned: user.status === UserStatus.BANNED,
        banReason: user.status === UserStatus.BANNED ? (by === "admin" ? reason : "Tài khoản bị khóa trước khi xóa") : null,
        abandonedPledges: (standing?.abandoned ?? 0) + (user.inheritedAbandonedPledges ?? 0),
        role: user.role,
        deletedBy: by,
        reason: reason?.slice(0, 500) ?? null,
      }),
    );

    for (const table of PERSONAL_TABLES) {
      await manager.query(`DELETE FROM \`${table}\` WHERE \`user_id\` = ?`, [user.id]);
    }
    const now = new Date();
    const anonymized: Record<string, unknown> = {
      name: DELETED_USER_NAME,
      email: `deleted-${user.id}@deleted.gopmam.invalid`,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 10),
      googleId: null,
      avatar: null,
      bio: null,
      phone: null,
      organization: null,
      contactEmail: null,
      contactPhone: null,
      contactAddress: null,
      aiTrackingConsent: false,
      // Giữ BANNED để dấu khóa vẫn hiện với admin; tự xóa thì ngừng hoạt động.
      status: user.status === UserStatus.BANNED ? UserStatus.BANNED : UserStatus.INACTIVE,
      sessionsRevokedAt: now,
      deletedAt: now,
    };
    await manager.update(User, { id: user.id }, anonymized);
  }

  /**
   * Gọi trước khi tạo tài khoản mới (đăng ký thường hoặc Google): email/Google ID từng thuộc
   * tài khoản bị khóa vì vi phạm rồi bị xóa → từ chối đăng ký (chống lách lệnh cấm).
   */
  async assertCanRegister(identity: { email: string; googleId?: string | null }): Promise<void> {
    const emailHash = hashIdentity("email", identity.email);
    const googleHash = hashIdentity("google", identity.googleId);
    const where = [{ emailHash: emailHash!, wasBanned: true }, ...(googleHash ? [{ googleHash, wasBanned: true }] : [])];
    const banned = await this.tombstoneRepo.findOne({ where });
    if (banned) {
      await this.auditService.record({
        action: "auth.register.blocked_banned",
        entity: "user",
        entityId: banned.userId,
        newValues: { match: banned.emailHash === emailHash ? "email" : "google" },
      });
      throw new ForbiddenException(
        "Email hoặc tài khoản Google này thuộc một tài khoản đã bị khóa vì vi phạm quy định của Góp Mầm nên không thể đăng ký lại. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.",
      );
    }
  }

  /**
   * Sau khi tạo tài khoản mới: nếu email trùng một tài khoản đã tự xóa, mang số lần bỏ cam kết
   * sang (không "rửa" giới hạn cam kết bằng cách xóa rồi tạo lại) và ghi liên kết cho admin.
   */
  async inheritFromDeleted(newUser: User): Promise<void> {
    const emailHash = hashIdentity("email", newUser.email);
    const previous = await this.tombstoneRepo.findOne({ where: { emailHash: emailHash!, wasBanned: false }, order: { createdAt: "DESC" } });
    if (!previous) return;
    if (previous.abandonedPledges > 0) {
      await this.dataSource.getRepository(User).update({ id: newUser.id }, { inheritedAbandonedPledges: previous.abandonedPledges });
      newUser.inheritedAbandonedPledges = previous.abandonedPledges;
    }
    await this.tombstoneRepo.update({ id: previous.id }, { reusedBy: newUser.id });
    await this.auditService.record({
      userId: newUser.id,
      action: "auth.register.reused_email",
      entity: "user",
      entityId: newUser.id,
      newValues: { previousUserId: previous.userId, inheritedAbandonedPledges: previous.abandonedPledges },
    });
  }

  /**
   * Số tài khoản ngân hàng vừa lưu trùng với tài khoản đã bị khóa (còn hoặc đã xóa) → mở cảnh báo
   * rủi ro cho admin (không chặn: có thể là người thân dùng chung tài khoản).
   */
  async flagBannedBankReuse(user: Pick<User, "id" | "name" | "email">, bankAccountNumber: string): Promise<boolean> {
    if (!this.riskAlertRepo) return false;
    const bankHash = hashIdentity("bank", bankAccountNumber);
    if (!bankHash) return false;
    const tombstone = await this.tombstoneRepo
      .createQueryBuilder("t")
      .where("t.was_banned = 1")
      .andWhere("JSON_CONTAINS(t.bank_hashes, JSON_QUOTE(:hash))", { hash: bankHash })
      .getOne();
    const digits = bankAccountNumber.replace(/\D/g, "");
    const liveBanned: Array<{ id: string }> = await this.dataSource.query(
      "SELECT u.id FROM user_bank_accounts b JOIN users u ON u.id = b.user_id WHERE u.status = ? AND u.id <> ? AND REPLACE(REPLACE(b.bank_account_number, ' ', ''), '-', '') = ? LIMIT 1",
      [UserStatus.BANNED, user.id, digits],
    );
    const matchedUserId = tombstone?.userId ?? liveBanned[0]?.id;
    if (!matchedUserId) return false;

    const reasons = [
      {
        group: "ban_evasion",
        label: `Số tài khoản ngân hàng trùng với tài khoản đã bị khóa vì vi phạm${tombstone ? " (đã xóa)" : ""}`,
        weight: 1,
      },
    ];
    const existing = await this.riskAlertRepo.findOne({
      where: { entityType: RiskEntityType.USER, entityId: user.id, method: RiskMethod.RULE, status: In([RiskAlertStatus.OPEN]) },
    });
    if (existing) {
      if (!existing.reasons.some((r) => r.group === "ban_evasion")) existing.reasons = [...existing.reasons, ...reasons];
      existing.level = RiskAlertLevel.HIGH;
      existing.evidences = { ...existing.evidences, banned_bank_match: 1 };
      await this.riskAlertRepo.save(existing);
    } else {
      await this.riskAlertRepo.save(
        this.riskAlertRepo.create({
          entityType: RiskEntityType.USER,
          entityId: user.id,
          entityName: user.name || user.email,
          level: RiskAlertLevel.HIGH,
          score: 0.9,
          method: RiskMethod.RULE,
          reasons,
          evidences: { banned_bank_match: 1 },
        }),
      );
    }
    await this.auditService.record({
      action: "user.ban_evasion.suspected",
      entity: "user",
      entityId: user.id,
      newValues: { signal: "bank_account", matchedUserId },
    });
    this.logger.warn(`Nghi lách lệnh cấm: user ${user.id} dùng tài khoản ngân hàng của tài khoản bị khóa ${matchedUserId}`);
    return true;
  }
}
