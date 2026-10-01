import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsModule } from "../campaigns/campaigns.module";
import { CommentsModule } from "../comments/comments.module";
import { AdminReportsController } from "./admin-reports.controller";
import { Report } from "./entities/report.entity";
import { ModerationService } from "./moderation.service";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Report]), CampaignsModule, CommentsModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
