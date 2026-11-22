import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { DonationsModule } from "../donations/donations.module";
import { WalletModule } from "../wallet/wallet.module";
import { Donation } from "../donations/entities/donation.entity";
import { MediaFile } from "../media/entities/media-file.entity";
import { AutoRefundService } from "./auto-refund.service";
import { RefundRequest } from "./entities/refund-request.entity";
import { AdminFinanceController, FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  // DonationsModule export "PaymentGateway" (dùng chung cổng thanh toán)
  imports: [TypeOrmModule.forFeature([RefundRequest, Donation, Campaign, MediaFile]), DonationsModule, WalletModule],
  controllers: [FinanceController, AdminFinanceController],
  providers: [FinanceService, AutoRefundService],
})
export class FinanceModule {}
