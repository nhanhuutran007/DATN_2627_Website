import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DemoWalletGateway } from "../../integrations/payment/payment.gateway";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { DonationsController } from "./donations.controller";
import { DonationsService } from "./donations.service";
import { Donation } from "./entities/donation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Donation, Campaign])],
  controllers: [DonationsController],
  providers: [
    DonationsService,
    {
      provide: "PaymentGateway",
      useFactory: () => new DemoWalletGateway(process.env.PAYMENT_WEBHOOK_SECRET),
    },
  ],
  exports: [DonationsService],
})
export class DonationsModule {}
