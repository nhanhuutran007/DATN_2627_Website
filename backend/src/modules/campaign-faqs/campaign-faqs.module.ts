import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaignsModule } from "../campaigns/campaigns.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CampaignFaqsController } from "./campaign-faqs.controller";
import { CampaignFaqsService } from "./campaign-faqs.service";
import { CampaignFaq } from "./entities/campaign-faq.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CampaignFaq]), CampaignsModule, OrganizationsModule],
  controllers: [CampaignFaqsController],
  providers: [CampaignFaqsService],
})
export class CampaignFaqsModule {}
