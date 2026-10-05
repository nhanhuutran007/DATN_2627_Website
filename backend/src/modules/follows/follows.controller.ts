import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { FollowListQueryDto } from "./dto/follow.dto";
import { FollowsService } from "./follows.service";

@Controller()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /** Số người theo dõi (công khai) + người đang đăng nhập đã theo dõi chưa. */
  @Get("campaigns/:id/follow")
  @UseGuards(OptionalJwtAuthGuard)
  status(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User | null) {
    return this.followsService.status(id, user);
  }

  @Post("campaigns/:id/follow")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "campaign-follow" })
  follow(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.followsService.follow(id, user);
  }

  @Delete("campaigns/:id/follow")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "campaign-follow" })
  unfollow(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.followsService.unfollow(id, user);
  }

  /** Các chiến dịch đang theo dõi của chính mình. */
  @Get("users/me/follows")
  @UseGuards(JwtAuthGuard)
  mine(@GetCurrentUser() user: User, @Query() query: FollowListQueryDto) {
    return this.followsService.listMine(user, query.limit, query.offset);
  }
}
