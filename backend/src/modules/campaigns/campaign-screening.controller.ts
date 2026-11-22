import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../users/entities/user.entity";
import { CampaignScreeningService } from "./campaign-screening.service";

/** Kết quả duyệt tự động của một chiến dịch (chỉ admin): xem bản mới nhất hoặc chạy lại. */
@Controller("admin/campaigns/:id/screening")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CampaignScreeningController {
  constructor(private readonly screeningService: CampaignScreeningService) {}

  @Get()
  latest(@Param("id", ParseUUIDPipe) id: string) {
    return this.screeningService.latest(id);
  }

  @Post()
  rerun(@Param("id", ParseUUIDPipe) id: string) {
    return this.screeningService.screen(id);
  }
}
