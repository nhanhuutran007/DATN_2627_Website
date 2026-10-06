import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { AiService } from "./ai.service";

@Controller("campaigns")
export class CampaignPredictionController {
  constructor(private readonly aiService: AiService) {}

  /** Ước lượng khả năng đạt mục tiêu — chỉ chủ dự án/admin, kết quả chỉ để tham khảo. */
  @Get(":id/prediction")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "campaign-prediction" })
  prediction(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.aiService.predictForViewer(id, user);
  }
}
