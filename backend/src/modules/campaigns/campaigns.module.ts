import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Donation } from "../donations/entities/donation.entity";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { Campaign } from "./entities/campaign.entity";
import { Milestone } from "./entities/milestone.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Milestone, MilestoneUpdate, Donation])],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}