import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

import { UserRole } from "../../users/entities/user.entity";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
