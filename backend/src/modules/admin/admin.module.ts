import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiModule } from "../ai/ai.module";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { User } from "../users/entities/user.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { RiskAlert } from "./entities/risk-alert.entity";
import { RiskAlertService } from "./risk-alert.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Campaign, Donation, RiskAlert]),
    AiModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RiskAlertService],
  exports: [AdminService, RiskAlertService],
})
export class AdminModule {}