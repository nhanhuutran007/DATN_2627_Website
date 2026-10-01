import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

import { CommentKind, CommentStatus } from "../entities/campaign-comment.entity";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Nội dung cần ít nhất 2 ký tự." })
  @MaxLength(2000, { message: "Nội dung tối đa 2000 ký tự." })
  content!: string;

  /** Bình luận gốc mới chọn được loại; trả lời luôn là `comment`. */
  @IsOptional()
  @IsEnum(CommentKind)
  kind?: CommentKind;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CommentListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class AdminCommentQueryDto extends CommentListQueryDto {
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;
}

export class HideCommentDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Lý do cần ít nhất 5 ký tự." })
  @MaxLength(500)
  reason!: string;
}

export type CommentAuthor = { id: string; name: string; avatar: string | null };

export type CommentView = {
  id: string;
  kind: CommentKind;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
  /** Người viết là chủ dự án (hiển thị nhãn "Chủ dự án"). */
  isOwner: boolean;
  replies: CommentView[];
};

export type CommentThreadPage = {
  items: CommentView[];
  total: number;
  offset: number;
  limit: number;
};
