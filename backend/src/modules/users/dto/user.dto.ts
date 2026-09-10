import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

import { UserRole } from "../entities/user.entity";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  passwordHash!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
