import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export const MAX_FAQS_PER_CAMPAIGN = 30;

export class CreateCampaignFaqDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Câu hỏi cần ít nhất 5 ký tự." })
  @MaxLength(300, { message: "Câu hỏi tối đa 300 ký tự." })
  question!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Câu trả lời cần ít nhất 5 ký tự." })
  @MaxLength(3000, { message: "Câu trả lời tối đa 3000 ký tự." })
  answer!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateCampaignFaqDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Câu hỏi cần ít nhất 5 ký tự." })
  @MaxLength(300, { message: "Câu hỏi tối đa 300 ký tự." })
  question?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Câu trả lời cần ít nhất 5 ký tự." })
  @MaxLength(3000, { message: "Câu trả lời tối đa 3000 ký tự." })
  answer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export type CampaignFaqView = {
  id: string;
  campaignId: string;
  question: string;
  answer: string;
  sortOrder: number;
  updatedAt: Date;
};
