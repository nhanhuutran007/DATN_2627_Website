import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsModule } from "../campaigns/campaigns.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { Donation } from "../donations/entities/donation.entity";
import { RewardRecipient } from "../donations/entities/reward-recipient.entity";
import { RewardTier } from "./entities/reward-tier.entity";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";

@Module({
  imports: [TypeOrmModule.forFeature([RewardTier, Donation, RewardRecipient]), CampaignsModule, OrganizationsModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
