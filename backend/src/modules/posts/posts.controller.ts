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
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { CommentListQueryDto, CreateCommentDto } from "../comments/dto/comment.dto";
import { CreatePostDto, PostListQueryDto, UpdatePostDto } from "./dto/post.dto";
import { PostsService } from "./posts.service";

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** Danh sách bài cập nhật (mới nhất trước); đăng nhập để mở bài dành cho người ủng hộ. */
  @Get("campaigns/:id/posts")
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PostListQueryDto,
    @GetCurrentUser() user: User | null,
  ) {
    return this.postsService.listForCampaign(id, query, user);
  }

  @Post("campaigns/:id/posts")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60_000, keyPrefix: "post-create" })
  create(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreatePostDto,
    @GetCurrentUser() user: User,
  ) {
    return this.postsService.create(id, dto, user);
  }

  @Get("posts/:id")
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User | null) {
    return this.postsService.findOne(id, user);
  }

  @Patch("posts/:id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @GetCurrentUser() user: User,
  ) {
    return this.postsService.update(id, dto, user);
  }

  @Delete("posts/:id")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    await this.postsService.remove(id, user);
    return { deleted: true };
  }

  /** Bình luận dưới bài cập nhật (bài riêng: chỉ người ủng hộ và người quản lý xem được). */
  @Get("posts/:id/comments")
  @UseGuards(OptionalJwtAuthGuard)
  listComments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: CommentListQueryDto,
    @GetCurrentUser() user: User | null,
  ) {
    return this.postsService.listComments(id, query, user);
  }

  /** Người ủng hộ bình luận; chủ dự án/quản trị viên trả lời (`parentId`). */
  @Post("posts/:id/comments")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 10 * 60_000, keyPrefix: "post-comment-create" })
  createComment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @GetCurrentUser() user: User,
  ) {
    return this.postsService.createComment(id, dto, user);
  }

  @Post("posts/:id/like")
  @UseGuards(JwtAuthGuard)
  like(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.postsService.like(id, user);
  }

  @Delete("posts/:id/like")
  @UseGuards(JwtAuthGuard)
  unlike(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.postsService.unlike(id, user);
  }
}
