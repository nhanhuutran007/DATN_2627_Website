import { IsIn, IsOptional } from "class-validator";

export class UpdateAutomationSettingsDto {
  @IsOptional()
  @IsIn(["manual_all", "auto_low_risk"], { message: "Chế độ duyệt không hợp lệ." })
  campaignReviewMode?: "manual_all" | "auto_low_risk";
}
