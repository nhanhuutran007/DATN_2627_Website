import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { CategoriesModule } from "../categories/categories.module";
import { MediaFile } from "../media/entities/media-file.entity";
import { User } from "../users/entities/user.entity";
import { OrganizationMember } from "./entities/organization-member.entity";
import { Organization } from "./entities/organization.entity";
import { OrganizationAccessService } from "./organization-access.service";
import { OrganizationMembersController } from "./organization-members.controller";
import { OrganizationMembersService } from "./organization-members.service";
import { AdminOrganizationsController, OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationMember, Campaign, MediaFile, User]), CategoriesModule],
  controllers: [OrganizationsController, AdminOrganizationsController, OrganizationMembersController],
  providers: [OrganizationsService, OrganizationMembersService, OrganizationAccessService],
  exports: [OrganizationsService, OrganizationAccessService],
})
export class OrganizationsModule {}
