import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { AiService } from "./ai.service";
import {
  CreateBehaviorEventDto,
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

  @Post("predict")
  predict(@Body() dto: PredictAiDto) {
    return this.aiService.predict(dto);
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