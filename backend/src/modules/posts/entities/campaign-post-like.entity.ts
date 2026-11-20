import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { CampaignPost } from "./campaign-post.entity";

@Entity("campaign_post_likes")
@Unique("uq_campaign_post_likes_post_user", ["postId", "userId"])
export class CampaignPostLike extends BaseEntity {
  @Column({ name: "post_id", length: 36 })
  postId!: string;

  @ManyToOne(() => CampaignPost, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post?: CampaignPost;

  @Column({ name: "user_id", length: 36 })
  userId!: string;
}
