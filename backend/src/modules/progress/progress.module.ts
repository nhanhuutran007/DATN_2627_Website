import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { MediaFile } from "../media/entities/media-file.entity";
import { MilestoneRevision } from "./entities/milestone-revision.entity";
import { MilestoneUpdateAttachment } from "./entities/milestone-update-attachment.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";
import { Milestone } from "./entities/milestone.entity";
import { MilestoneOverdueService } from "./milestone-overdue.service";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      MilestoneUpdate,
      MilestoneUpdateAttachment,
      MilestoneRevision,
      Campaign,
      Donation,
      MediaFile,
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService, MilestoneOverdueService],
  exports: [ProgressService],
})
export class ProgressModule {}