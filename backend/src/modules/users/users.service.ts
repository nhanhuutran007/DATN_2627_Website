import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { BehaviorEvent } from "../ai/entities/behavior-event.entity";
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from "./dto/user.dto";
import { User } from "./entities/user.entity";

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
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
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

  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const snapshot = { email: user.email, role: user.role, status: user.status };
    await this.userRepo.remove(user);
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

  async recordLoginSuccess(user: User): Promise<User> {
    if (user.failedLoginCount || user.lockedUntil) {
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      return this.userRepo.save(user);
    }
    return user;
  }
}
