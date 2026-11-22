import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

import { IsImageUrl } from "../../../common/validators/is-image-url";
import { PostVisibility } from "../entities/campaign-post.entity";

export const POST_TITLE_MAX = 200;
export const POST_CONTENT_MIN = 20;
export const POST_CONTENT_MAX = 20000;

export class CreatePostDto {
  @IsString()
  @MinLength(3, { message: "Tiêu đề cần ít nhất 3 ký tự." })
  @MaxLength(POST_TITLE_MAX)
  title!: string;

  @IsString()
  @MinLength(POST_CONTENT_MIN, { message: `Nội dung cần ít nhất ${POST_CONTENT_MIN} ký tự.` })
  @MaxLength(POST_CONTENT_MAX)
  content!: string;

  @IsOptional()
  @IsImageUrl()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Tiêu đề cần ít nhất 3 ký tự." })
  @MaxLength(POST_TITLE_MAX)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(POST_CONTENT_MIN, { message: `Nội dung cần ít nhất ${POST_CONTENT_MIN} ký tự.` })
  @MaxLength(POST_CONTENT_MAX)
  content?: string;

  /** `null` để gỡ ảnh. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsImageUrl()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}

export class PostListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * Bài cập nhật trả về cho người xem. Bài "chỉ người ủng hộ" mà người xem chưa ủng
 * hộ thì `locked = true`, `content`/`imageUrl` bị ẩn (tiêu đề vẫn hiện, như Kickstarter).
 */
export type PostView = {
  id: string;
  campaignId: string;
  number: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  visibility: PostVisibility;
  locked: boolean;
  likeCount: number;
  liked: boolean;
  createdAt: Date;
  editedAt: Date | null;
  /** Số bình luận (gốc + trả lời) đang hiển thị dưới bài. */
  commentCount: number;
  /** Người xem đã ủng hộ: viết được bình luận gốc. */
  canComment: boolean;
  /** Người xem quản lý bài (chủ dự án, quản trị viên, đội ngũ): trả lời được mọi bình luận. */
  canReply: boolean;
};

export type PostPage = { items: PostView[]; total: number; offset: number; limit: number };

export type PostLikeState = { liked: boolean; likeCount: number };
