import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { NotificationQueryDto } from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

/** Thông báo trong ứng dụng; mỗi người chỉ thấy và đánh dấu thông báo của mình. */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query() query: NotificationQueryDto, @GetCurrentUser() user: User) {
    return this.notificationsService.listForUser(user.id, query);
  }

  @Get("unread-count")
  async unreadCount(@GetCurrentUser() user: User) {
    return { unread: await this.notificationsService.unreadCount(user.id) };
  }

  @Patch("read-all")
  markAllRead(@GetCurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(":id/read")
  markRead(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }
}
