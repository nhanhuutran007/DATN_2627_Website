import { Body, Controller, HttpCode, HttpStatus, Ip, Post, UseGuards } from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { User } from "../users/entities/user.entity";
import { AuthService } from "./auth.service";
import { GetCurrentUser } from "./decorators/get-current-user.decorator";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth.dto";
import { EmailVerificationService } from "./email-verification.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PasswordResetService } from "./password-reset.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post("register")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, windowMs: 60_000, keyPrefix: "auth-register" })
  async register(@Body() dto: RegisterDto) {
    const session = await this.authService.register(dto);
    // Gửi nền để phản hồi đăng ký không phải chờ SMTP; lỗi chỉ được ghi log.
    void this.emailVerificationService.sendVerificationForUserId(session.user.id);
    return session;
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60_000, keyPrefix: "auth-verify-email" })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verify(dto.token);
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 3, windowMs: 15 * 60_000, keyPrefix: "auth-resend-verification" })
  resendVerification(@GetCurrentUser() user: User) {
    return this.emailVerificationService.resend(user);
  }

  @Post("login")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60_000, keyPrefix: "auth-login" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth-refresh" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: "auth-forgot-password" })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    return this.passwordResetService.requestReset(dto.email, ip);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60_000, keyPrefix: "auth-reset-password" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  /** Đổi mật khẩu khi đã đăng nhập; trả cặp token mới vì token cũ bị vô hiệu. */
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: "auth-change-password" })
  async changePassword(@GetCurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.passwordResetService.changePassword(user, dto.currentPassword, dto.newPassword);
    return this.authService.issueTokens(user);
  }
}
