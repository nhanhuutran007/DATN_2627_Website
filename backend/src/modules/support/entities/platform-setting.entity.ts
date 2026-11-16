import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** Một mục cấu hình nền tảng do admin chỉnh; `value` là JSON lưu dạng văn bản. */
@Entity("platform_settings")
export class PlatformSetting {
  @PrimaryColumn({ name: "setting_key", length: 64 })
  key!: string;

  @Column({ type: "text" })
  value!: string;

  @Column({ name: "updated_by", type: "char", length: 36, nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
