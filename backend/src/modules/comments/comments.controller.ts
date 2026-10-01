import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import { CommentsService } from "./comments.service";
import { AdminCommentQueryDto, CommentListQueryDto, CreateCommentDto, HideCommentDto } from "./dto/comment.dto";

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** Công khai: bình luận/hỏi đáp đang hiển thị của chiến dịch đã công khai. */
  @Get("campaigns/:campaignId/comments")
  list(@Param("campaignId", ParseUUIDPipe) campaignId: string, @Query() query: CommentListQueryDto) {
    return this.commentsService.listForCampaign(campaignId, query);
  }

  @Post("campaigns/:campaignId/comments")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 10 * 60_000, keyPrefix: "comment-create" })
  create(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateCommentDto,
    @GetCurrentUser() user: User,
  ) {
    return this.commentsService.create(campaignId, dto, user);
  }

  @Delete("comments/:id")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    await this.commentsService.remove(id, user);
    return { deleted: true };
  }
}

@Controller("admin/comments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Query() query: AdminCommentQueryDto) {
    return this.commentsService.adminList(query);
  }

  @Patch(":id/hide")
  hide(@Param("id", ParseUUIDPipe) id: string, @Body() dto: HideCommentDto, @GetCurrentUser() admin: User) {
    return this.commentsService.hide(id, dto.reason, admin);
  }

  @Patch(":id/unhide")
  unhide(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() admin: User) {
    return this.commentsService.unhide(id, admin);
  }
}
