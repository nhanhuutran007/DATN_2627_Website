import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { DonationsModule } from "../donations/donations.module";
import { Donation } from "../donations/entities/donation.entity";
import { RefundRequest } from "./entities/refund-request.entity";
import { AdminFinanceController, FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  // DonationsModule export "PaymentGateway" (dùng chung cổng thanh toán)
  imports: [TypeOrmModule.forFeature([RefundRequest, Donation, Campaign]), DonationsModule],
  controllers: [FinanceController, AdminFinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
