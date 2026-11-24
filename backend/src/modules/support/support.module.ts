import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlatformSetting } from "./entities/platform-setting.entity";
import { AutomationSettingsService } from "./automation-settings.service";
import { EmailSettingsService } from "./email-settings.service";
import {
  AdminAutomationSettingsController,
  AdminEmailSettingsController,
  AdminSupportContactController,
  SupportContactController,
} from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  controllers: [SupportContactController, AdminSupportContactController, AdminAutomationSettingsController, AdminEmailSettingsController],
  providers: [SupportService, AutomationSettingsService, EmailSettingsService],
  exports: [SupportService, AutomationSettingsService, EmailSettingsService],
})
export class SupportModule {}
