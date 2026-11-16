import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlatformSetting } from "./entities/platform-setting.entity";
import { AdminSupportContactController, SupportContactController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  controllers: [SupportContactController, AdminSupportContactController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
