import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CategoriesModule } from "../categories/categories.module";
import { Donation } from "../donations/entities/donation.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { CampaignExpiryService } from "./campaign-expiry.service";
import { CampaignStatsController } from "./campaign-stats.controller";
import { CampaignStatsService } from "./campaign-stats.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { CampaignViewDaily } from "./entities/campaign-view-daily.entity";
import { Campaign } from "./entities/campaign.entity";
import { Milestone } from "./../progress/entities/milestone.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Milestone, CampaignViewDaily, Donation, CampaignFollow]), CategoriesModule],
  controllers: [CampaignsController, CampaignStatsController],
  providers: [CampaignsService, CampaignExpiryService, CampaignStatsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}