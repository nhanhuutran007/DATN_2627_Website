import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Post, UseGuards } from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { User } from "../users/entities/user.entity";
import { AuthService } from "./auth.service";
import { GetCurrentUser } from "./decorators/get-current-user.decorator";
import {
  AuthProvidersDto,
  ChangePasswordDto,
  CheckEmailDto,
  CheckEmailResponseDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  RequestStepUpDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyStepUpDto,
} from "./dto/auth.dto";
import { EmailVerificationService } from "./email-verification.service";
import { StepUpPurpose } from "./entities/step-up-code.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RequireStepUp, StepUpGuard } from "./guards/step-up.guard";
import { PasswordResetService } from "./password-reset.service";
import { StepUpService } from "./step-up.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly stepUpService: StepUpService,
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

  /** Phương thức đăng nhập đang bật (frontend biết nút Google đã dùng được chưa). */
  @Get("providers")
  providers(): AuthProvidersDto {
    return { googleClientId: this.authService.googleClientId() };
  }

  /** Bước 1 đăng nhập: email đã có tài khoản chưa (→ mật khẩu hay → đăng ký). */
  @Post("check-email")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth-check-email" })
  checkEmail(@Body() dto: CheckEmailDto): Promise<CheckEmailResponseDto> {
    return this.authService.checkEmailExists(dto.email);
  }

  @Post("google")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth-google" })
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.credential);
  }

  @Post("refresh")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000, keyPrefix: "auth-refresh" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /** Đăng xuất phiên hiện tại: access token đang dùng + refresh token gửi kèm bị thu hồi. */
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetCurrentUser() user: User,
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    await this.authService.logout(user, accessToken, dto.refreshToken);
  }

  /** Đăng xuất khỏi mọi thiết bị (mọi token đã phát hành, kể cả phiên này). */
  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: "auth-logout-all" })
  async logoutAll(@GetCurrentUser() user: User): Promise<void> {
    await this.authService.logoutAll(user);
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

  /** Gửi mã OTP qua email trước một thao tác nhạy cảm. */
  @Post("step-up/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: "auth-step-up-request" })
  requestStepUp(@GetCurrentUser() user: User, @Body() dto: RequestStepUpDto) {
    return this.stepUpService.requestCode(user, dto.purpose);
  }

  /** Đổi mã OTP đúng lấy step-up token ngắn hạn (gửi lại ở header `X-Step-Up-Token`). */
  @Post("step-up/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60_000, keyPrefix: "auth-step-up-verify" })
  verifyStepUp(@GetCurrentUser() user: User, @Body() dto: VerifyStepUpDto) {
    return this.stepUpService.verifyCode(user, dto.purpose, dto.code);
  }

  /** Đổi mật khẩu khi đã đăng nhập; trả cặp token mới vì token cũ bị vô hiệu. */
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard, StepUpGuard)
  @RequireStepUp(StepUpPurpose.CHANGE_PASSWORD)
  @RateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: "auth-change-password" })
  async changePassword(@GetCurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    await this.passwordResetService.changePassword(user, dto.currentPassword, dto.newPassword);
    return this.authService.issueTokens(user);
  }
}
