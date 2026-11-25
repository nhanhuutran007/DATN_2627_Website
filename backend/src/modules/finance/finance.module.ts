import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignDisbursement } from "../campaigns/entities/campaign-disbursement.entity";
import { CampaignPayoutAccount } from "../campaigns/entities/campaign-payout-account.entity";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { DonationsModule } from "../donations/donations.module";
import { WalletModule } from "../wallet/wallet.module";
import { Donation } from "../donations/entities/donation.entity";
import { MediaFile } from "../media/entities/media-file.entity";
import { AutoRefundService } from "./auto-refund.service";
import { AdminDisbursementsController } from "./disbursements.controller";
import { DisbursementsService } from "./disbursements.service";
import { RefundRequest } from "./entities/refund-request.entity";
import { AdminFinanceController, FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  // DonationsModule export "PaymentGateway" (dùng chung cổng thanh toán)
  imports: [
    TypeOrmModule.forFeature([RefundRequest, Donation, Campaign, MediaFile, CampaignDisbursement, CampaignPayoutAccount]),
    DonationsModule,
    WalletModule,
  ],
  controllers: [FinanceController, AdminFinanceController, AdminDisbursementsController],
  providers: [FinanceService, AutoRefundService, DisbursementsService],
})
export class FinanceModule {}
