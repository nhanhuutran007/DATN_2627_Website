import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { BehaviorEvent } from "../ai/entities/behavior-event.entity";
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from "./dto/user.dto";
import { User, UserRole, UserStatus } from "./entities/user.entity";

/**
 * Các cột khóa ngoại (không cascade) trỏ về users mang lịch sử cần giữ: còn bản ghi
 * nào thì không được xóa tài khoản. Tên bảng/cột cố định trong mã, không lấy từ input.
 */
export const USER_HISTORY_REFERENCES: ReadonlyArray<{ table: string; column: string; label: string }> = [
  { table: "campaigns", column: "owner_id", label: "chiến dịch" },
  { table: "donations", column: "user_id", label: "giao dịch ủng hộ" },
  { table: "refund_requests", column: "user_id", label: "yêu cầu hoàn tiền" },
  { table: "campaign_comments", column: "user_id", label: "bình luận" },
  { table: "reports", column: "reporter_id", label: "báo cáo vi phạm" },
  { table: "organizations", column: "representative_id", label: "hồ sơ tổ chức" },
  { table: "media_files", column: "owner_id", label: "ảnh tải lên" },
  { table: "reports", column: "resolved_by", label: "thao tác kiểm duyệt" },
  { table: "risk_alerts", column: "resolved_by", label: "thao tác kiểm duyệt" },
  { table: "campaign_comments", column: "hidden_by", label: "thao tác kiểm duyệt" },
  { table: "refund_requests", column: "reviewed_by", label: "thao tác kiểm duyệt" },
  { table: "organizations", column: "reviewed_by", label: "thao tác kiểm duyệt" },
  { table: "milestone_revisions", column: "changed_by", label: "lịch sử chỉnh sửa kế hoạch" },
];

/** Bảng phụ (thông báo, hành vi cho gợi ý AI) xóa kèm tài khoản. */
export const USER_DISPOSABLE_TABLES: ReadonlyArray<string> = ["notifications", "behavior_events"];

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

export type AiConsentResult = {
  aiTrackingConsent: boolean;
  aiConsentUpdatedAt: Date;
  /** Số sự kiện hành vi đã xóa khi rút lại đồng ý. */
  deletedEventCount: number;
};

export function isUserLocked(user: User, now = new Date()): boolean {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > now.getTime());
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  async update(id: string, dto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const current = user as unknown as Record<string, unknown>;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(dto)) {
      oldValues[field] = truncateForAudit(current[field]);
      newValues[field] = truncateForAudit(value);
    }

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    await this.auditService.record({
      userId: currentUser.id,
      action: "user.update",
      entity: "user",
      entityId: saved.id,
      oldValues,
      newValues,
    });
    return saved;
  }

  async updateRole(id: string, dto: UpdateRoleDto, currentUser: User): Promise<User> {
    // Không tự đổi vai trò: tránh admin tự hạ quyền (mất admin cuối cùng) hay tự nâng.
    // Vì người thao tác luôn là admin khác, hệ thống luôn còn ít nhất một admin.
    if (id === currentUser.id) {
      throw new ForbiddenException("Không thể tự đổi vai trò của chính mình.");
    }
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.role === dto.role) {
      return user;
    }
    if (dto.role === UserRole.ADMIN && user.status !== UserStatus.ACTIVE) {
      throw new ConflictException("Chỉ cấp quyền quản trị cho tài khoản đang hoạt động.");
    }

    const previousRole = user.role;
    user.role = dto.role;
    const saved = await this.userRepo.save(user);
    await this.auditService.record({
      userId: currentUser.id,
      action: "user.role.update",
      entity: "user",
      entityId: saved.id,
      oldValues: { role: previousRole },
      newValues: { role: saved.role },
    });
    return saved;
  }

  /**
   * Xóa hẳn tài khoản — chỉ cho tài khoản chưa để lại lịch sử (vd. đăng ký nhầm, spam
   * chưa hoạt động). Tài khoản đã có giao dịch/nội dung/thao tác kiểm duyệt phải khóa
   * thay vì xóa để giữ sổ cái và nhật ký kiểm toán (khóa ngoại cũng không cho xóa).
   */
  async remove(id: string, currentUser: User): Promise<void> {
    if (id === currentUser.id) {
      throw new ForbiddenException("Không thể tự xóa tài khoản của chính mình.");
    }
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.role === UserRole.ADMIN) {
      throw new ConflictException("Thu quyền quản trị của tài khoản này trước khi xóa.");
    }

    const snapshot = { email: user.email, role: user.role, status: user.status };
    await this.userRepo.manager.transaction(async (manager) => {
      const blockers: string[] = [];
      for (const ref of USER_HISTORY_REFERENCES) {
        const rows: Array<{ n: number | string }> = await manager.query(
          `SELECT COUNT(*) AS n FROM \`${ref.table}\` WHERE \`${ref.column}\` = ?`,
          [id],
        );
        if (Number(rows[0]?.n ?? 0) > 0 && !blockers.includes(ref.label)) {
          blockers.push(ref.label);
        }
      }
      if (blockers.length > 0) {
        throw new ConflictException(
          `Không xóa được: tài khoản đã có ${blockers.join(", ")}. Hãy khóa tài khoản thay vì xóa để giữ lịch sử.`,
        );
      }
      // Dữ liệu phụ không phải lịch sử, khóa ngoại không cascade: dọn trước khi xóa.
      for (const table of USER_DISPOSABLE_TABLES) {
        await manager.query(`DELETE FROM \`${table}\` WHERE \`user_id\` = ?`, [id]);
      }
      await manager.delete(User, { id });
    });
    await this.auditService.record({
      userId: currentUser.id,
      action: "user.delete",
      entity: "user",
      entityId: id,
      oldValues: snapshot,
    });
  }

  /**
   * Bật/tắt đồng ý ghi nhận hành vi cho gợi ý AI. Rút lại đồng ý thì xóa luôn
   * lịch sử hành vi đã ghi (cùng transaction) để không còn dùng cho cá nhân hóa.
   */
  async updateAiConsent(user: User, consent: boolean): Promise<AiConsentResult> {
    const previous = Boolean(user.aiTrackingConsent);
    const now = new Date();

    const deletedEventCount = await this.userRepo.manager.transaction(async (manager) => {
      await manager.update(User, { id: user.id }, {
        aiTrackingConsent: consent,
        aiConsentUpdatedAt: now,
      });
      if (consent) return 0;
      const result = await manager.delete(BehaviorEvent, { userId: user.id });
      return result.affected ?? 0;
    });

    user.aiTrackingConsent = consent;
    user.aiConsentUpdatedAt = now;
    await this.auditService.record({
      userId: user.id,
      action: "user.ai_consent",
      entity: "user",
      entityId: user.id,
      oldValues: { aiTrackingConsent: previous },
      newValues: { aiTrackingConsent: consent, deletedEventCount },
    });
    return { aiTrackingConsent: consent, aiConsentUpdatedAt: now, deletedEventCount };
  }

  async recordLoginFailure(user: User): Promise<User> {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000);
      user.failedLoginCount = 0;
    }
    return this.userRepo.save(user);
  }

  /** Đặt mật khẩu mới, gỡ khóa đăng nhập và vô hiệu mọi JWT đã phát hành. */
  async setPassword(user: User, passwordHash: string): Promise<User> {
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    return this.userRepo.save(user);
  }

  async markEmailVerified(user: User): Promise<User> {
    user.emailVerified = true;
    return this.userRepo.save(user);
  }

  /** Vô hiệu mọi JWT đã phát hành cho tài khoản ("đăng xuất khỏi mọi thiết bị"). */
  async revokeAllSessions(user: User): Promise<Date> {
    const now = new Date();
    await this.userRepo.update({ id: user.id }, { sessionsRevokedAt: now });
    user.sessionsRevokedAt = now;
    return now;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOneBy({ googleId });
  }

  /** Liên kết tài khoản sẵn có với Google; email Google đã xác minh nên đánh dấu luôn email. */
  async linkGoogleAccount(user: User, googleId: string): Promise<User> {
    user.googleId = googleId;
    user.emailVerified = true;
    return this.userRepo.save(user);
  }

  /**
   * Tài khoản mới tạo qua Google. `passwordHash` là hash của chuỗi ngẫu nhiên không ai biết:
   * không đăng nhập bằng mật khẩu được cho tới khi người dùng tự đặt qua "Quên mật khẩu".
   */
  async createFromGoogle(input: { name: string; email: string; googleId: string; passwordHash: string }): Promise<User> {
    const user = this.userRepo.create({
      name: input.name,
      email: input.email,
      googleId: input.googleId,
      passwordHash: input.passwordHash,
      role: UserRole.USER,
      emailVerified: true,
    });
    return this.userRepo.save(user);
  }

  async recordLoginSuccess(user: User): Promise<User> {
    if (user.failedLoginCount || user.lockedUntil) {
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      return this.userRepo.save(user);
    }
    return user;
  }
}
