import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CategoriesModule } from "../categories/categories.module";
import { Donation } from "../donations/entities/donation.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { SupportModule } from "../support/support.module";
import { CampaignExpiryService } from "./campaign-expiry.service";
import { CampaignPayoutController, MyPayoutAccountsController } from "./campaign-payout.controller";
import { CampaignPayoutService } from "./campaign-payout.service";
import { CampaignScreeningController } from "./campaign-screening.controller";
import { CampaignScreeningService } from "./campaign-screening.service";
import { CampaignStatsController } from "./campaign-stats.controller";
import { CampaignStatsService } from "./campaign-stats.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { CampaignDisbursement } from "./entities/campaign-disbursement.entity";
import { CampaignPayoutAccount } from "./entities/campaign-payout-account.entity";
import { CampaignScreening } from "./entities/campaign-screening.entity";
import { CampaignViewDaily } from "./entities/campaign-view-daily.entity";
import { Campaign } from "./entities/campaign.entity";
import { UserBankAccount } from "../users/entities/user-bank-account.entity";
import { Milestone } from "./../progress/entities/milestone.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Milestone, CampaignViewDaily, Donation, CampaignFollow, CampaignScreening, CampaignPayoutAccount, CampaignDisbursement, UserBankAccount]),
    CategoriesModule,
    OrganizationsModule,
    SupportModule,
  ],
  controllers: [MyPayoutAccountsController, CampaignPayoutController, CampaignsController, CampaignStatsController, CampaignScreeningController],
  providers: [CampaignsService, CampaignPayoutService, CampaignExpiryService, CampaignStatsService, CampaignScreeningService],
  exports: [CampaignsService, CampaignScreeningService],
})
export class CampaignsModule {}
