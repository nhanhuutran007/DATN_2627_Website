import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlatformSetting } from "./entities/platform-setting.entity";
import { AutomationSettingsService } from "./automation-settings.service";
import { AdminAutomationSettingsController, AdminSupportContactController, SupportContactController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  controllers: [SupportContactController, AdminSupportContactController, AdminAutomationSettingsController],
  providers: [SupportService, AutomationSettingsService],
  exports: [SupportService, AutomationSettingsService],
})
export class SupportModule {}
