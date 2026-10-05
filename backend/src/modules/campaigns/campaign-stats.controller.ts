import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { CampaignStatsService } from "./campaign-stats.service";
import { CampaignStatsQueryDto } from "./dto/campaign.dto";

@Controller("campaigns")
export class CampaignStatsController {
  constructor(private readonly statsService: CampaignStatsService) {}

  /** Ghi một lượt xem trang chiến dịch (chống đếm trùng 30 phút theo người xem). */
  @Post(":id/views")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 60, windowMs: 60_000, keyPrefix: "campaign-view" })
  recordView(
    @Param("id", ParseUUIDPipe) id: string,
    @GetCurrentUser() user: User | null,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    return this.statsService.recordView(id, { user, ip, userAgent });
  }

  /** Số liệu cho chủ dự án/admin: lượt xem, chuyển đổi, diễn biến theo ngày. */
  @Get(":id/stats")
  @UseGuards(JwtAuthGuard)
  stats(
    @Param("id", ParseUUIDPipe) id: string,
    @GetCurrentUser() user: User,
    @Query() query: CampaignStatsQueryDto,
  ) {
    return this.statsService.getStats(id, user, query.days);
  }
}
