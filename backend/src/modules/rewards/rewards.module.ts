import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsModule } from "../campaigns/campaigns.module";
import { Donation } from "../donations/entities/donation.entity";
import { RewardTier } from "./entities/reward-tier.entity";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";

@Module({
  imports: [TypeOrmModule.forFeature([RewardTier, Donation]), CampaignsModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
