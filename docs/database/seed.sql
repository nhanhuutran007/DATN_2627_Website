-- =============================================================
-- Góp Mầm - Crowdfunding Platform
-- Seed dữ liệu mẫu cho MySQL
-- Đồng bộ với backend/scripts/seed.ts
-- Phải chạy schema.sql trước rồi mới chạy file này
--
-- Tài khoản mẫu (mật khẩu: password123 cho tất cả):
--   admin@gopmam.com    (Administrator)
--   owner1@gopmam.com   (Nguyen Van A)
--   owner2@gopmam.com   (Tran Thi B)
--   user1@gopmam.com    (Le Van C)
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- Users
-- -------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `bio`, `organization`, `email_verified`) VALUES
('24d0fb17-0e48-48a3-b9a7-1baf9d33e36e', 'Administrator', 'admin@gopmam.com', '$2b$10$j2LzWcplgkdt729BHKOw..U/fP6AAoIxhZeR3HTjnbKOZmBXLokX.', 'admin', 'active', NULL, NULL, 1),
('2de35de7-5e0a-4944-93eb-aec437664246', 'Nguyen Van A', 'owner1@gopmam.com', '$2b$10$j2LzWcplgkdt729BHKOw..U/fP6AAoIxhZeR3HTjnbKOZmBXLokX.', 'campaign_owner', 'active', 'Founder of a community project', 'Center for Community Development', 1),
('2d25c22b-2235-4550-a159-7e231504143c', 'Tran Thi B', 'owner2@gopmam.com', '$2b$10$j2LzWcplgkdt729BHKOw..U/fP6AAoIxhZeR3HTjnbKOZmBXLokX.', 'campaign_owner', 'active', 'Startup founder', 'GreenTech Startup', 1),
('b130743e-c9a3-4d4a-be3e-af1b953202ff', 'Le Van C', 'user1@gopmam.com', '$2b$10$j2LzWcplgkdt729BHKOw..U/fP6AAoIxhZeR3HTjnbKOZmBXLokX.', 'user', 'active', NULL, NULL, 1);

-- -------------------------------------------------------------
-- Campaigns
-- -------------------------------------------------------------
INSERT INTO `campaigns`
(`id`, `title`, `description`, `category`, `owner_id`, `goal_amount`, `current_amount`, `start_date`, `end_date`, `status`, `location`, `backer_count`, `view_count`) VALUES
('8d7f1142-548f-463c-bd44-5be92fdedd1a', 'Xây dựng thư viện cộng đồng cho trẻ em vùng cao', 'Chúng tôi muốn xây dựng một thư viện nhỏ với 5000 cuốn sách và 20 máy tính cho trẻ em vùng cao.', 'Giáo dục', '2de35de7-5e0a-4944-93eb-aec437664246', 50000000.00, 32500000.00, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active', 'Lào Cai', 120, 2500),
('64f2a41e-f0b8-454d-aa4e-3b888346b1dd', 'Hỗ trợ nông dân trồng rau sạch hữu cơ', 'Giúp 100 hộ nông dân chuyển đổi sang trồng rau hữu cơ với kỹ thuật canh tác bền vững.', 'Nông nghiệp', '2d25c22b-2235-4550-a159-7e231504143c', 80000000.00, 12500000.00, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 50 DAY), 'active', 'Đà Lạt', 45, 890),
('99a26c64-bc40-4123-a4a9-4c5ea91dec5f', 'Dự án khởi nghiệp công nghệ giáo dục', 'Phát triển ứng dụng học tiếng Anh cho học sinh tiểu học sử dụng AI.', 'Công nghệ', '2d25c22b-2235-4550-a159-7e231504143c', 120000000.00, 0.00, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 55 DAY), 'pending', 'Hà Nội', 0, 120);

SET FOREIGN_KEY_CHECKS = 1;
