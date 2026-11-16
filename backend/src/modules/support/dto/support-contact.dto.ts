import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

/**
 * Thông tin liên hệ hỗ trợ của Góp Mầm (admin chỉnh). Mọi trường có thể để trống;
 * chuỗi rỗng nghĩa là không hiển thị mục đó.
 */
export class UpdateSupportContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Email hỗ trợ không hợp lệ." })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^\+?[0-9 .-]{8,20}$/, { message: "Số điện thoại hỗ trợ không hợp lệ." })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workingHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^$|^https:\/\/\S+$/, { message: "Đường dẫn Facebook/Zalo phải bắt đầu bằng https://" })
  socialUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export type SupportContact = {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  socialUrl: string;
  note: string;
  updatedAt: string | null;
};
