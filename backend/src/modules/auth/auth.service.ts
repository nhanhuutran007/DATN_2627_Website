import { randomUUID } from "node:crypto";

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { LessThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { User, UserRole, UserStatus } from "../users/entities/user.entity";
import { isUserLocked, UsersService } from "../users/users.service";
import { LoginDto, RegisterDto, TokenResponseDto } from "./dto/auth.dto";
import { RevokedToken } from "./entities/revoked-token.entity";

/** Phần payload JWT dùng để thu hồi token (`jti`) và biết lúc nó tự hết hạn (`exp`). */
type TokenClaims = { sub?: string; jti?: string; iat?: number; exp?: number };

/**
 * JWT phát hành trước lần đổi/đặt lại mật khẩu gần nhất không còn hợp lệ.
 * `iat` tính bằng giây nên so với mốc đổi mật khẩu đã làm tròn xuống giây.
 */
export function issuedBeforePasswordChange(user: User, issuedAtSeconds?: number): boolean {
  if (!user.passwordChangedAt) {
    return false;
  }
  const changedAtSeconds = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
  return issuedAtSeconds === undefined || issuedAtSeconds < changedAtSeconds;
}

/** JWT bị vô hiệu do đổi/đặt lại mật khẩu hoặc "đăng xuất khỏi mọi thiết bị". */
export function issuedBeforeSessionCutoff(user: User, issuedAtSeconds?: number): boolean {
  if (issuedBeforePasswordChange(user, issuedAtSeconds)) {
    return true;
  }
  if (!user.sessionsRevokedAt) {
    return false;
  }
  const revokedAtSeconds = Math.floor(new Date(user.sessionsRevokedAt).getTime() / 1000);
  return issuedAtSeconds === undefined || issuedAtSeconds < revokedAtSeconds;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepo: Repository<RevokedToken>,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Chặn leo thang đặc quyền: tự đăng ký không bao giờ được là admin.
    if (dto.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin accounts cannot be self-registered");
    }

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

    await this.auditService.record({
      userId: user.id,
      action: "auth.register",
      entity: "user",
      entityId: user.id,
      newValues: { role: user.role },
    });
    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status === UserStatus.BANNED) {
      await this.recordLoginBlocked(user, "banned");
      throw new ForbiddenException("Account has been banned");
    }

    if (isUserLocked(user)) {
      await this.recordLoginBlocked(user, "locked");
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
      await this.auditService.record({
        userId: user.id,
        action: "auth.login.failed",
        entity: "user",
        entityId: user.id,
        newValues: { reason: "invalid-password" },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.usersService.recordLoginSuccess(user);
    await this.auditService.record({
      userId: user.id,
      action: "auth.login.success",
      entity: "user",
      entityId: user.id,
    });
    return this.generateTokens(user);
  }

  private async recordLoginBlocked(
    user: User,
    reason: "banned" | "locked",
  ): Promise<void> {
    await this.auditService.record({
      userId: user.id,
      action: "auth.login.blocked",
      entity: "user",
      entityId: user.id,
      newValues: { reason },
    });
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    let payload: { sub: string; iat?: number; jti?: string };
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

    if (issuedBeforeSessionCutoff(user, payload.iat) || (await this.isRevoked(payload.jti))) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.generateTokens(user);
  }

  async validateUser(userId: string, issuedAt?: number, jti?: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    if (issuedBeforeSessionCutoff(user, issuedAt)) {
      throw new UnauthorizedException("Session has been revoked");
    }
    if (await this.isRevoked(jti)) {
      throw new UnauthorizedException("Session has been logged out");
    }
    return user;
  }

  /**
   * Đăng xuất phiên hiện tại: thu hồi access token đang dùng và refresh token
   * đi kèm (nếu gửi lên và đúng của người này) tới khi chúng tự hết hạn.
   */
  async logout(user: User, accessToken: string | undefined, refreshToken?: string): Promise<void> {
    const revoked: RevokedToken[] = [];
    const access = accessToken ? this.jwtService.decode<TokenClaims | null>(accessToken) : null;
    const accessEntry = this.toRevokedEntry(user, access);
    if (accessEntry) revoked.push(accessEntry);

    if (refreshToken) {
      try {
        const refresh = this.jwtService.verify<TokenClaims>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET,
        });
        const refreshEntry = this.toRevokedEntry(user, refresh);
        if (refreshEntry) revoked.push(refreshEntry);
      } catch {
        // Refresh token sai/hết hạn thì vốn đã không dùng được, không cần thu hồi.
      }
    }

    // Dọn các dòng đã quá hạn (token tương ứng đã tự hết hiệu lực).
    await this.revokedTokenRepo.delete({ expiresAt: LessThan(new Date()) });
    if (revoked.length > 0) {
      await this.revokedTokenRepo.save(revoked);
    }
    await this.auditService.record({
      userId: user.id,
      action: "auth.logout",
      entity: "user",
      entityId: user.id,
      newValues: { revokedTokens: revoked.length },
    });
  }

  /** Vô hiệu mọi phiên của tài khoản, kể cả phiên đang gọi. */
  async logoutAll(user: User): Promise<void> {
    const revokedAt = await this.usersService.revokeAllSessions(user);
    await this.auditService.record({
      userId: user.id,
      action: "auth.logout_all",
      entity: "user",
      entityId: user.id,
      newValues: { sessionsRevokedAt: revokedAt.toISOString() },
    });
  }

  private toRevokedEntry(user: User, claims: TokenClaims | null): RevokedToken | null {
    // Token phát hành trước khi có `jti` không thu hồi riêng lẻ được; chúng tự hết hạn.
    if (!claims || claims.sub !== user.id || !claims.jti || !claims.exp) {
      return null;
    }
    return Object.assign(new RevokedToken(), {
      jti: claims.jti,
      userId: user.id,
      expiresAt: new Date(claims.exp * 1000),
    });
  }

  private async isRevoked(jti: string | undefined): Promise<boolean> {
    return jti ? this.revokedTokenRepo.existsBy({ jti }) : false;
  }

  /** Cấp cặp token mới, vd. sau khi đổi mật khẩu để phiên hiện tại tiếp tục. */
  issueTokens(user: User): TokenResponseDto {
    return this.generateTokens(user);
  }

  private generateTokens(user: User): TokenResponseDto {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Mỗi token có `jti` riêng để đăng xuất thu hồi được đúng phiên đó.
    const accessToken = this.jwtService.sign({ ...payload, jti: randomUUID() }, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refreshToken = this.jwtService.sign({ ...payload, jti: randomUUID() }, {
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
        emailVerified: Boolean(user.emailVerified),
        aiTrackingConsent: Boolean(user.aiTrackingConsent),
        aiConsentDecided: user.aiConsentUpdatedAt != null,
      },
    };
  }
}
