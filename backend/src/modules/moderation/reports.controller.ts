import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { CreateReportDto } from "./dto/report.dto";
import { ModerationService } from "./moderation.service";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 10 * 60_000, keyPrefix: "report-create" })
  create(@Body() dto: CreateReportDto, @GetCurrentUser() user: User) {
    return this.moderationService.createReport(dto, user);
  }

  @Get("mine")
  findMine(@GetCurrentUser() user: User) {
    return this.moderationService.findMine(user);
  }
}
