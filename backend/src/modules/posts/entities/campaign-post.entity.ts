import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { Campaign } from "../../campaigns/entities/campaign.entity";

/** Ai đọc được nội dung bài: mọi người, hoặc chỉ người đã ủng hộ chiến dịch. */
export enum PostVisibility {
  PUBLIC = "public",
  BACKERS = "backers",
}

/** Bài cập nhật dự án ("Cập nhật #N"), đánh số tăng dần trong từng chiến dịch. */
@Entity("campaign_posts")
@Unique("uq_campaign_posts_number", ["campaignId", "number"])
export class CampaignPost extends BaseEntity {
  @Column({ name: "campaign_id", length: 36 })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;

  @Column({ name: "author_id", length: 36 })
  authorId!: string;

  @Column({ type: "int" })
  number!: number;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ type: "enum", enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility!: PostVisibility;

  @Column({ name: "like_count", type: "int", default: 0 })
  likeCount!: number;

  /** Lần sửa nội dung gần nhất (hiển thị "đã chỉnh sửa"); NULL nếu chưa sửa. */
  @Column({ name: "edited_at", type: "datetime", nullable: true })
  editedAt?: Date | null;
}
