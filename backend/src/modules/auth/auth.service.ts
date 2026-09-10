import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { User, UserRole, UserStatus } from "../users/entities/user.entity";
import { isUserLocked, UsersService } from "../users/users.service";
import { LoginDto, RegisterDto, TokenResponseDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new UnauthorizedException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? UserRole.USER,
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException("Account has been banned");
    }

    if (isUserLocked(user)) {
      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((new Date(user.lockedUntil!).getTime() - Date.now()) / 1000),
      );
      throw new ForbiddenException(
        `Account temporarily locked, try again in ${retryAfterSeconds}s`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.usersService.recordLoginFailure(user);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.usersService.recordLoginSuccess(user);
    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException("Account has been banned");
    }

    return this.generateTokens(user);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  private generateTokens(user: User): TokenResponseDto {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: "7d",
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
