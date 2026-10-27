import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { CategoriesModule } from "../categories/categories.module";
import { Organization } from "./entities/organization.entity";
import { AdminOrganizationsController, OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Campaign]), CategoriesModule],
  controllers: [OrganizationsController, AdminOrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
