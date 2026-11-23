import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { AiService } from "./ai.service";
import {
  CreateBehaviorEventDto,
  EstimateCampaignDto,
  FraudAiDto,
  PredictAiDto,
  RecommendAiDto,
} from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("health")
  health() {
    return this.aiService.health();
  }

  @Post("recommend")
  @UseGuards(OptionalJwtAuthGuard)
  recommend(@Body() dto: RecommendAiDto, @GetCurrentUser() user?: User) {
    return this.aiService.recommend(dto, user ?? undefined);
  }

  /** Chỉ admin; chủ dự án dùng `GET /campaigns/:id/prediction`. */
  @Post("predict")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predict(@Body() dto: PredictAiDto) {
    return this.aiService.predict(dto);
  }

  /** Gợi ý mục tiêu/thời hạn khi tạo chiến dịch, học từ các dự án Góp Mầm đã kết thúc. */
  @Post("estimate")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 40, windowMs: 60_000, keyPrefix: "campaign-estimate" })
  estimate(@Body() dto: EstimateCampaignDto, @GetCurrentUser() user: User) {
    return this.aiService.estimateDraft(dto, user);
  }

  @Post("fraud")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  fraud(@Body() dto: FraudAiDto) {
    return this.aiService.getFraudScore(dto);
  }

  @Post("events")
  @UseGuards(JwtAuthGuard)
  recordEvent(@Body() dto: CreateBehaviorEventDto, @GetCurrentUser() user: User) {
    return this.aiService.recordEvent(dto, user);
  }
}
