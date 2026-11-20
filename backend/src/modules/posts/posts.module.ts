import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CampaignPostLike } from "./entities/campaign-post-like.entity";
import { CampaignPost } from "./entities/campaign-post.entity";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [TypeOrmModule.forFeature([CampaignPost, CampaignPostLike, Campaign, Donation]), OrganizationsModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
