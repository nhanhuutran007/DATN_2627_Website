import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Campaign } from "../campaigns/entities/campaign.entity";
import { AdminCategoriesController, CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { Category } from "./entities/category.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Category, Campaign])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
