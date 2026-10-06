import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiModule } from "../ai/ai.module";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { MilestoneUpdate } from "../progress/entities/milestone-update.entity";
import { Milestone } from "../progress/entities/milestone.entity";
import { User } from "../users/entities/user.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { ContentService } from "./content.service";
import { ExportService } from "./export.service";
import { RiskAlert } from "./entities/risk-alert.entity";
import { RiskAlertService } from "./risk-alert.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Campaign, Donation, RiskAlert, Milestone, MilestoneUpdate]),
    AiModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RiskAlertService, ContentService, ExportService],
  exports: [AdminService, RiskAlertService],
})
export class AdminModule {}