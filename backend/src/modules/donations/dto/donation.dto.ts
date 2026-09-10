import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDonationDto {
  @IsUUID()
  campaignId!: string;

  @IsNumber()
  @Min(20_000)
  amount!: number;

  @IsIn(["wallet", "payos"])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsString()
  @MaxLength(255)
  idempotencyKey!: string;
}

export class WebhookDonationDto {
  @IsUUID()
  donationId!: string;

  @IsIn(["completed", "failed"])
  status!: "completed" | "failed";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;
}
