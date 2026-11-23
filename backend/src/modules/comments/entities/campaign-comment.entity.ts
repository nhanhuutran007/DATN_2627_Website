import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";
import type { CampaignPost } from "../../posts/entities/campaign-post.entity";
import type { User } from "../../users/entities/user.entity";

export enum CommentKind {
  COMMENT = "comment",
  QUESTION = "question",
}

export enum CommentStatus {
  VISIBLE = "visible",
  HIDDEN = "hidden",
}

@Entity("campaign_comments")
export class CampaignComment extends BaseEntity {
  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign")
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;

  /** Bình luận trên một bài cập nhật; `null` = bình luận/hỏi đáp chung của chiến dịch. */
  @Column({ name: "post_id", type: "varchar", nullable: true })
  postId?: string | null;

  @ManyToOne("CampaignPost", { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post?: CampaignPost | null;

  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne("User")
  @JoinColumn({ name: "user_id" })
  user?: User;

  /** Trả lời một bình luận gốc (chỉ 1 cấp); `null` nếu là bình luận gốc. */
  @Column({ name: "parent_id", type: "varchar", nullable: true })
  parentId?: string | null;

  @Column({ type: "enum", enum: CommentKind, default: CommentKind.COMMENT })
  kind!: CommentKind;

  @Column({ type: "text" })
  content!: string;

  /** Lần người viết sửa nội dung gần nhất; `null` = chưa sửa. */
  @Column({ name: "edited_at", type: "datetime", nullable: true })
  editedAt?: Date | null;

  @Column({ type: "enum", enum: CommentStatus, default: CommentStatus.VISIBLE })
  status!: CommentStatus;

  @Column({ name: "hidden_reason", type: "varchar", length: 500, nullable: true })
  hiddenReason?: string | null;

  @Column({ name: "hidden_by", type: "varchar", nullable: true })
  hiddenBy?: string | null;

  @Column({ name: "hidden_at", type: "datetime", nullable: true })
  hiddenAt?: Date | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
