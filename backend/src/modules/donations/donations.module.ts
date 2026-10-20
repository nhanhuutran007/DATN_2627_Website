import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DemoWalletGateway } from "../../integrations/payment/payment.gateway";
import { SepayGateway, sepayConfigFromEnv } from "../../integrations/payment/sepay";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { CampaignLedgerController } from "./campaign-ledger.controller";
import { DonationsController } from "./donations.controller";
import { SepayIpnController } from "./sepay-ipn.controller";
import { DonationExpiryService } from "./donation-expiry.service";
import { DonationsService } from "./donations.service";
import { Donation } from "./entities/donation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Donation, Campaign, RewardTier])],
  controllers: [DonationsController, CampaignLedgerController, SepayIpnController],
  providers: [
    DonationsService,
    DonationExpiryService,
    {
      provide: "PaymentGateway",
      useFactory: () => new DemoWalletGateway(process.env.PAYMENT_WEBHOOK_SECRET),
    },
    {
      // null khi chưa có SEPAY_MERCHANT_ID/SEPAY_SECRET_KEY: ẩn kênh SePay.
      provide: "SepayGateway",
      useFactory: () => {
        const config = sepayConfigFromEnv();
        return config ? new SepayGateway(config) : null;
      },
    },
  ],
  exports: [DonationsService, "PaymentGateway"],
})
export class DonationsModule {}
