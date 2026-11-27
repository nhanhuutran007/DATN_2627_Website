import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiModule } from "../ai/ai.module";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { DonationsModule } from "../donations/donations.module";
import { Donation } from "../donations/entities/donation.entity";
import { MilestoneUpdate } from "../progress/entities/milestone-update.entity";
import { Milestone } from "../progress/entities/milestone.entity";
import { User } from "../users/entities/user.entity";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { BackupService } from "./backup.service";
import { ContentService } from "./content.service";
import { ExportService } from "./export.service";
import { RiskAlert } from "./entities/risk-alert.entity";
import { PledgeIntegrityService } from "./pledge-integrity.service";
import { RiskAlertService } from "./risk-alert.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Campaign, Donation, RiskAlert, Milestone, MilestoneUpdate]),
    AiModule,
    DonationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RiskAlertService, PledgeIntegrityService, ContentService, ExportService, BackupService],
  exports: [AdminService, RiskAlertService],
})
export class AdminModule {}