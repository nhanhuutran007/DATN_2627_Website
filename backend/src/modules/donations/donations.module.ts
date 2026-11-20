import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DemoWalletGateway } from "../../integrations/payment/payment.gateway";
import { SepayGateway, sepayConfigFromEnv } from "../../integrations/payment/sepay";
import { StripeGateway, stripeConfigFromEnv } from "../../integrations/payment/stripe";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { RefundRequest } from "../finance/entities/refund-request.entity";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { CampaignLedgerController } from "./campaign-ledger.controller";
import { DonationsController } from "./donations.controller";
import { SepayIpnController } from "./sepay-ipn.controller";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { DonationExpiryService } from "./donation-expiry.service";
import { DonationsService } from "./donations.service";
import { Donation } from "./entities/donation.entity";
import { RewardRecipient } from "./entities/reward-recipient.entity";
import { PledgeSettlementService } from "./pledge-settlement.service";

@Module({
  imports: [TypeOrmModule.forFeature([Donation, Campaign, RewardTier, RewardRecipient, RefundRequest])],
  controllers: [DonationsController, CampaignLedgerController, SepayIpnController, StripeWebhookController],
  providers: [
    DonationsService,
    DonationExpiryService,
    PledgeSettlementService,
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
    {
      // null khi chưa có STRIPE_SECRET_KEY: ẩn kênh thẻ.
      provide: "StripeGateway",
      useFactory: () => {
        const config = stripeConfigFromEnv();
        return config ? new StripeGateway(config) : null;
      },
    },
  ],
  exports: [DonationsService, PledgeSettlementService, "PaymentGateway", "StripeGateway"],
})
export class DonationsModule {}
