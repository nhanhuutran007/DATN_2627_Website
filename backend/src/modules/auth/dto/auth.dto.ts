import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from "class-validator";

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

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
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

  // bcrypt chỉ dùng 72 byte đầu, nên chặn mật khẩu dài hơn để tránh hiểu nhầm.
  @IsString()
  @MinLength(8, { message: "Mật khẩu mới cần ít nhất 8 ký tự." })
  @MaxLength(72, { message: "Mật khẩu mới tối đa 72 ký tự." })
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
  @MinLength(8, { message: "Mật khẩu mới cần ít nhất 8 ký tự." })
  @MaxLength(72, { message: "Mật khẩu mới tối đa 72 ký tự." })
  newPassword!: string;
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
