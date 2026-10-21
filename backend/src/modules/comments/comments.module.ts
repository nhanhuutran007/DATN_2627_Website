import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsModule } from "../campaigns/campaigns.module";
import { AdminCommentsController, CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { CampaignComment } from "./entities/campaign-comment.entity";
import { Report } from "../moderation/entities/report.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CampaignComment, Report]), CampaignsModule],
  controllers: [CommentsController, AdminCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
