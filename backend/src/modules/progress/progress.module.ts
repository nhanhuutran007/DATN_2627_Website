import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";
import { Milestone } from "./entities/milestone.entity";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneUpdate,
      Campaign,
      Donation,
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}