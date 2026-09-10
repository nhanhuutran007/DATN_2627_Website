import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { Campaign } from "./entities/campaign.entity";
import { Milestone } from "./../progress/entities/milestone.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Milestone])],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}