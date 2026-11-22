import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/**
 * Lĩnh vực chiến dịch do admin quản lý. `campaigns.category` lưu tên danh mục;
 * đổi tên thì service cập nhật cả chiến dịch. Tắt (`isActive = false`) thì
 * không nhận chiến dịch mới, chiến dịch cũ giữ nguyên.
 */
@Entity("categories")
export class Category extends BaseEntity {
  @Column({ length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  description?: string | null;

  /** Ảnh đại diện do admin tải lên (`/api/v1/media/categories/…`); trống thì frontend dùng ảnh minh họa có sẵn. */
  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ name: "sort_order", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;
}
