import { IsBoolean, IsObject, IsOptional } from "class-validator";

/** Chỉ cần gửi phần muốn đổi; tên loại và kiểu giá trị được kiểm tra ở `EmailSettingsService`. */
export class UpdateEmailSettingsDto {
  @IsOptional()
  @IsBoolean({ message: "enabled phải là true hoặc false." })
  enabled?: boolean;

  @IsOptional()
  @IsObject({ message: "categories phải là đối tượng { loại: true|false }." })
  categories?: Record<string, boolean>;
}
