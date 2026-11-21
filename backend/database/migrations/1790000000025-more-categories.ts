import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mở rộng danh mục lĩnh vực: thêm nhóm cộng đồng (cứu trợ, trẻ em, người yếu thế…) và
 * nhóm ngành nghề (văn hóa, ẩm thực, làng nghề…). Đặt sau các lĩnh vực đang có; lĩnh vực
 * đã tồn tại (admin tự thêm trùng tên) thì giữ nguyên.
 */
const NEW_CATEGORIES = [
  // Cộng đồng
  "Cứu trợ thiên tai",
  "Trẻ em",
  "Người cao tuổi",
  "Người khuyết tật",
  "Nhà ở & hạ tầng nông thôn",
  "Nước sạch & vệ sinh",
  "Bảo vệ động vật",
  "Thể thao cộng đồng",
  "Tình nguyện",
  "Tưởng niệm",
  // Ngành nghề
  "Văn hóa nghệ thuật",
  "Âm nhạc",
  "Điện ảnh & truyền thông",
  "Xuất bản & sách",
  "Thiết kế & thời trang",
  "Ẩm thực",
  "Thủ công & làng nghề",
  "Du lịch cộng đồng",
  "Năng lượng sạch",
];

export class MoreCategories1790000000025 implements MigrationInterface {
  name = "MoreCategories1790000000025";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ maxOrder }]: Array<{ maxOrder: number | null }> = await queryRunner.query(
      `SELECT MAX(sort_order) AS maxOrder FROM categories`,
    );
    let order = Number(maxOrder ?? -1);
    for (const name of NEW_CATEGORIES) {
      order += 1;
      await queryRunner.query(
        `INSERT IGNORE INTO categories (id, name, sort_order, is_active) VALUES (UUID(), ?, ?, 1)`,
        [name, order],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Chỉ xóa lĩnh vực chưa có chiến dịch nào dùng, để không làm chiến dịch mất lĩnh vực.
    for (const name of NEW_CATEGORIES) {
      await queryRunner.query(
        `DELETE FROM categories WHERE name = ? AND NOT EXISTS (SELECT 1 FROM campaigns WHERE campaigns.category = ?)`,
        [name, name],
      );
    }
  }
}
