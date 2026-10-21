import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import { IsStrongPassword } from "../../../common/validators/is-strong-password";
import { UserRole } from "../../users/entities/user.entity";
import { StepUpPurpose } from "../entities/step-up-code.entity";

export class RegisterDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: "Họ tên cần ít nhất 2 ký tự." })
  @MaxLength(100, { message: "Họ tên tối đa 100 ký tự." })
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  /** Chỉ cho phép tự chọn vai trò không đặc quyền; admin phải do quản trị cấp. */
  @IsOptional()
  @IsIn([UserRole.USER, UserRole.CAMPAIGN_OWNER])
  role?: UserRole;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class GoogleLoginDto {
  /** Google ID token (JWT) do Google Identity Services trả về ở trình duyệt. */
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  credential!: string;
}

export class AuthProvidersDto {
  /** Client ID công khai của Google; null khi máy chủ chưa cấu hình đăng nhập Google. */
  googleClientId!: string | null;
}

export class CheckEmailDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: "Email không hợp lệ." })
  @MaxLength(255, { message: "Email không hợp lệ." })
  email!: string;
}

export class CheckEmailResponseDto {
  /** true: chuyển sang bước nhập mật khẩu; false: chuyển sang form đăng ký. */
  exists!: boolean;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  /** Refresh token của phiên này, để thu hồi cùng access token đang dùng. */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: "Email không hợp lệ." })
  @MaxLength(255, { message: "Email không hợp lệ." })
  email!: string;
}

export class ResetPasswordDto {
  /** Token base64url 32 byte gửi trong link email. */
  @IsString()
  @Length(43, 43, { message: "Liên kết đặt lại mật khẩu không hợp lệ." })
  token!: string;

  // Cùng chính sách với đăng ký (gồm giới hạn 72 ký tự của bcrypt).
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}

export class VerifyEmailDto {
  /** Token base64url 32 byte gửi trong link email. */
  @IsString()
  @Length(43, 43, { message: "Liên kết xác minh không hợp lệ." })
  token!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: "Vui lòng nhập mật khẩu hiện tại." })
  @MaxLength(128, { message: "Mật khẩu hiện tại không hợp lệ." })
  currentPassword!: string;

  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}

export class RequestStepUpDto {
  @IsEnum(StepUpPurpose, { message: "Thao tác cần xác minh không hợp lệ." })
  purpose!: StepUpPurpose;
}

export class VerifyStepUpDto extends RequestStepUpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "Mã xác minh gồm 6 chữ số." })
  code!: string;
}

export class MessageResponseDto {
  message!: string;
}

export class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
    aiTrackingConsent: boolean;
    /** false = chưa từng chọn → frontend hiển thị lời mời đồng ý. */
    aiConsentDecided: boolean;
  };
}
