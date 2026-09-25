import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import { ReportQueryDto, ReviewReportDto } from "./dto/report.dto";
import { ModerationService } from "./moderation.service";

@Controller("admin/reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class AdminReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  list(@Query() query: ReportQueryDto) {
    return this.moderationService.list(query);
  }

  @Patch(":id")
  review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewReportDto,
    @GetCurrentUser() admin: User,
  ) {
    return this.moderationService.review(id, dto, admin);
  }
}
