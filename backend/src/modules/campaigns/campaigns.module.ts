import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignExpiryService } from "./campaign-expiry.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { Campaign } from "./entities/campaign.entity";
import { Milestone } from "./../progress/entities/milestone.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Milestone])],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignExpiryService],
  exports: [CampaignsService],
})
export class CampaignsModule {}