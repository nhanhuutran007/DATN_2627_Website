import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from "./dto/user.dto";
import { User } from "./entities/user.entity";

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
}
