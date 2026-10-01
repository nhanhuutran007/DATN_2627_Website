import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Donation } from "../donations/entities/donation.entity";
import { User } from "../users/entities/user.entity";
import { Notification } from "./entities/notification.entity";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

/** Global (như AuditModule): mọi module nghiệp vụ phát thông báo qua NotificationsService. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, Donation, User])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
