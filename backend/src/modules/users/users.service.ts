import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from "./dto/user.dto";
import { User } from "./entities/user.entity";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

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

  async recordLoginFailure(user: User): Promise<User> {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000);
      user.failedLoginCount = 0;
    }
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
