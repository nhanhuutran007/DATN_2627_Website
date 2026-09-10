import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.role = dto.role;
    return this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.userRepo.remove(user);
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
