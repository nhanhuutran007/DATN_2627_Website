import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CategoriesModule } from "../categories/categories.module";
import { Donation } from "../donations/entities/donation.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { SupportModule } from "../support/support.module";
import { CampaignExpiryService } from "./campaign-expiry.service";
import { CampaignScreeningController } from "./campaign-screening.controller";
import { CampaignScreeningService } from "./campaign-screening.service";
import { CampaignStatsController } from "./campaign-stats.controller";
import { CampaignStatsService } from "./campaign-stats.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { CampaignScreening } from "./entities/campaign-screening.entity";
import { CampaignViewDaily } from "./entities/campaign-view-daily.entity";
import { Campaign } from "./entities/campaign.entity";
import { Milestone } from "./../progress/entities/milestone.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Milestone, CampaignViewDaily, Donation, CampaignFollow, CampaignScreening]), CategoriesModule, OrganizationsModule, SupportModule],
  controllers: [CampaignsController, CampaignStatsController, CampaignScreeningController],
  providers: [CampaignsService, CampaignExpiryService, CampaignStatsService, CampaignScreeningService],
  exports: [CampaignsService, CampaignScreeningService],
})
export class CampaignsModule {}