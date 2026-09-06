-- Backup for database nhlsports
-- Created at: 2025-06-25 20:12:45

SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;


-- Table structure for `aobia`
DROP TABLE IF EXISTS `aobia`;
CREATE TABLE `aobia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bia_id_aobia` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `aobia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`),
  CONSTRAINT `fk_bia_id_aobia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `aobia`
INSERT INTO `aobia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','abia11.webp','abia12.webp','abia13.webp','','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng','Sao Vàng','1249000','1300000','20','6','1','1');
INSERT INTO `aobia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','abia21.webp','abia22.webp','abia23.webp','','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng','Sao Vàng','1249000','1300000','20','3','1','1');
INSERT INTO `aobia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','abia31.webp','abia32.webp','abia33.webp','','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng','Sao Vàng','1249000','1300000','20','1','1','1');
INSERT INTO `aobia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','abia41.webp','abia42.webp','abia43.webp','abia44.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','Sao Vàng','1249000','1300000','15','1','1','1');


-- Table structure for `bia`
DROP TABLE IF EXISTS `bia`;
CREATE TABLE `bia` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_bia` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_bia` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `bia`
INSERT INTO `bia` (`topic_id`,`id`,`item`) VALUES ('7','1','Gậy Bia');
INSERT INTO `bia` (`topic_id`,`id`,`item`) VALUES ('7','2','Áo Bia');
INSERT INTO `bia` (`topic_id`,`id`,`item`) VALUES ('7','3','Phụ Kiện Bia');


-- Table structure for `bongchuyen`
DROP TABLE IF EXISTS `bongchuyen`;
CREATE TABLE `bongchuyen` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_bongchuyen` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_bongchuyen` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `bongchuyen`
INSERT INTO `bongchuyen` (`topic_id`,`id`,`item`) VALUES ('2','1','Quả Bóng Chuyền');
INSERT INTO `bongchuyen` (`topic_id`,`id`,`item`) VALUES ('2','2','Giày Bóng Chuyền');
INSERT INTO `bongchuyen` (`topic_id`,`id`,`item`) VALUES ('2','3','Quần Áo Bóng Chuyền');
INSERT INTO `bongchuyen` (`topic_id`,`id`,`item`) VALUES ('2','4','Phụ Kiện Bóng Chuyền');


-- Table structure for `bongda`
DROP TABLE IF EXISTS `bongda`;
CREATE TABLE `bongda` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_bongda` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_bongda` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `bongda`
INSERT INTO `bongda` (`topic_id`,`id`,`item`) VALUES ('3','1','Quả Bóng Đá');
INSERT INTO `bongda` (`topic_id`,`id`,`item`) VALUES ('3','2','Giày Bóng Đá');
INSERT INTO `bongda` (`topic_id`,`id`,`item`) VALUES ('3','3','Quần Áo Bóng Đá');
INSERT INTO `bongda` (`topic_id`,`id`,`item`) VALUES ('3','4','Phụ Kiện Bóng Đá');


-- Table structure for `bongro`
DROP TABLE IF EXISTS `bongro`;
CREATE TABLE `bongro` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_topic_id_bongro` (`topic_id`),
  CONSTRAINT `fk_sanpham_topic_id_bongro` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `bongro`
INSERT INTO `bongro` (`topic_id`,`id`,`item`) VALUES ('1','1','Quả Bóng Rổ');
INSERT INTO `bongro` (`topic_id`,`id`,`item`) VALUES ('1','2','Giày Bóng Rổ');
INSERT INTO `bongro` (`topic_id`,`id`,`item`) VALUES ('1','3','Quần Áo Bóng Rổ');
INSERT INTO `bongro` (`topic_id`,`id`,`item`) VALUES ('1','4','Phụ Kiện Bóng Rổ');


-- Table structure for `category_nav_items`
DROP TABLE IF EXISTS `category_nav_items`;
CREATE TABLE `category_nav_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `position` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `category_nav_items`
INSERT INTO `category_nav_items` (`id`,`name`,`category`,`position`,`created_at`) VALUES ('2','Đồ bóng chuyền SALE OFF!','bongchuyen','2','2025-04-06 21:20:02');
INSERT INTO `category_nav_items` (`id`,`name`,`category`,`position`,`created_at`) VALUES ('3','Đồ Bi-a Chính Hãng','bia','3','2025-04-06 21:20:02');
INSERT INTO `category_nav_items` (`id`,`name`,`category`,`position`,`created_at`) VALUES ('4','Đồ cầu lông','caulong','4','2025-04-06 21:20:02');
INSERT INTO `category_nav_items` (`id`,`name`,`category`,`position`,`created_at`) VALUES ('5','SALE OUTLET 40%','saleoutlet40','5','2025-04-06 21:20:02');


-- Table structure for `caulong`
DROP TABLE IF EXISTS `caulong`;
CREATE TABLE `caulong` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_caulong` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_caulong` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `caulong`
INSERT INTO `caulong` (`topic_id`,`id`,`item`) VALUES ('6','1','Vợt Cầu Lông');
INSERT INTO `caulong` (`topic_id`,`id`,`item`) VALUES ('6','2','Cầu Thi Đấu');
INSERT INTO `caulong` (`topic_id`,`id`,`item`) VALUES ('6','3','Giày Cầu Lông');
INSERT INTO `caulong` (`topic_id`,`id`,`item`) VALUES ('6','4','Quần Áo Cầu Lông');
INSERT INTO `caulong` (`topic_id`,`id`,`item`) VALUES ('6','5','Phụ Kiện Cầu Lông');


-- Table structure for `cauthidau`
DROP TABLE IF EXISTS `cauthidau`;
CREATE TABLE `cauthidau` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_caulong_id_cauthidau` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `cauthidau_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`),
  CONSTRAINT `fk_caulong_id_cauthidau` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `cauthidau`
INSERT INTO `cauthidau` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','ctd11.webp','','','','Hộp cầu lông Động Lực Promax PR-27054 - Hàng Chính Hãng','Động Lực','280000','300000','5','0','1','20');
INSERT INTO `cauthidau` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','ctd21.webp','ctd22.webp','','','Hộp cầu lông Động Lực Promax PR-18103 - Hàng Chính Hãng','Động Lực','300000','0','5','0','1','20');
INSERT INTO `cauthidau` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','ctd31.webp','ctd32.webp','','','Hộp cầu lông Động Lực Promax PR-10521 - Hàng Chính Hãng','Động Lực','180000','0','5','0','1','20');


-- Table structure for `chaybo`
DROP TABLE IF EXISTS `chaybo`;
CREATE TABLE `chaybo` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_chaybo` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_chaybo` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `chaybo`
INSERT INTO `chaybo` (`topic_id`,`id`,`item`) VALUES ('5','1','Giày Chạy Bộ');
INSERT INTO `chaybo` (`topic_id`,`id`,`item`) VALUES ('5','2','Quần Áo Chạy Bộ');
INSERT INTO `chaybo` (`topic_id`,`id`,`item`) VALUES ('5','3','Phụ Kiện Chạy Bộ');


-- Table structure for `donhang`
DROP TABLE IF EXISTS `donhang`;
CREATE TABLE `donhang` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `fullname` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `totalAll` varchar(255) NOT NULL,
  `sale` varchar(255) NOT NULL,
  `tienship` varchar(255) NOT NULL,
  `freeship` varchar(30) NOT NULL,
  `grandtotal` varchar(255) NOT NULL,
  `paymentmethod` varchar(30) NOT NULL,
  `note` varchar(255) NOT NULL,
  `ngaydat` datetime DEFAULT NULL,
  `trangthai` varchar(50) NOT NULL DEFAULT 'Đang xử lý',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `donhang`
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('46','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','649000','0','30000','no','679000','cod','','2025-03-25 11:05:28','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('49','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','649000','0','30000','no','679000','cod','','2025-03-25 21:28:18','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('50','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','1040000','0','30000','no','1070000','cod','','2025-04-26 11:51:42','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('51','haochuai','Huynh Nhat Nam','0777566324','Hồ Chí Minh','198000','0','30000','no','228000','','','2025-04-26 18:20:41','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('52','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','99000','0','30000','no','129000','bank-transfer','','2025-04-26 18:32:33','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('53','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','99000','0','30000','no','129000','bank-transfer','','2025-04-26 22:45:08','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('54','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','629000','0','30000','no','659000','cod','','2025-04-26 23:30:53','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('55','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','595000','0','30000','no','625000','cod','','2025-04-27 17:13:09','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('57','haochuai','nma','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 11:44:42','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('58','','nma','0777566324','q8','379000','0','30000','no','409000','bank-transfer','','2025-05-11 15:21:34','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('59','','nma','0777566324','q8','379000','0','30000','no','409000','cod','','2025-05-11 15:26:06','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('60','','nma','0777566324','q8','379000','0','30000','no','409000','cod','','2025-05-11 15:28:45','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('61','haochuai','nam','0777566324','q8','295000','200000','30000','no','125000','bank-transfer','','2025-05-11 15:44:18','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('62','haochuai','nam','0777566324','q8','295000','0','30000','no','325000','cod','','2025-05-11 15:55:36','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('63','haochuai','nam','0777566324','q8','295000','0','30000','no','325000','bank-transfer','','2025-05-11 15:59:01','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('64','haochuai','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 16:07:21','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('65','haochuai','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 16:11:29','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('66','haochuai','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 16:14:20','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('67','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','1309000','0','30000','no','1339000','cod','','2025-05-11 20:05:31','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('68','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','520000','0','30000','no','550000','cod','','2025-05-11 20:27:40','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('69','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','600000','0','30000','no','630000','cod','','2025-05-11 20:53:40','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('70','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','600000','0','30000','no','630000','cod','','2025-05-11 21:01:07','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('71','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','600000','0','30000','no','630000','cod','','2025-05-11 21:02:19','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('72','','huỳnh nhật nam','0777566324','1436 trịnh quang nghị phường 7 quận 8 hồ chí minh','350000','0','30000','no','380000','cod','','2025-05-11 21:03:20','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('73','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 22:36:46','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('74','','nam','0777566324','q8','350000','0','30000','no','380000','bank-transfer','','2025-05-11 22:43:22','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('75','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 22:44:03','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('76','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 22:50:01','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('77','','nam','0777566324','q8','295000','0','30000','no','325000','cod','','2025-05-11 22:54:02','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('78','','nam','0777566324','q8','350000','0','30000','no','380000','bank-transfer','','2025-05-11 22:56:29','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('79','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-11 22:57:08','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('80','','nam','0777566324','q8','350000','0','30000','no','380000','bank-transfer','','2025-05-12 00:31:45','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('81','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 00:32:13','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('82','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 00:42:04','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('83','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 00:42:26','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('84','','nam','0777566324','q8','350000','0','30000','no','380000','bank-transfer','','2025-05-12 00:44:06','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('85','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 00:54:35','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('86','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 01:03:54','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('87','','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 06:48:58','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('88','','nam','0777566324','q8','1249000','0','30000','no','1279000','cod','','2025-05-12 07:50:16','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('89','','nam','0777566324','q8','1249000','0','30000','no','1279000','cod','','2025-05-12 07:51:02','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('90','','nam','0777566324','q8','1249000','0','30000','no','1279000','cod','','2025-05-12 07:58:01','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('91','','hào','0777566324','q8','1249000','0','30000','no','1279000','cod','','2025-05-12 08:05:04','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('92','','hào','0777566324','q8','1249000','0','30000','no','1279000','cod','','2025-05-12 08:05:42','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('93','','hào','0777566324','q8','55000','0','30000','no','85000','cod','','2025-05-12 08:39:59','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('94','','hào','0777566324','q8','55000','0','30000','no','85000','cod','','2025-05-12 08:42:13','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('95','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 22:38:01','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('96','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 22:42:52','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('97','haochuai','nam','0777566324','q8','350000','0','30000','no','380000','cod','','2025-05-12 22:53:45','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('98','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 23:03:21','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('99','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 23:05:19','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('100','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 23:10:06','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('101','haochuai','nam','0777566324','q8','145000','0','30000','no','175000','cod','','2025-05-12 23:26:19','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('102','haochuai','nam','0777566324','q8','395000','0','30000','no','425000','cod','','2025-05-12 23:27:20','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('103','haochuai','nam','0777566324','q8','758000','0','30000','no','788000','cod','','2025-05-12 23:30:36','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('104','haochuai','nam','0777566324','q8','758000','0','30000','no','788000','cod','','2025-05-12 23:33:24','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('105','haochuai','nam','0777566324','q8','99000','0','30000','no','129000','cod','','2025-05-12 23:37:40','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('106','','Phú Quốc','0777566324','Hồ Chí Minh','789000','0','30000','no','819000','cod','Giao vào buổi chiều','2025-05-13 09:29:19','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('107','','Huynh Nhat Nam','0777566324','Hồ Chí Minh\r\nHồ Chí Minh','519000','0','30000','no','549000','cod','','2025-05-13 09:31:22','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('108','','Văn Liêm','0777566324','Hồ Chí Minh','990000','0','30000','no','1020000','bank-transfer','','2025-05-13 22:46:56','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('109','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','3432000','0','30000','no','3462000','cod','','2025-05-13 23:26:19','Đang giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('110','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','595000','0','30000','no','625000','cod','','2025-05-15 13:21:27','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('111','','Huynh Nhat Liêm','0777566324','Hồ Chí Minh','145000','0','30000','no','175000','cod','','2025-05-15 13:24:15','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('112','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','295000','0','30000','no','325000','cod','','2025-05-15 13:33:53','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('113','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','99000','0','30000','no','129000','cod','','2025-05-15 14:19:06','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('114','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','2294000','0','30000','no','2324000','bank-transfer','Giao vào ktx','2025-05-15 14:39:59','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('115','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','69000','0','30000','no','99000','cod','','2025-05-15 14:41:10','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('116','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','899999','0','30000','no','929999','cod','','2025-05-16 23:14:10','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('117','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','350000','0','30000','no','380000','cod','','2025-05-16 23:20:21','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('118','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','329000','0','30000','no','359000','cod','','2025-05-16 23:24:10','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('119','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','1449000','0','30000','no','1479000','cod','','2025-05-16 23:25:33','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('120','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','30000','0','30000','no','60000','cod','','2025-05-17 17:32:22','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('121','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','cod','','2025-05-18 11:21:29','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('122','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 15:38:23','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('123','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 15:44:06','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('124','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 15:45:20','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('125','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 15:49:54','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('126','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 15:50:33','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('127','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 16:22:32','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('128','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 16:25:30','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('129','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','cod','','2025-05-18 16:26:23','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('131','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-18 16:42:49','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('132','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-18 16:46:43','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('133','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-18 16:49:32','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('134','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-18 16:51:00','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('135','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','bank-transfer','','2025-05-18 17:55:17','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('136','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','bank-transfer','','2025-05-18 20:08:15','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('137','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','200','0','1900','no','2100','bank-transfer','','2025-05-18 20:26:22','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('138','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','200','0','1900','no','2100','bank-transfer','','2025-05-18 20:35:06','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('139','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','bank-transfer','','2025-05-18 20:49:34','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('140','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 12:49:19','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('141','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 12:49:24','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('142','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 12:50:59','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('143','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 12:54:44','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('144','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 12:54:49','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('145','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 13:15:17','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('146','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','bank-transfer','','2025-05-20 13:19:05','Đã hủy');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('147','admin','Huỳnh Nhật Nam','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-05-20 15:53:47','Đã giao');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('148','haochuai','Nguyễn Nhật Hào','0777566324','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','955000','20000','1900','no','936900','cod','','2025-05-20 16:01:47','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('149','','Huynh Nhat Nam','0777566324','Hồ Chí Minh','100','0','1900','no','2000','bank-transfer','','2025-05-21 21:15:04','Đang xử lý');
INSERT INTO `donhang` (`id`,`username`,`fullname`,`phone`,`address`,`totalAll`,`sale`,`tienship`,`freeship`,`grandtotal`,`paymentmethod`,`note`,`ngaydat`,`trangthai`) VALUES ('150','haochuai','Nguyễn Nhật Hào','0777566325','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','100','0','1900','no','2000','bank-transfer','','2025-06-25 20:04:12','Đã giao');


-- Table structure for `donhangchitiet`
DROP TABLE IF EXISTS `donhangchitiet`;
CREATE TABLE `donhangchitiet` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `iddonhang` int(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_donhang_id_donhangchitiet` (`iddonhang`),
  CONSTRAINT `fk_donhang_id_donhangchitiet` FOREIGN KEY (`iddonhang`) REFERENCES `donhang` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `donhangchitiet`
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('54','gr11.webp','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','42','1','649000','46');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('57','gr11.webp','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','40','1','649000','49');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('58','gcl31.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','38','1','520000','50');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('59','gcl31.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','41','1','520000','50');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('60','phukienbongro51.webp','Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng','N/A','2','99000','51');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('61','phukienbongro51.webp','Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng','N/A','1','99000','52');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('62','phukienbongro51.webp','Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng','N/A','1','99000','53');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('63','gr51.webp','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','38','1','629000','54');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('64','giaybongchuyen21.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','42','1','595000','55');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('65','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','l','1','350000','57');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('66','qabd51.webp','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','L','1','379000','58');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('67','qabd51.webp','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','L','1','379000','59');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('68','qabd51.webp','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','L','1','379000','60');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('69','quanaobongro41.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','XL','1','295000','61');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('70','quanaobongro41.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','M','1','295000','62');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('71','quanaobongro41.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','M','1','295000','63');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('72','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','M','1','350000','64');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('73','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','M','1','350000','65');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('74','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','L','1','350000','66');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('75','quabongro31.webp','Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng','N/A','1','520000','67');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('76','giaybongro31.webp','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','38','1','789000','67');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('77','quabongro31.webp','Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng','N/A','1','520000','68');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('78','quabongro21.webp','Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng','N/A','1','600000','69');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('79','quabongro21.webp','Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng','N/A','1','600000','70');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('80','quabongro21.webp','Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng','N/A','1','600000','71');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('81','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','L','1','350000','72');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('82','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','L','1','350000','73');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('83','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','L','1','350000','74');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('84','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','L','1','350000','75');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('85','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','M','1','350000','76');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('86','quanaobongro41.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','M','1','295000','77');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('87','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','M','1','350000','78');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('88','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','M','1','350000','79');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('89','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','L','1','350000','80');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('90','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','L','1','350000','81');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('91','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','L','1','350000','82');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('92','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','L','1','350000','83');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('93','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','M','1','350000','84');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('94','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','M','1','350000','85');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('95','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','XXL','1','350000','86');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('96','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','XXL','1','350000','87');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('97','abia41.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','1','1249000','88');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('98','abia41.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','1','1249000','89');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('99','abia41.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','1','1249000','90');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('100','abia41.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','1','1249000','91');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('101','abia41.webp','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','1','1249000','92');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('102','pkbd11.webp','Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng','N/A','1','55000','93');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('103','pkbd11.webp','Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng','N/A','1','55000','94');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('104','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','95');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('105','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','96');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('106','quanaobongro31.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','XL','1','350000','97');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('107','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','98');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('108','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','99');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('109','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','100');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('110','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','101');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('111','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','102');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('112','phukienbongro31.webp','Balo thể thao Zocker - Hàng Chính Hãng','N/A','1','250000','102');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('113','qabd11.webp','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','L','1','379000','103');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('114','qabd21.webp','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','L','1','379000','103');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('115','qabd11.webp','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','L','1','379000','104');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('116','qabd21.webp','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','L','1','379000','104');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('117','pkr11.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Tím\" JG-DTQG-TD-06 - Hàng Chính Hãng','N/A','1','99000','105');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('118','giaybongro41.webp','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','38','1','789000','106');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('119','gcl51.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','40','1','519000','107');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('120','gtg41.webp','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','40','1','990000','108');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('121','gbd31.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','38','1','955000','109');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('122','gcl31.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','42','1','520000','109');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('123','gcl41.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','41','1','519000','109');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('124','giaybongro31.webp','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','38','1','789000','109');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('125','gr31.webp','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','39','1','649000','109');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('126','giaybongchuyen11.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','40','1','595000','110');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('127','pkbc51.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','N/A','1','145000','111');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('128','phukienbongro21.webp','Balo thể thao Zocker Montana - Hàng Chính Hãng','N/A','1','295000','112');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('129','phukienbongro51.webp','Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng','N/A','1','99000','113');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('130','gbd11.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','38','1','955000','114');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('131','gcl31.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','38','1','520000','114');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('132','giaybongchuyen51.webp','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','38','1','819000','114');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('133','pkpk11.webp','Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng','N/A','1','69000','115');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('134','1-1718267704021.webp','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','40','1','899999','116');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('135','quanaobongro11.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng','XL','1','350000','117');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('136','phukienbongro11.webp','Balo thể thao Zocker Winner Energy - Hàng Chính Hãng','N/A','1','329000','118');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('137','pkpk11.webp','Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng','N/A','1','69000','119');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('138','gpk11.webp','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','40','1','690000','119');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('139','gpk11.webp','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','41','1','690000','119');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('140','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','30000','120');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('141','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','121');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('142','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','122');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('143','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','123');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('144','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','124');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('145','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','125');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('146','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','126');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('147','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','127');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('148','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','128');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('149','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','129');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('150','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','131');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('151','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','132');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('152','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','133');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('153','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','134');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('154','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','135');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('155','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','136');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('156','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','137');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('157','quanaobongro51.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','M','1','100','137');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('158','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','138');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('159','quanaobongro51.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','M','1','100','138');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('160','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','139');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('161','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','140');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('162','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','141');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('163','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','142');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('164','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','143');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('165','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','144');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('166','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','145');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('167','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','146');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('168','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','147');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('169','gbd21.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','40','1','955000','148');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('170','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','149');
INSERT INTO `donhangchitiet` (`id`,`image`,`name_product`,`size`,`quantity`,`price`,`iddonhang`) VALUES ('171','pkbd51.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','N/A','1','100','150');


-- Table structure for `foot_banner`
DROP TABLE IF EXISTS `foot_banner`;
CREATE TABLE `foot_banner` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `foot_banner`
INSERT INTO `foot_banner` (`id`,`image`) VALUES ('4','banner04.webp');
INSERT INTO `foot_banner` (`id`,`image`) VALUES ('5','banner02.webp');


-- Table structure for `gaybia`
DROP TABLE IF EXISTS `gaybia`;
CREATE TABLE `gaybia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `warrenty` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bia_id_gaybia` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bia_id_gaybia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`),
  CONSTRAINT `gaybia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `gaybia`
INSERT INTO `gaybia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','gbia11.webp','gbia12.webp','gbia13.webp','gbia14.webp','Gậy đánh bi-a Peri Viscount WB-G02 PR-WB-G02 - Hàng Chính Hãng','Peri','25000000','0','12','5','0','1','19');
INSERT INTO `gaybia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','gbia21.webp','gbia22.webp','gbia23.webp','gbia24.webp','Gậy đánh bi-a Peri Viscount WB-P02 PR-WB-P02 - Hàng Chính Hãng','Peri','24000000','0','12','5','0','1','19');
INSERT INTO `gaybia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','gbia31.webp','gbia32.webp','gbia33.webp','gbia34.webp','Gậy đánh bi-a Peri Earl P-TE09 PR-P-TE09 - Hàng Chính Hãng','Peri','37000000','0','12','5','0','1','19');
INSERT INTO `gaybia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','gbia41.webp','gbia42.webp','gbia43.webp','gbia44.webp','Gậy đánh bi-a Peri Earl P-TE08 PR-P-TE08 - Hàng Chính Hãng','Peri','38000000','0','12','5','0','1','19');
INSERT INTO `gaybia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','gbia51.webp','gbia52.webp','gbia53.webp','gbia54.webp','Gậy đánh bi-a Peri Earl P-TE07 PR-P-TE07 - Hàng Chính Hãng','Peri','30000000','0','12','5','0','1','19');


-- Table structure for `giaybongchuyen`
DROP TABLE IF EXISTS `giaybongchuyen`;
CREATE TABLE `giaybongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongchuyen_id_giaybongchuyen` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongchuyen_id_giaybongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  CONSTRAINT `giaybongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaybongchuyen`
INSERT INTO `giaybongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','giaybongchuyen11.webp','giaybongchuyen12.webp','giaybongchuyen13.webp','giaybongchuyen14.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','Động Lực','595000','0','24','4','1','2');
INSERT INTO `giaybongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','giaybongchuyen21.webp','giaybongchuyen22.webp','giaybongchuyen23.webp','giaybongchuyen24.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','Động Lực','595000','0','22','1','1','2');
INSERT INTO `giaybongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','6','giaybongchuyen31.webp','giaybongchuyen33.webp','giaybongchuyen32.webp','giaybongchuyen34.webp','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','Động Lực','819000','909000','25','0','1','2');
INSERT INTO `giaybongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','7','giaybongchuyen41.webp','giaybongchuyen42.webp','giaybongchuyen43.webp','giaybongchuyen44.webp','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','Động Lực','819000','909000','25','0','1','2');
INSERT INTO `giaybongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','8','giaybongchuyen51.webp','giaybongchuyen52.webp','giaybongchuyen53.webp','giaybongchuyen54.webp','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','Động Lực','819000','909999','24','4','1','2');


-- Table structure for `giaybongda`
DROP TABLE IF EXISTS `giaybongda`;
CREATE TABLE `giaybongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongda_id_giaybongda` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongda_id_giaybongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  CONSTRAINT `giaybongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaybongda`
INSERT INTO `giaybongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','gbd11.webp','gbd12.webp','gbd13.webp','gbd14.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','Động Lực','955000','1000000','24','0','1','2');
INSERT INTO `giaybongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','gbd21.webp','gbd22.webp','gbd23.webp','gbd24.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','Động Lực','955000','0','24','1','1','2');
INSERT INTO `giaybongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','gbd31.webp','gbd32.webp','gbd33.webp','gbd34.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','Động Lực','955000','1000000','22','2','1','2');
INSERT INTO `giaybongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','gbd41.webp','gbd42.webp','gbd43.webp','gbd44.webp','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','Động Lực','955000','0','25','1','1','2');
INSERT INTO `giaybongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','6','gbd51.webp','gbd52.webp','gbd53.webp','gbd54.webp','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','Động Lực','850000','900000','25','2','1','2');


-- Table structure for `giaybongro`
DROP TABLE IF EXISTS `giaybongro`;
CREATE TABLE `giaybongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongro_id_giaybongro` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongro_id_giaybongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  CONSTRAINT `giaybongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaybongro`
INSERT INTO `giaybongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','11','giaybongro11.webp','giaybongro12.webp','giaybongro13.webp','giaybongro14.webp','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','Động Lực','789000','880000','21','28','1','2');
INSERT INTO `giaybongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','12','giaybongro21.webp','giaybongro22.webp','giaybongro23.webp','giaybongro24.webp','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','Động Lực','789000','880000','25','16','1','2');
INSERT INTO `giaybongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','13','giaybongro31.webp','giaybongro32.webp','giaybongro33.webp','giaybongro34.webp','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','Động Lực','789000','880000','23','2','1','2');
INSERT INTO `giaybongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','14','giaybongro41.webp','giaybongro42.webp','giaybongro43.webp','giaybongro44.webp','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','Động Lực','789000','880000','25','2','1','2');
INSERT INTO `giaybongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','15','giaybongro51.webp','giaybongro52.webp','giaybongro53.webp','giaybongro54.webp','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','Động Lực','789000','880000','24','3','1','2');


-- Table structure for `giaycaulong`
DROP TABLE IF EXISTS `giaycaulong`;
CREATE TABLE `giaycaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_caulong_id_giaycaulong` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_caulong_id_giaycaulong` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  CONSTRAINT `giaycaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaycaulong`
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','2','gcl11.webp','gcl12.webp','gcl13.webp','gcl14.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','Động Lực','519000','580000','25','0','1','2');
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','gcl21.webp','gcl22.webp','gcl23.webp','gcl24.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','Động Lực','519000','580000','24','1','1','2');
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','gcl31.webp','gcl32.webp','gcl33.webp','gcl34.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','Động Lực','520000','580000','6','6','1','1');
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','gcl41.webp','gcl42.webp','gcl43.webp','gcl44.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','Động Lực','519000','580000','24','0','1','1');
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','6','gcl51.webp','gcl52.webp','gcl53.webp','gcl54.webp','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','Động Lực','519000','580000','23','1','1','2');
INSERT INTO `giaycaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','7','anh-san-pham-web-shop-1-1712570979016.jpg','a5-0-jpeg-1712570979038.webp','a5-1-jpeg-1712570979055.webp','a5-3-jpeg-1712570979077.jpg','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','Động Lực','519000','580000','25','1','1','23');


-- Table structure for `giaychaybo`
DROP TABLE IF EXISTS `giaychaybo`;
CREATE TABLE `giaychaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_chaybo_id_giaychaybo` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_chaybo_id_giaychaybo` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  CONSTRAINT `giaychaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaychaybo`
INSERT INTO `giaychaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','gr11.webp','gr12.webp','gr13.webp','gr14.webp','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','Động Lực','649000','725000','23','3','1','2');
INSERT INTO `giaychaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','gr21.webp','gr22.webp','gr23.webp','gr24.webp','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','Động Lực','649000','725000','25','0','1','2');
INSERT INTO `giaychaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','gr31.webp','gr32.webp','gr33.webp','gr34.webp','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','Động Lực','649000','725000','23','2','1','2');
INSERT INTO `giaychaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','gr41.webp','gr42.webp','gr43.webp','gr44.webp','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','Động Lực','649000','725000','25','0','1','2');
INSERT INTO `giaychaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','gr51.webp','gr52.webp','gr53.webp','gr54.webp','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','Động Lực','629000','785000','24','3','1','2');


-- Table structure for `giaypickleball`
DROP TABLE IF EXISTS `giaypickleball`;
CREATE TABLE `giaypickleball` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pick_id_giaypick` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_pick_id_giaypick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  CONSTRAINT `giaypickleball_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaypickleball`
INSERT INTO `giaypickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','gpk11.webp','gpk12.webp','gpk13.webp','gpk14.webp','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','Động Lực','690000','0','23','3','1','2');
INSERT INTO `giaypickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','gpk21.webp','gpk22.webp','gpk23.webp','gpk24.webp','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','Động Lực','690000','0','25','1','1','2');
INSERT INTO `giaypickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','gpk31.webp','gpk32.webp','gpk33.webp','gpk34.webp','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','Động Lực','690000','700000','25','0','1','2');
INSERT INTO `giaypickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','gpk41.webp','gpk42.webp','gpk43.webp','gpk44.webp','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','Động Lực','690000','700000','25','1','1','2');
INSERT INTO `giaypickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','6','gpk51.webp','gpk52.webp','gpk53.webp','gpk54.webp','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','Động Lực','690000','700000','25','0','1','2');


-- Table structure for `giaytapgym`
DROP TABLE IF EXISTS `giaytapgym`;
CREATE TABLE `giaytapgym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tapgym_id_giaygym` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_tapgym_id_giaygym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  CONSTRAINT `giaytapgym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `giaytapgym`
INSERT INTO `giaytapgym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','gtg11.webp','gtg12.webp','gtg13.webp','gtg14.webp','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','Động Lực','1190000','0','25','5','1','2');
INSERT INTO `giaytapgym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','gtg21.webp','gtg22.webp','gtg23.webp','gtg24.webp','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','Sao Vàng','1190000','0','25','4','1','2');
INSERT INTO `giaytapgym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','gtg31.webp','gtg32.webp','gtg33.webp','gtg34.webp','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','Động Lực','1190000','0','25','0','1','2');
INSERT INTO `giaytapgym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','gtg41.webp','gtg42.webp','gtg43.webp','gtg44.webp','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','Động Lực','990000','1090000','24','11','1','2');
INSERT INTO `giaytapgym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','gtg51.webp','gtg52.webp','gtg53.webp','gtg54.webp','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','Động Lực','599000','0','25','1','1','2');


-- Table structure for `giohang`
DROP TABLE IF EXISTS `giohang`;
CREATE TABLE `giohang` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `size` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `id_user` int(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_user_id_giohang` (`id_user`),
  CONSTRAINT `fk_user_id_giohang` FOREIGN KEY (`id_user`) REFERENCES `khachhang` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `giohang`
INSERT INTO `giohang` (`id`,`image`,`name`,`size`,`price`,`quantity`,`id_user`,`active`) VALUES ('147','giaybongchuyen41.webp','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','39','819000','1','2','1');


-- Table structure for `head_banner`
DROP TABLE IF EXISTS `head_banner`;
CREATE TABLE `head_banner` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `mb_image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `url` varchar(255) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 0,
  `alt_text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `head_banner`
INSERT INTO `head_banner` (`id`,`image`,`mb_image`,`is_active`,`url`,`order`,`alt_text`) VALUES ('45','banner02.webp','z6548127651511_475f92bf6dde768234ddea38022bb156.jpg','1',NULL,'0',NULL);
INSERT INTO `head_banner` (`id`,`image`,`mb_image`,`is_active`,`url`,`order`,`alt_text`) VALUES ('46','banner05.webp','z6548127651510_0ff6a1e4f05ca4e87370ab8d89dca3cb.jpg','1',NULL,'0',NULL);
INSERT INTO `head_banner` (`id`,`image`,`mb_image`,`is_active`,`url`,`order`,`alt_text`) VALUES ('47','banner04.webp','z6548127637746_b7761e1008bfaadfc52a4b62bcb80e03.jpg','1',NULL,'0',NULL);
INSERT INTO `head_banner` (`id`,`image`,`mb_image`,`is_active`,`url`,`order`,`alt_text`) VALUES ('48','banner06.webp','z6548153921564_7ba37ccf6aafb57107b3f86fe9a9b1b9.jpg','1',NULL,'0',NULL);


-- Table structure for `khachhang`
DROP TABLE IF EXISTS `khachhang`;
CREATE TABLE `khachhang` (
  `id_user` int(255) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `active_2fa` int(2) NOT NULL DEFAULT 0,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `khachhang`
INSERT INTO `khachhang` (`id_user`,`username`,`password`,`email`,`phone`,`fullname`,`address`,`avatar`,`active_2fa`,`reset_token`,`reset_expires`) VALUES ('1','admin','$2y$10$xCfDFZ3zXWpuK1BJdXhF5OdHlBDqL5o8/lKhvbvfuiuDuvtb6Yc96','nhatnam161005@gmail.com','0777566324','Huỳnh Nhật Nam','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','anhthe.jpg','0',NULL,NULL);
INSERT INTO `khachhang` (`id_user`,`username`,`password`,`email`,`phone`,`fullname`,`address`,`avatar`,`active_2fa`,`reset_token`,`reset_expires`) VALUES ('2','haochuai','$2y$10$5TC499q0YLoj7wR16cgE5.Uh//2NEzYcHd13A4s.Nr9Xld//EicaC','nhatnam161005@gmail.com','0777566325','Nguyễn Nhật Hào','1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm','anhthe.jpg','0','190178','2025-06-25 19:54:56');
INSERT INTO `khachhang` (`id_user`,`username`,`password`,`email`,`phone`,`fullname`,`address`,`avatar`,`active_2fa`,`reset_token`,`reset_expires`) VALUES ('17','phuquoc','$2y$10$hheHy7Z/ZhnIyivtdx3BWerkRnRy8xiY/J/97jk6P5KLTybO4saQu','nhatnam161005@gmail.com','0777566325','Huynh Nhat Nam','Hồ Chí Minh','unnamed (12).png','0','190178','2025-06-25 19:54:56');
INSERT INTO `khachhang` (`id_user`,`username`,`password`,`email`,`phone`,`fullname`,`address`,`avatar`,`active_2fa`,`reset_token`,`reset_expires`) VALUES ('18','vanliem','$2y$10$FRxAarhFifJzuTiakkdKU.sXzpONef0tFJ6yyTrsxgP8a6fNpkueq','admin@gmail.com','0777566324','Huynh Nhat Nam','Hồ Chí Minh',NULL,'0',NULL,NULL);
INSERT INTO `khachhang` (`id_user`,`username`,`password`,`email`,`phone`,`fullname`,`address`,`avatar`,`active_2fa`,`reset_token`,`reset_expires`) VALUES ('19','vanquyen','$2y$10$gk5QJ9c7jj2y6k.4FpuCUOu0HYwWyphT6KpsFQcOL0OQQUyS3Tx8u','abc@gmail.com','0777566324','Huynh Nhat Nam','Hồ Chí Minh',NULL,'0',NULL,NULL);


-- Table structure for `messenger`
DROP TABLE IF EXISTS `messenger`;
CREATE TABLE `messenger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender` enum('user','bot','admin') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `status` enum('active','waiting_for_admin') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `messenger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `khachhang` (`id_user`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `messenger`
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('1','bot','2','vftkhebe3fbbvl866bnofg0iv5','Chào bạn! Tôi có thể giúp gì? (Tìm sản phẩm, tra cứu đơn hàng, tư vấn)','2025-05-22 18:28:38','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('2','bot','2','vftkhebe3fbbvl866bnofg0iv5','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-05-22 18:28:40','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('3','bot','2','i1s60t9ndspeb1sv4dpjheeiag','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-05-22 18:43:21','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('4','bot','2','eek00g1h7hvj7eiajgalkpjtfa','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-05-22 18:44:20','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('5','bot','2','9mfu0s4spn89gpe8mnjiru1coi','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-05-22 18:44:41','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('6','bot','2','019j61v94ai44fpp4ehuok67t4','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-05-22 18:46:54','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('7','bot',NULL,'todf59ogfqgvbvc6h6de37vnnc','Chào bạn! Tôi có thể giúp gì? (Tìm sản phẩm, tra cứu đơn hàng, tư vấn)','2025-06-25 20:07:06','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('8','user',NULL,'todf59ogfqgvbvc6h6de37vnnc','tìm đơn hàng 49','2025-06-25 20:07:13','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('9','bot',NULL,'todf59ogfqgvbvc6h6de37vnnc','Mã đơn: 49 - SĐT: 0777566324 - Tổng tiền: 679,000đ - Ngày đặt: 25/03/2025 21:28 - Trạng thái: Đã giao','2025-06-25 20:07:13','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('10','bot',NULL,'todf59ogfqgvbvc6h6de37vnnc','Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!','2025-06-25 20:07:18','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('11','user',NULL,'todf59ogfqgvbvc6h6de37vnnc','hello','2025-06-25 20:07:34','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('12','admin',NULL,'todf59ogfqgvbvc6h6de37vnnc','chào','2025-06-25 20:07:39','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('13','user',NULL,'todf59ogfqgvbvc6h6de37vnnc','2','2025-06-25 20:07:49','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('14','user',NULL,'todf59ogfqgvbvc6h6de37vnnc','3','2025-06-25 20:07:50','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('15','user',NULL,'todf59ogfqgvbvc6h6de37vnnc','4','2025-06-25 20:07:50','active');
INSERT INTO `messenger` (`id`,`sender`,`user_id`,`session_id`,`message`,`created_at`,`status`) VALUES ('16','admin',NULL,'todf59ogfqgvbvc6h6de37vnnc','2','2025-06-25 20:07:53','active');


-- Table structure for `messenger_products`
DROP TABLE IF EXISTS `messenger_products`;
CREATE TABLE `messenger_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `price` int(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `sizes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `message_id` (`message_id`),
  CONSTRAINT `messenger_products_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messenger` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- Table structure for `mid_banner`
DROP TABLE IF EXISTS `mid_banner`;
CREATE TABLE `mid_banner` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image1` varchar(255) NOT NULL,
  `image2` varchar(255) NOT NULL,
  `image3` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `mid_banner`
INSERT INTO `mid_banner` (`id`,`image1`,`image2`,`image3`) VALUES ('4','mid_banner01.webp','mid_banner02.webp','mid_banner03.webp');


-- Table structure for `motasanpham`
DROP TABLE IF EXISTS `motasanpham`;
CREATE TABLE `motasanpham` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `chatlieu` text NOT NULL,
  `thietke` text NOT NULL,
  `mausac` varchar(255) NOT NULL,
  `kichthuoc` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `motasanpham`
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('1','quanao','Áo được may từ vải MK23/MK22 cao cấp, mang đến cảm giác mát mịn, thoáng khí vượt trội, thấm hút mồ hôi nhanh chóng, kháng khuẩn, khử mùi hiện đại giúp bạn luôn khô thoáng, tự tin trong suốt trận đấu.\r\nThêm vào đó, chất vải chống nhăn, co giãn tốt, bền màu, giúp bạn thoải mái vận động, thực hiện mọi động tác kỹ thuật mà không lo áo bị giãn, mất form.\r\n','Nổi bật trên nền áo là hình ảnh ngôi sao 5 cánh cách điệu được in chuyển nhiệt thể hiện tinh thần tự hào dân tộc, khát khao chinh phục mọi thử thách, mang đến sự tự tin và sức mạnh cho người mặc.\r\n\r\nForm áo chuẩn thể thao, ôm vừa vặn cơ thể, tạo sự thoải mái tối đa khi vận động mà vẫn đảm bảo tính thẩm mỹ. Quần thiết kế đơn giản, khỏe khoắn với dây rút chắc chắn, giúp bạn dễ dàng điều chỉnh độ rộng, cho cảm giác vừa vặn, tự tin khi thi đấu.\r\n','Đủ loại','M-2XL');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('2','giay','CHẤT LIỆU VẢI LƯỚI VÀ DA PU\r\nMềm, thoáng, mang lại cảm giác thoải mái cho bàn chân\r\nĐẾ CAO SU + PHYLON\r\nĐàn hồi, bền, hiệu suất bật theo chiều dọc tốt giúp giảm tổn thất năng lượng\r\n\r\n\r\n\r\n','THIẾT KẾ THANH GIẰNG VÒM ĐẾ\r\nBảo vệ vòm chân, cải thiện sự ổn định\r\n','Đủ loại','38-42');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('17','Phukien','Bền chắc , bền bỉ phù hợp cho vận động','Thoải mái , linh hoạt','Đủ loại','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('18','quabongro','Toàn bộ bề mặt được bao phủ bởi lớp composite, mang lại cho bóng độ bám vững chắc để kiểm soát toàn diện.','CHƠI TRÊN TẤT CẢ CÁC BỀ MẶT: Từ lối đi vào gara đến phòng tập thể dục và mọi nơi xung quanh.\r\nKÍCH THƯỚC CHÍNH THỨC: Kích thước 7, 29,5\"','Đủ loại','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('19','votcaulong','- Độ cứng:  Cứng trung bình\n- Khung vợt: Carbon High Modulus Graphite Carbon\n- Thân vợt: Carbon High Modulus Graphite Carbon, 100% carbon T35 Taiwan\n- Trọng lượng: 4U (82+-2gr).\n- Điểm cân bằng: 290+-3mm， vợt tấn công','- Chiều dài tổng thể: 675 mm\r\n- Điểm swing weight: 84,4 kg/cm2 \r\n- Chu vi cán vợt: G5\r\n- Sức căng tối đa: 28 (12.7 kgs) LBS','Đủ loại','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('20','Hộp cầu lông Động Lực Promax PR-27054 - Hàng Chính Hãng','Đặc điểm nổi bật\r\nLÔNG VỊT\r\nChắc chắn, độ bền cao, đường bay ổn định\r\nĐẾ BẤC','Nhẹ, không thấm nước, khó mục rữa, tính nén và độ đàn hồi cao\r\nTỐC ĐỘ CẦU 77\r\nThích hợp với khí hậu, điều kiện tự nhiên Việt Nam','trắng','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('21','Vợt Pickleball Zocker Happy HP05 Pro Series \"Black\" HP05-B - Hàng Chính Hãng','<p><strong>Vợt Pickleball Zocker Happy HP05 Pro Series Black</strong> là sản phẩm kết hợp giữa công nghệ hiện đại và phong cách thiết kế tối giản, dành cho người chơi đam mê sự cân bằng giữa lực đánh bùng nổ và kiểm soát chi tiết từng đường bóng. Với hai phiên bản độ dày linh hoạt, vợt không chỉ là công cụ thi đấu mà còn là biểu tượng của sự chuyên nghiệp, giúp bạn tỏa sáng trên mọi mặt trận.</p>','<p>Mặt vợt làm từ Raw Carbon Fiber T700 không chỉ mang lại độ bền cao mà còn tạo ma sát tối ưu, giúp tăng độ xoáy và kiểm soát bóng ngay cả trong những cú đánh biên. Công nghệ mô phỏng vợt tennis mở rộng vùng sweet spot, đảm bảo độ chính xác dù đánh ở bất kỳ vị trí nào.</p>\r\n<p>Phần lõi sử dụng cấu trúc tổ ong ép nóng mật độ cao, phân tán lực đồng đều, giảm rung chấn đến mức tối thiểu và trở lại vị trí sẵn sàng nhanh chóng sau mỗi cú đánh.</p>\r\n<p>Đặc biệt, chuôi vợt ứng dụng công nghệ Hyper Press giúp hấp thụ chấn động, giảm áp lực lên khớp tay và mang lại cảm giác êm ái khi thi đấu liên tục.</p>','Đủ màu','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('22','Vợt cầu lông Jogarbola Power J800 \"Black/Blue\" J800-01 - Hàng Chính Hãng','<p>Vợt không chỉ là 1 công cụ mà còn là người bạn đồng hành lý tưởng, giúp bạn chinh phục mọi thử thách trên sân pickleball. Với thiết kế đơn giản, hiện đại, mang tính xu hướng toàn cầu, vợt Zocker Aspire phù hợp với nhiều đối tượng, từ người mới chơi cho tới vận động viên chuyên nghiệp.</p>','<p>Với Aspire, Zocker cho ra mắt 2 phiên bản với độ dày lần lượt 13.3mm và 16mm, cùng 6 màu sắc khác nhau gồm: Trắng, hồng, đỏ, xanh, tím, đen. Mỗi màu đều mang theo sắc thái riêng. Trong đó, Vợt Pickleball Zocker Aspire viền Đỏ nổi bật với sự mạnh mẽ, năng lượng bùng cháy. Sự đa dạng về độ dày cũng như màu sắc giúp người dùng thoải mái đưa ra lựa chọn phù hợp với lối chơi cũng như phong cách thời thượng.</p>\r\n<p>Zocker sử dụng cấu trúc tổ ong cùng công nghệ ép nóng cho phần lõi, mang tới độ bền vượt trội, vô cùng chắc chắn. Kết hợp với bề mặt carbon T700 nhập từ Nhật giúp tăng độ nhám, hỗ trợ rất tốt cho các kỹ thuật tạo xoáy.</p>\r\n<p><img src=\"../img/upload/news/681b6cc71826f.webp\" alt=\"\" width=\"150\" height=\"150\"></p>','Đủ màu','');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('23','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','<p>Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng Giày cầu lông Promax PR-241023 được thiết kế dành những người yêu thích môn cầu lông chuyên nghiệp với chất lượng tiêu chuẩn.</p>\r\n<p>Đôi giày vừa mang đến cảm giác thoải mái, vừa như một tấm \"lá chắn toàn diện\", giúp bảo vệ chân từ mọi góc độ.</p>\r\n<p>Giày cầu lông Promax PR-241023 sẽ là bạn đồng hành hoàn hảo cho những cú \"smash\" mạnh mẽ và uy lực</p>','<p>Đặc điểm nổi bật</p>\r\n<p>CHẤT LIỆU VẢI LƯỚI VÀ DA PU</p>\r\n<p>Mềm, thoáng, mang lại cảm giác thoải mái cho bàn chân</p>\r\n<p>ĐẾ CAO SU + PHYLON</p>\r\n<p>Đàn hồi, bền, hiệu suất bật theo chiều dọc tốt giúp giảm tổn thất năng lượng</p>\r\n<p>THIẾT KẾ THANH GIẰNG VÒM ĐẾ</p>\r\n<p>Bảo vệ vòm chân, cải thiện sự ổn định</p>','Tím/Đỏ/Xanh navy','38-42');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('24','Giày Pickleball Nam Động Lực Jogarbola Endura \"Navy\" JG-23557-06 - Hàng Chính Hãng','<p>Giày Pickleball Jogarbola Endura – Bảo Vệ Chân, Lên Sân Tự Tin</p>\r\n<p>Giày Pickleball Jogarbola Endura là lựa chọn hoàn hảo cho người chơi bán chuyên và phong trào, mang đến sự thoải mái, ổn định và hiệu suất vượt trội trên sân. Với thiết kế tối giản, dễ phối đồ cùng những công nghệ hiện đại, đôi giày này giúp bạn làm chủ từng bước di chuyển.</p>','<p>Đặc điểm nổi bật</p>\r\n<p>Upper TPU kết hợp Microfiber bền bỉ cùng lưới thoáng khí, mang lại độ ôm chân vừa vặn và sự thông thoáng tối đa.</p>\r\n<p>Công nghệ J-Foam – Đế Phylon đàn hồi tốt, giảm chấn hiệu quả, mang lại cảm giác nhẹ nhàng và êm ái trong từng bước di chuyển.</p>\r\n<p>Công nghệ J-Rubber – Đế cao su tăng cường ma sát, chống trơn trượt, giúp bạn luôn vững vàng trên mọi mặt sân.</p>\r\n<p>Công nghệ J-Lock – Thanh TPU chống vặn xoắn, hạn chế lật cổ chân, tối ưu phản lực khi di chuyển và đổi hướng nhanh.</p>','Beige, Navy, White','38-42');
INSERT INTO `motasanpham` (`id`,`name`,`chatlieu`,`thietke`,`mausac`,`kichthuoc`) VALUES ('25','Giày Pickleball Nam Động Lực Jogarbola Endura \"Navy\" JG-23557-06 - Hàng Chính Hãng','<p>Giày Pickleball Jogarbola Endura – Bảo Vệ Chân, Lên Sân Tự Tin</p>\r\n<p>Giày Pickleball Jogarbola Endura là lựa chọn hoàn hảo cho người chơi bán chuyên và phong trào, mang đến sự thoải mái, ổn định và hiệu suất vượt trội trên sân. Với thiết kế tối giản, dễ phối đồ cùng những công nghệ hiện đại, đôi giày này giúp bạn làm chủ từng bước di chuyển.</p>\r\n<p></p>','<p>Đặc điểm nổi bật</p>\r\n<p>Upper TPU kết hợp Microfiber bền bỉ cùng lưới thoáng khí, mang lại độ ôm chân vừa vặn và sự thông thoáng tối đa.</p>\r\n<p>Công nghệ J-Foam – Đế Phylon đàn hồi tốt, giảm chấn hiệu quả, mang lại cảm giác nhẹ nhàng và êm ái trong từng bước di chuyển.</p>\r\n<p>Công nghệ J-Rubber – Đế cao su tăng cường ma sát, chống trơn trượt, giúp bạn luôn vững vàng trên mọi mặt sân.</p>\r\n<p>Công nghệ J-Lock – Thanh TPU chống vặn xoắn, hạn chế lật cổ chân, tối ưu phản lực khi di chuyển và đổi hướng nhanh.</p>','Beige, Navy, White','38-42');


-- Table structure for `news_images`
DROP TABLE IF EXISTS `news_images`;
CREATE TABLE `news_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `news_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `news_id` (`news_id`),
  CONSTRAINT `news_images_ibfk_1` FOREIGN KEY (`news_id`) REFERENCES `tintuc` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `news_images`
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('29','28','/baocao/view/img/upload/news/681b709bbbf4b.png','Không có chú thích','1','2025-05-07 21:41:33');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('30','28','/baocao/view/img/upload/news/681b70c6892c7.png','Bộ quần áo có mức giá khoảng 379.000 đồng','0','2025-05-07 21:41:33');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('31','28','/baocao/view/img/upload/news/681b70f17a4d9.png','Áo có mức giá khoảng 379.000 đồng','0','2025-05-07 21:41:33');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('40','15','/baocao/view/img/upload/news/681b30c50861c.webp','Đại biểu Quốc hội Trần Khánh Thu (Ảnh: Hồng Phong).','1','2025-05-07 22:44:41');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('41','15','https://cdnphoto.dantri.com.vn/D8rEw_SBtvf3qtYLRbY6wFoxilg=/thumb_w/1360/2025/05/06/202505060906445662z6572633953976fb10ecbcc66c0f695d18391912e66c12-edited-1746502873900.jpeg','Đại biểu Quốc hội Tô Văn Tám (Ảnh: Hồng Phong).','0','2025-05-07 22:44:41');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('44','23','/baocao/view/img/upload/news/681b62ef97fe4.png','Không có chú thích','1','2025-05-07 22:47:27');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('45','13','https://cdnphoto.dantri.com.vn/ZNpgam5lN_uaqNFtDg_o6CADlnk=/thumb_w/1360/2025/05/04/202505041429459751z619244-1746345720801.jpg','Toàn cảnh buổi họp báo (Ảnh: Hồng Phong).','1','2025-05-07 22:50:49');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('46','13','https://cdnphoto.dantri.com.vn/8YC_8Pk4bUs-tM3yz1ANC8NLKE0=/thumb_w/1360/2025/05/04/nguyen-phuong-thuy-edited-1746345760441.jpeg','Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy (Ảnh: Minh Châu).','0','2025-05-07 22:50:49');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('63','40','/baocao/view/img/upload/news/681c0d85e8052.png','Không có chú thích','1','2025-05-08 08:49:08');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('64','41','https://bizweb.dktcdn.net/thumb/1024x1024/100/485/982/products/1-1713578604031.jpg?v=1713578610243','Không có chú thích','1','2025-05-08 08:49:39');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('65','42','https://bizweb.dktcdn.net/100/485/982/files/f9ecc92cbe6c0e32577d1.jpg?v=1742376266226','Không có chú thích','1','2025-05-08 08:50:11');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('66','43','/baocao/view/img/upload/news/681c0df777d32.webp','Không có chú thích','1','2025-05-08 08:50:52');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('79','38','/baocao/view/img/upload/news/6822ad5590159.png','Không có chú thích','1','2025-05-13 09:24:26');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('80','37','/baocao/view/img/upload/news/6822ad6774901.png','Không có chú thích','1','2025-05-13 09:24:45');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('81','36','/baocao/view/img/upload/news/6822ad79aa9e4.png','Không có chú thích','1','2025-05-13 09:25:04');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('84','39','/baocao/view/img/upload/news/6826aaa53f833.png','Không có chú thích','1','2025-05-16 10:02:01');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('87','35','/baocao/view/img/upload/news/6822adb952dbc.png','Không có chú thích','1','2025-05-16 22:47:57');
INSERT INTO `news_images` (`id`,`news_id`,`image_url`,`caption`,`is_primary`,`created_at`) VALUES ('91','44','/baocao/view/img/upload/news/6826aacfb754b.png','Không có chú thích','1','2025-06-25 20:12:16');


-- Table structure for `news_tags`
DROP TABLE IF EXISTS `news_tags`;
CREATE TABLE `news_tags` (
  `news_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`news_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `news_tags_ibfk_1` FOREIGN KEY (`news_id`) REFERENCES `tintuc` (`id`),
  CONSTRAINT `news_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `news_tags`
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('13','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','2');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','4');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','5');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','6');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('15','8');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('23','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('23','5');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('23','6');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','2');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','3');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','4');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','5');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','6');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','7');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('28','8');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('35','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('36','8');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('37','7');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('38','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('39','1');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('40','3');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('41','7');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('42','8');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('43','8');
INSERT INTO `news_tags` (`news_id`,`tag_id`) VALUES ('44','1');


-- Table structure for `pending_orders`
DROP TABLE IF EXISTS `pending_orders`;
CREATE TABLE `pending_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `pending_orders`
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('85','webtt161659');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('74','webtt181030');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('10','webtt207278');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('39','webtt211533');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('50','webtt216636');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('18','webtt220705');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('60','webtt224179');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('94','webtt236696');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('28','webtt255844');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('27','webtt260977');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('57','webtt266965');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('62','webtt273786');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('4','webtt279470');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('92','webtt282162');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('86','webtt282786');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('49','webtt306355');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('90','webtt307588');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('72','webtt347942');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('5','webtt350396');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('67','webtt352789');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('52','webtt365246');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('89','webtt371317');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('48','webtt381320');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('15','webtt388581');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('51','webtt396714');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('76','webtt400854');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('24','webtt402591');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('34','webtt413012');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('78','webtt413798');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('6','webtt414794');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('44','webtt421005');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('29','webtt423888');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('11','webtt437332');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('43','webtt440876');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('64','webtt443920');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('2','webtt471292');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('32','webtt473993');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('35','webtt494934');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('47','webtt524083');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('31','webtt544574');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('25','webtt544772');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('54','webtt565910');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('26','webtt566967');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('7','webtt592626');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('1','webtt599581');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('83','webtt611319');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('79','webtt614188');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('22','webtt620883');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('14','webtt625316');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('42','webtt633503');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('75','webtt637495');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('80','webtt647691');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('65','webtt663521');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('81','webtt670818');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('33','webtt676670');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('13','webtt703103');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('82','webtt704222');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('40','webtt704770');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('95','webtt705166');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('9','webtt709229');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('88','webtt715802');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('53','webtt723538');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('12','webtt732540');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('61','webtt734770');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('37','webtt742393');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('19','webtt757189');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('20','webtt774959');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('36','webtt794144');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('55','webtt798672');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('46','webtt816845');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('41','webtt817254');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('21','webtt835127');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('23','webtt836351');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('17','webtt841574');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('84','webtt846004');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('59','webtt847450');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('93','webtt848452');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('91','webtt854554');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('66','webtt857340');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('8','webtt857390');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('56','webtt858737');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('45','webtt871399');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('58','webtt878690');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('73','webtt880594');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('38','webtt897163');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('16','webtt907935');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('68','webtt917470');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('71','webtt918236');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('63','webtt918951');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('30','webtt927876');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('70','webtt944475');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('87','webtt968148');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('77','webtt981647');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('3','webtt983675');
INSERT INTO `pending_orders` (`id`,`order_id`) VALUES ('69','webtt996422');


-- Table structure for `phukienbia`
DROP TABLE IF EXISTS `phukienbia`;
CREATE TABLE `phukienbia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bia_id_phukienbia` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bia_id_phukienbia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`),
  CONSTRAINT `phukienbia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienbia`
INSERT INTO `phukienbia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','2','pkbia11.webp','pkbia12.webp','pkbia13.webp','','Lơ bi-a Taom V10 \"Green\" PR-ChalkTaom-V10-01 - Hàng Chính Hãng','Peri','450000','590000','5','1','1','17');
INSERT INTO `phukienbia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','pkbia21.webp','pkbia22.webp','','','Lơ bi-a Taom V10 \"Blue\" PR-ChalkTaom-V10-02 - Hàng Chính Hãng','Peri','450000','590000','5','6','1','17');
INSERT INTO `phukienbia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','pkbia31.webp','pkbia32.webp','pkbia33.webp','pkbia34.webp','Bao đựng cơ Bi-a 3 Seconds 3x5 \"Gray\" PR-3SCase35-04 - Hàng Chính Hãng','Peri','9000000','0','5','3','1','17');
INSERT INTO `phukienbia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','pkbia41.webp','pkbia42.webp','pkbia43.webp','pkbia44.webp','Bao đựng cơ Bi-a 3 Seconds 3x5 \"Blue\" PR-3SCase35-03 - Hàng Chính Hãng','Peri','9000000','0','5','2','1','17');
INSERT INTO `phukienbia` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','6','pkbia51.webp','pkbia52.webp','pkbia53.webp','pkbia54.webp','Bao đựng cơ Bi-a 3 Seconds 3x5 \"Light Camo\" PR-3SCase-05 - Hàng Chính Hãng','Peri','9000000','0','5','4','1','17');


-- Table structure for `phukienbongchuyen`
DROP TABLE IF EXISTS `phukienbongchuyen`;
CREATE TABLE `phukienbongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongchuyen_id_phukienbc` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongchuyen_id_phukienbc` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  CONSTRAINT `phukienbongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienbongchuyen`
INSERT INTO `phukienbongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','3','pkbc11.webp','pkbc12.webp','pkbc13.webp','pkbc14.webp','Lưới bóng chuyền da cáp Anh Việt 4 viền - Hàng Chính Hãng','Sao Vàng','650000','0','5','1','1','17');
INSERT INTO `phukienbongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','4','pkbc21.webp','pkbc22.webp','pkbc23.webp','','Lưới bóng chuyền hơi có cáp Huy Hoàng - 4 viền trắng - Hàng Chính Hãng','Sao Vàng','450000','0','5','2','1','17');
INSERT INTO `phukienbongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','5','pkbc31.webp','pkbc32.webp','pkbc33.webp','','Lưới bóng chuyền hơi có cáp Huy Hoàng - 1 viền trắng - Hàng Chính Hãng','Sao Vàng','320000','0','5','1','1','17');
INSERT INTO `phukienbongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','6','pkbc41.webp','pkbc42.webp','pkbc43.webp','pkbc44.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Trắng\" JG-DTQG-M-02 - Hàng Chính Hãng','Động Lực','145000','0','5','3','1','17');
INSERT INTO `phukienbongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','7','pkbc51.webp','pkbc52.webp','pkbc53.webp','pkbc54.webp','Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng','Động Lực','145000','0','3','2','1','17');


-- Table structure for `phukienbongda`
DROP TABLE IF EXISTS `phukienbongda`;
CREATE TABLE `phukienbongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` varchar(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongda_id_phukienbongda` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongda_id_phukienbongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  CONSTRAINT `phukienbongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienbongda`
INSERT INTO `phukienbongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','2','pkbd11.webp','','','','Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng','Sao Vàng','55000','0','5','1','1','17');
INSERT INTO `phukienbongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','3','pkbd21.webp','pkbd22.webp','','','Bó gối thể thao LP - Hàng Chính Hãng','Sao Vàng','250000','0','0','0','1','17');
INSERT INTO `phukienbongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','4','pkbd31.webp','','','','Bó gót thể thao Winstar - Hàng Chính Hãng','Sao Vàng','110000','0','5','3','1','17');
INSERT INTO `phukienbongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','5','pkbd41.webp','pkbd42.webp','pkbd43.webp','pkbd44.webp','BĂNG CỔ CHÂN SUPER-K SKB56589 - Hàng Chính Hãng','Động Lực','60000','0','5','3','1','17');
INSERT INTO `phukienbongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','6','pkbd51.webp','pkbd52.webp','pkbd53.webp','pkbd54.webp','BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng','Động Lực','100','0','0','3','1','17');


-- Table structure for `phukienbongro`
DROP TABLE IF EXISTS `phukienbongro`;
CREATE TABLE `phukienbongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongro_id_phukienbongro` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongro_id_phukienbongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  CONSTRAINT `phukienbongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienbongro`
INSERT INTO `phukienbongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','4','phukienbongro11.webp','phukienbongro12.webp','phukienbongro13.webp','phukienbongro14.webp','Balo thể thao Zocker Winner Energy - Hàng Chính Hãng','Zocker','329000','0','4','4','1','17');
INSERT INTO `phukienbongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','5','phukienbongro21.webp','phukienbongro22.webp','phukienbongro23.webp','phukienbongro24.webp','Balo thể thao Zocker Montana - Hàng Chính Hãng','Zocker','295000','0','4','2','1','17');
INSERT INTO `phukienbongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','6','phukienbongro31.webp','phukienbongro32.webp','phukienbongro33.webp','phukienbongro34.webp','Balo thể thao Zocker - Hàng Chính Hãng','Zocker','250000','0','4','5','1','17');
INSERT INTO `phukienbongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','7','phukienbongro41.webp','phukienbongro42.webp','phukienbongro43.webp','phukienbongro44.webp','Balo thể thao đội tuyển 2025 \"Đen\" AJ-HP2502 - Hàng Chính Hãng','Động Lực','596000','0','5','4','1','17');
INSERT INTO `phukienbongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','8','phukienbongro51.webp','phukienbongro52.webp','phukienbongro53.webp','phukienbongro54.webp','Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng','Động Lực','99000','0','0','2','1','17');


-- Table structure for `phukiencaulong`
DROP TABLE IF EXISTS `phukiencaulong`;
CREATE TABLE `phukiencaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_caulong_id_phukiencl` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_caulong_id_phukiencl` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  CONSTRAINT `phukiencaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukiencaulong`
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','2','pkcl11.webp','pkcl12.webp','pkcl13.webp','pkcl14.webp','BĂNG CỔ TAY SUPER-K SK-3518 - Hàng Chính Hãng','Động Lực','50000','0','5','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','3','pkcl21.webp','pkcl22.webp','pkcl23.webp','pkcl24.webp','BĂNG CỔ CHÂN JOEREX JE052 - Hàng Chính Hãng','Động Lực','85000','0','5','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','4','pkcl31.webp','pkcl32.webp','pkcl33.webp','','BĂNG KHUỶU TAY JOEREX JKA-46513 - Hàng Chính Hãng','Động Lực','120000','200000','5','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','5','pkcl41.webp','pkcl42.webp','pkcl43.webp','pkcl44.webp','BĂNG KHUỶU TAY JOREX-0506 - Hàng Chính Hãng','Động Lực','55000','0','5','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','6','pkcl51.webp','pkcl52.webp','pkcl53.webp','','BĂNG CỔ CHÂN SUPER-K SKB56589 - Hàng Chính Hãng','Động Lực','60000','0','5','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','7','1-1742179768792.webp','2-1742179768795.webp','3-1742179768797.webp','4-1742179768800.webp','Balo thể thao đội tuyển 2025 \"Đen\" AJ-HP2502 - Hàng Chính Hãng','Bubadu','569000','600000','0','0','1','17');
INSERT INTO `phukiencaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('5','8','1-12b097f4-bc24-4028-8ed1-e7c20727353e.webp','anh-san-pham-web-shop-5-1695115120950.png','image-1695114914716.png','image-1695114914716.png','BĂNG CỔ TAY Bubadu JE058 - Hàng Chính Hãng','Bubadu','30000','','10','0','1','17');


-- Table structure for `phukienchaybo`
DROP TABLE IF EXISTS `phukienchaybo`;
CREATE TABLE `phukienchaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_chaybo_id_phukienchay` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_chaybo_id_phukienchay` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  CONSTRAINT `phukienchaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienchaybo`
INSERT INTO `phukienchaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','2','pkr11.webp','pkr12.webp','pkr13.webp','pkr14.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Tím\" JG-DTQG-TD-06 - Hàng Chính Hãng','Động Lực','99000','0','5','0','1','17');
INSERT INTO `phukienchaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','pkr21.webp','pkr22.webp','pkr23.webp','pkr24.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Hồng\" JG-DTQG-TD-05 - Hàng Chính Hãng','Động Lực','99000','100000','5','0','1','17');
INSERT INTO `phukienchaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','pkr31.webp','pkr32.webp','pkr33.webp','pkr34.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Vàng\" JG-DTQG-TD-04 - Hàng Chính Hãng','Động Lực','99000','0','5','1','1','17');
INSERT INTO `phukienchaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','pkr41.webp','pkr42.webp','pkr43.webp','pkr44.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Xanh Lá\" JG-DTQG-TD-03 - Hàng Chính Hãng','Động Lực','99000','0','5','0','1','17');
INSERT INTO `phukienchaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','6','pkr51.webp','pkr52.webp','pkr53.webp','pkr54.webp','Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Trắng\" JG-DTQG-TD-02 - Hàng Chính Hãng','Động Lực','99000','0','5','0','1','17');


-- Table structure for `phukiengym`
DROP TABLE IF EXISTS `phukiengym`;
CREATE TABLE `phukiengym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tapgym_id_phukiengym` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_tapgym_id_phukiengym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  CONSTRAINT `phukiengym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukiengym`
INSERT INTO `phukiengym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','2','pkg11.webp','pkg12.webp','pkg13.webp','pkg14.webp','Xe đạp tập Động Lực EVERTOP DLE-42816B - Hàng Chính Hãng','Động Lực','4800000','0','5','1','1','17');
INSERT INTO `phukiengym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','pkg21.webp','pkg22.webp','pkg23.webp','pkg24.webp','Xe đạp tập Động Lực EVERTOP 8911 - Hàng Chính Hãng','Động Lực','6050000','0','5','1','1','17');
INSERT INTO `phukiengym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','pkg31.webp','pkg32.webp','pkg33.webp','pkg34.webp','XE ĐẠP ĐA NĂNG Động Lực EVERTOP KPR-4090E - Hàng Chính Hãng','Động Lực','3000000','0','5','1','1','17');
INSERT INTO `phukiengym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','pkg41.webp','pkg42.webp','pkg43.webp','pkg44.webp','Xe đạp đa năng Động Lực EVERTOP GB-506R - Hàng Chính Hãng','Động Lực','4900000','0','5','0','1','17');
INSERT INTO `phukiengym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','7','pkg51.webp','pkg52.webp','pkg53.webp','pkg54.webp','Máy chạy bộ điện đa năng Động Lực DL-T6D - Hàng Chính Hãng','Động Lực','26180000','0','5','1','1','17');


-- Table structure for `phukienpick`
DROP TABLE IF EXISTS `phukienpick`;
CREATE TABLE `phukienpick` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pick_id_phukienpick` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_pick_id_phukienpick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  CONSTRAINT `phukienpick_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `phukienpick`
INSERT INTO `phukienpick` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','2','pkpk11.webp','pkpk12.webp','pkpk13.webp','pkpk14.webp','Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng','Zocker','69000','71000','4','2','1','17');
INSERT INTO `phukienpick` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','pkpk21.webp','pkpk22.webp','pkpk23.webp','pkpk24.webp','Combo 6 Quả bóng thi đấu Pickleball Zocker ZB-06 - Hàng Chính Hãng','Zocker','369000','0','5','0','1','17');
INSERT INTO `phukienpick` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','pkpk31.webp','pkpk22.webp','pkpk23.webp','pkpk24.webp','Combo 3 Quả bóng thi đấu Pickleball Zocker ZB-03 - Hàng Chính Hãng','Zocker','189000','0','5','0','1','17');
INSERT INTO `phukienpick` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','pkpk22.webp','pkpk23.webp','','','Quả bóng thi đấu Pickleball Zocker ZB-01 - Hàng Chính Hãng','Zocker','65000','0','5','0','1','17');


-- Table structure for `pickleball`
DROP TABLE IF EXISTS `pickleball`;
CREATE TABLE `pickleball` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_pick` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_pick` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `pickleball`
INSERT INTO `pickleball` (`topic_id`,`id`,`item`) VALUES ('8','1','Vợt Pickleball');
INSERT INTO `pickleball` (`topic_id`,`id`,`item`) VALUES ('8','2','Giày Pickleball');
INSERT INTO `pickleball` (`topic_id`,`id`,`item`) VALUES ('8','3','Phụ Kiện Pick');


-- Table structure for `quabongchuyen`
DROP TABLE IF EXISTS `quabongchuyen`;
CREATE TABLE `quabongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongchuyen_id_quabongchuyen` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongchuyen_id_quabongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  CONSTRAINT `quabongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quabongchuyen`
INSERT INTO `quabongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','quabc11.webp','quabc12.webp','quabc13.webp','quabc14.webp','Bóng Chuyền Da Động Lực 210 M3 DL-DL210M3 - Hàng Chính Hãng','Động Lực','309000','0','5','2','1','18');
INSERT INTO `quabongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','quabc21.webp','quabc22.webp','quabc23.webp','quabc24.webp','Bóng Chuyền Da Động Lực 240 M3 DL-DL240M3 - Hàng Chính Hãng','Động Lực','239000','255000','5','4','1','18');
INSERT INTO `quabongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','quabc31.webp','quabc32.webp','quabc33.webp','quabc34.webp','Bóng Chuyền Da Thi Đấu Thăng Long Dragon Master DG7700 - Hàng Chính Hãng','Thăng Long','1050000','0','5','2','1','18');
INSERT INTO `quabongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','quabc41.webp','','','','Bóng Chuyền Da Thi Đấu Thăng Long Dragon DG7000 - Hàng Chính Hãng','Thăng Long','693000','0','5','0','1','18');
INSERT INTO `quabongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','quabc51.webp','quabc52.webp','quabc53.webp','','Bóng Chuyền Da Thi Đấu Thăng Long Dragon Master DG7400 - Hàng Chính Hãng','Thăng Long','890000','0','5','0','1','18');


-- Table structure for `quabongda`
DROP TABLE IF EXISTS `quabongda`;
CREATE TABLE `quabongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongda_id_quabongda` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongda_id_quabongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  CONSTRAINT `quabongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quabongda`
INSERT INTO `quabongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','qbd11.webp','qbd12.webp','qbd13.webp','qbd14.webp','Bóng đá Động Lực UHV 1.02D DL-UHV102 - Hàng Chính Hãng','Động Lực','598000','0','5','8','1','18');
INSERT INTO `quabongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','qbd21.webp','qbd22.webp','qbd23.webp','qbd24.webp','Bóng đá Động Lực UHV 2.16 size 5 DL-UHV216-05 - Hàng Chính Hãng','Động Lực','558000','0','5','1','1','18');
INSERT INTO `quabongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','qbd31.webp','qbd32.webp','qbd33.webp','qbd34.webp','Bóng đá Động Lực FIFA QUALITY UHV 2.05 size 5 DL-UHV203-05 - Hàng Chính Hãng','Động Lực','1020000','0','5','0','1','18');
INSERT INTO `quabongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','qbd41.webp','qbd42.webp','qbd43.webp','qbd44.webp','Bóng đá FIFA Quality Pro SEA Games UHV 2.07 \"Victor\" DL-UHV207-V - Hàng Chính Hãng','Động Lực','2500000','0','5','0','1','18');
INSERT INTO `quabongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','qbd51.webp','qbd52.webp','qbd53.webp','qbd54.webp','Bóng đá Động Lực UCV 3.05 số 4 DL-UCV305 - Hàng Chính Hãng','Động Lực','285000','300000','5','0','1','18');


-- Table structure for `quabongro`
DROP TABLE IF EXISTS `quabongro`;
CREATE TABLE `quabongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongro_id_quabongro` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongro_id_quabongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  CONSTRAINT `quabongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quabongro`
INSERT INTO `quabongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','12','quabongro11.webp','quabongro12.webp','quabongro13.webp','quabongro14.webp','Bóng rổ Spalding Sketch Dribble – Indoor/Outdoor Size 7 84-381z - Hàng Chính Hãng','Động Lực','550000','0','5','36','1','18');
INSERT INTO `quabongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','13','quabongro21.webp','quabongro22.webp','quabongro23.webp','','Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng','Spalding','600000','0','5','6','1','18');
INSERT INTO `quabongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','14','quabongro31.webp','quabongro32.webp','quabongro33.webp','quabongro34.webp','Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng','Spalding','520000','0','4','1','1','18');
INSERT INTO `quabongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','15','quabongro41.webp','quabongro42.webp','quabongro43.webp','','Bóng rổ Spalding Green/Yellow Graffiti – Indoor/Outdoor Size 7 84-374z - Hàng Chính Hãng','Spalding','520000','0','5','1','1','18');
INSERT INTO `quabongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','16','quabongro51.webp','quabongro52.webp','quabongro53.webp','quabongro54.webp','Bóng rổ Spalding Orange Graffiti – Indoor/Outdoor Size 7 84-376z - Hàng Chính Hãng','Spalding','520000','0','0','0','1','18');


-- Table structure for `quanaobongchuyen`
DROP TABLE IF EXISTS `quanaobongchuyen`;
CREATE TABLE `quanaobongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongchuyen_id_quanaobongchuyen` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongchuyen_id_quanaobongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  CONSTRAINT `quanaobongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaobongchuyen`
INSERT INTO `quanaobongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','7','quanaobongchuyen11.webp','quanaobongchuyen12.webp','quanaobongchuyen13.webp','quanaobongchuyen14.webp','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng','Động Lực','199000','200000','21','2','1','1');
INSERT INTO `quanaobongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','8','quanaobongchuyen21.webp','quanaobongchuyen22.webp','quanaobongchuyen23.webp','quanaobongchuyen24.webp','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Xanh\" PR-2406.M-02 - Hàng Chính Hãng','Động Lực','199000','300000','5','1','1','1');
INSERT INTO `quanaobongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','9','quanaobongchuyen31.webp','quanaobongchuyen32.webp','quanaobongchuyen33.webp','quanaobongchuyen34.webp','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Trắng\" PR-2406.M-01 - Hàng Chính Hãng','Động Lực','199000','200000','5','1','1','1');
INSERT INTO `quanaobongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','10','quanaobongchuyen41.webp','quanaobongchuyen42.webp','quanaobongchuyen43.webp','quanaobongchuyen44.webp','Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng','Động Lực','645000','0','20','0','1','1');
INSERT INTO `quanaobongchuyen` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','11','quanaobongchuyen51.webp','quanaobongchuyen52.webp','quanaobongchuyen53.webp','quanaobongchuyen54.webp','Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng','Động Lực','645000','700000','20','1','1','1');


-- Table structure for `quanaobongda`
DROP TABLE IF EXISTS `quanaobongda`;
CREATE TABLE `quanaobongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongda_id_quanaobongda` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongda_id_quanaobongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  CONSTRAINT `quanaobongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaobongda`
INSERT INTO `quanaobongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','3','qabd11.webp','qabd12.webp','qabd13.webp','qabd14.webp','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','Động Lực','379000','398000','19','0','1','1');
INSERT INTO `quanaobongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','4','qabd21.webp','qabd22.webp','qabd23.webp','qabd24.webp','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','Động Lực','379000','400000','19','1','1','1');
INSERT INTO `quanaobongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','5','qabd31.webp','qabd32.webp','qabd33.webp','qabd34.webp','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng','Động Lực','379000','400000','20','1','1','1');
INSERT INTO `quanaobongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','6','qabd41.webp','qabd42.webp','qabd43.webp','qabd44.webp','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng','Sao Vàng','379000','400000','20','1','1','1');
INSERT INTO `quanaobongda` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','7','qabd51.webp','qabd52.webp','qabd53.webp','qabd54.webp','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','Động Lực','379000','400000','17','3','1','1');


-- Table structure for `quanaobongro`
DROP TABLE IF EXISTS `quanaobongro`;
CREATE TABLE `quanaobongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bongro_id_quanaobongro` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_bongro_id_quanaobongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  CONSTRAINT `quanaobongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaobongro`
INSERT INTO `quanaobongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','80','quanaobongro31.webp','quanaobongro32.webp','quanaobongro33.webp','quanaobongro34.webp','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','Động Lực','350000','400000','12','1','0','1');
INSERT INTO `quanaobongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','81','quanaobongro41.webp','quanaobongro42.webp','quanaobongro43.webp','quanaobongro44.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','Động Lực','295000','0','16','1','1','1');
INSERT INTO `quanaobongro` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('3','82','quanaobongro51.webp','quanaobongro52.webp','quanaobongro53.webp','quanaobongro54.webp','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','Động Lực','100','300000','18','1','1','1');


-- Table structure for `quanaocaulong`
DROP TABLE IF EXISTS `quanaocaulong`;
CREATE TABLE `quanaocaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_caulong_id_quanaocaulong` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_caulong_id_quanaocaulong` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  CONSTRAINT `quanaocaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaocaulong`
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','2','qacl11.webp','qacl12.webp','qacl13.webp','qacl14.webp','Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng','Động Lực','175000','200000','20','0','1','1');
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','3','qacl21.webp','qacl22.webp','qacl23.webp','qacl24.webp','Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng','Động Lực','175000','200000','20','1','1','1');
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','4','qacl31.webp','qacl32.webp','qacl33.webp','qacl34.webp','Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng','Động Lực','175000','200000','20','0','1','1');
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','5','qacl41.webp','qacl42.webp','qacl43.webp','qacl44.webp','Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng','Động Lực','175000','0','20','0','1','1');
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','6','qacl51.webp','qacl52.webp','qacl53.webp','qacl54.webp','Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng','Động Lực','175000','0','20','4','1','1');
INSERT INTO `quanaocaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('4','8','jg-492-23-01-1686822670556.webp','image-1686822621217.png','image-1686822605824.png','image-1686822608388.png','Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng','Bubadu','419000','450000','20','2','1','1');


-- Table structure for `quanaochaybo`
DROP TABLE IF EXISTS `quanaochaybo`;
CREATE TABLE `quanaochaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_chaybo_id_quanaochay` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_chaybo_id_quanaochay` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  CONSTRAINT `quanaochaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaochaybo`
INSERT INTO `quanaochaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','qar11.webp','qar12.webp','qar13.webp','qar14.webp','Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng','Động Lực','690000','700000','20','1','1','1');
INSERT INTO `quanaochaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','qar21.webp','qar22.webp','qar23.webp','qar24.webp','Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng','Động Lực','395000','400000','20','1','1','1');
INSERT INTO `quanaochaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','qar41.webp','qar42.webp','qar43.webp','qar44.webp','Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng','Động Lực','580000','600000','20','2','1','1');
INSERT INTO `quanaochaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','qar51.webp','qar52.webp','qar53.webp','qar54.webp','Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng','Động Lực','580000','0','20','0','1','1');
INSERT INTO `quanaochaybo` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','6','qar31.webp','qar32.webp','qar33.webp','qar34.webp','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','Động Lực','395000','0','20','2','1','1');


-- Table structure for `quanaogym`
DROP TABLE IF EXISTS `quanaogym`;
CREATE TABLE `quanaogym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `quantity` varchar(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tapgym_id_quanaogym` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_tapgym_id_quanaogym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  CONSTRAINT `quanaogym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `quanaogym`
INSERT INTO `quanaogym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','2','qag11.webp','qag12.webp','qag13.webp','qag14.webp','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng','Sao Vàng','399000','0','20','1','1','1');
INSERT INTO `quanaogym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','3','qag21.webp','qag22.webp','qag23.webp','qag24.webp','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng','Sao Vàng','399000','0','20','0','1','1');
INSERT INTO `quanaogym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','4','qag31.webp','qag32.webp','qag33.webp','qag34.webp','Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng','Sao Vàng','299000','349000','20','0','1','1');
INSERT INTO `quanaogym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','5','qag41.webp','qag42.webp','qag43.webp','qag44.webp','Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng','Sao Vàng','339000','395000','20','2','1','1');
INSERT INTO `quanaogym` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('2','6','qag51.webp','qag52.webp','qag53.webp','qag54.webp','Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng','Sao Vàng','339000','395000','20','3','1','1');


-- Table structure for `sanpham`
DROP TABLE IF EXISTS `sanpham`;
CREATE TABLE `sanpham` (
  `topic_id` int(255) NOT NULL AUTO_INCREMENT,
  `topic` varchar(255) NOT NULL,
  PRIMARY KEY (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `sanpham`
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('1','Bóng Rổ');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('2','Bóng Chuyền');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('3','Bóng Đá');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('4','Tập Gym');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('5','Chạy Bộ');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('6','Cầu Lông');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('7','Bia');
INSERT INTO `sanpham` (`topic_id`,`topic`) VALUES ('8','Pickleball');


-- Table structure for `sizegiay`
DROP TABLE IF EXISTS `sizegiay`;
CREATE TABLE `sizegiay` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) NOT NULL,
  `parent_id` int(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(10) NOT NULL,
  `quantity` int(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=252 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `sizegiay`
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('2','giaybongro','11','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','38','3');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('3','giaybongro','11','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('4','giaybongro','11','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('5','giaybongro','11','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('6','giaybongro','11','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('7','giaybongro','12','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('8','giaybongro','12','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('9','giaybongro','12','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('10','giaybongro','12','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('11','giaybongro','12','Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('12','giaybongro','13','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','38','3');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('13','giaybongro','13','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('14','giaybongro','13','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('15','giaybongro','13','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('16','giaybongro','13','Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('17','giaybongro','14','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('18','giaybongro','14','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('19','giaybongro','14','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('20','giaybongro','14','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('21','giaybongro','14','Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('22','giaybongro','15','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('23','giaybongro','15','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('24','giaybongro','15','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('25','giaybongro','15','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('26','giaybongro','15','Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng','42','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('27','giaybongchuyen','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('28','giaybongchuyen','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('29','giaybongchuyen','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('30','giaybongchuyen','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('31','giaybongchuyen','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('32','giaybongchuyen','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('33','giaybongchuyen','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('34','giaybongchuyen','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('35','giaybongchuyen','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('36','giaybongchuyen','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng','42','3');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('37','giaybongchuyen','6','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('38','giaybongchuyen','6','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('39','giaybongchuyen','6','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('40','giaybongchuyen','6','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('41','giaybongchuyen','6','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('42','giaybongchuyen','7','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('43','giaybongchuyen','7','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('44','giaybongchuyen','7','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('45','giaybongchuyen','7','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('46','giaybongchuyen','7','Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('47','giaybongchuyen','8','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('48','giaybongchuyen','8','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('49','giaybongchuyen','8','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('50','giaybongchuyen','8','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('51','giaybongchuyen','8','Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('52','giaybongda','2','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('53','giaybongda','2','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('54','giaybongda','2','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('55','giaybongda','2','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('56','giaybongda','2','Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('57','giaybongda','3','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('58','giaybongda','3','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('59','giaybongda','3','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('60','giaybongda','3','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('61','giaybongda','3','Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('62','giaybongda','4','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','38','3');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('63','giaybongda','4','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('64','giaybongda','4','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('65','giaybongda','4','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('66','giaybongda','4','Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('67','giaybongda','5','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('68','giaybongda','5','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('69','giaybongda','5','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('70','giaybongda','5','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('71','giaybongda','5','Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('72','giaybongda','6','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('73','giaybongda','6','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('74','giaybongda','6','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('75','giaybongda','6','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('76','giaybongda','6','Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('77','giaytapgym','2','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('78','giaytapgym','2','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('79','giaytapgym','2','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('80','giaytapgym','2','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('81','giaytapgym','2','Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('82','giaytapgym','3','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('83','giaytapgym','3','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('84','giaytapgym','3','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('85','giaytapgym','3','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('86','giaytapgym','3','Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('87','giaytapgym','4','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('88','giaytapgym','4','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('89','giaytapgym','4','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('90','giaytapgym','4','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('91','giaytapgym','4','Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('92','giaytapgym','5','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('93','giaytapgym','5','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('94','giaytapgym','5','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('95','giaytapgym','5','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('96','giaytapgym','5','Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('97','giaytapgym','6','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('98','giaytapgym','6','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('99','giaytapgym','6','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('100','giaytapgym','6','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('101','giaytapgym','6','Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('102','giaychaybo','2','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('103','giaychaybo','2','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('104','giaychaybo','2','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('105','giaychaybo','2','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','41','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('106','giaychaybo','2','Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('107','giaychaybo','3','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('108','giaychaybo','3','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('109','giaychaybo','3','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('110','giaychaybo','3','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('111','giaychaybo','3','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('112','giaychaybo','4','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('113','giaychaybo','4','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','39','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('114','giaychaybo','4','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('115','giaychaybo','4','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('116','giaychaybo','4','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('117','giaychaybo','5','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('118','giaychaybo','5','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('119','giaychaybo','5','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('120','giaychaybo','5','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('121','giaychaybo','5','Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('122','giaychaybo','6','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('123','giaychaybo','6','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('124','giaychaybo','6','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('125','giaychaybo','6','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('126','giaychaybo','6','Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('127','giaycaulong','2','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('128','giaycaulong','2','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('129','giaycaulong','2','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('130','giaycaulong','2','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('131','giaycaulong','2','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('132','giaycaulong','3','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('133','giaycaulong','3','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('134','giaycaulong','3','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('135','giaycaulong','3','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('136','giaycaulong','3','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('137','giaycaulong','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','38','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('138','giaycaulong','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('139','giaycaulong','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('140','giaycaulong','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('141','giaycaulong','4','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng','42','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('142','giaycaulong','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('143','giaycaulong','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('144','giaycaulong','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('145','giaycaulong','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','41','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('146','giaycaulong','5','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('147','giaycaulong','6','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('148','giaycaulong','6','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','39','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('149','giaycaulong','6','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('150','giaycaulong','6','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('151','giaycaulong','6','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('152','giaypickleball','2','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('153','giaypickleball','2','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('154','giaypickleball','2','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('155','giaypickleball','2','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','41','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('156','giaypickleball','2','Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('157','giaypickleball','3','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('158','giaypickleball','3','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('159','giaypickleball','3','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('160','giaypickleball','3','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('161','giaypickleball','3','Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('162','giaypickleball','4','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('163','giaypickleball','4','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('164','giaypickleball','4','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('165','giaypickleball','4','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('166','giaypickleball','4','Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('167','giaypickleball','5','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('168','giaypickleball','5','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('169','giaypickleball','5','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('170','giaypickleball','5','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('171','giaypickleball','5','Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('192','giaypickleball','8','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('193','giaypickleball','8','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('194','giaypickleball','8','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('195','giaypickleball','8','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('196','giaypickleball','8','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('197','giaypickleball','9','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('198','giaypickleball','9','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('199','giaypickleball','9','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('200','giaypickleball','9','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('201','giaypickleball','9','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('202','giaypickleball','10','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('203','giaypickleball','10','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('204','giaypickleball','10','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','40','4');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('205','giaypickleball','10','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('206','giaypickleball','10','Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('217','giaypickleball','11','Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('218','giaypickleball','11','Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('219','giaypickleball','11','Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('220','giaypickleball','11','Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('221','giaypickleball','11','Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('222','giaycaulong','7','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','38','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('223','giaycaulong','7','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('224','giaycaulong','7','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('225','giaycaulong','7','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('226','giaycaulong','7','Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng','42','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('247','giaypickleball','6','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','36','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('248','giaypickleball','6','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','39','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('249','giaypickleball','6','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','40','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('250','giaypickleball','6','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','41','5');
INSERT INTO `sizegiay` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('251','giaypickleball','6','Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng','42','5');


-- Table structure for `sizequanao`
DROP TABLE IF EXISTS `sizequanao`;
CREATE TABLE `sizequanao` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) NOT NULL,
  `parent_id` int(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(10) NOT NULL,
  `quantity` int(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=322 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `sizequanao`
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('72','quanaobongro','80','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','M','3');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('73','quanaobongro','80','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','L','0');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('74','quanaobongro','80','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','XL','4');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('75','quanaobongro','80','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('76','quanaobongro','81','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','M','2');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('78','quanaobongro','81','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('79','quanaobongro','81','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','XL','4');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('80','quanaobongro','81','Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('82','quanaobongro','82','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','M','3');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('83','quanaobongro','82','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('84','quanaobongro','82','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('85','quanaobongro','82','Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('90','quanaobongchuyen','10','Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('91','quanaobongchuyen','10','Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('92','quanaobongchuyen','10','Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('93','quanaobongchuyen','10','Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('94','quanaobongchuyen','11','Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('95','quanaobongchuyen','11','Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('96','quanaobongchuyen','11','Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('97','quanaobongchuyen','11','Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('98','quanaobongda','3','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('99','quanaobongda','3','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','L','4');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('100','quanaobongda','3','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('101','quanaobongda','3','Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('102','quanaobongda','4','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('103','quanaobongda','4','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','L','4');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('104','quanaobongda','4','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('105','quanaobongda','4','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('106','quanaobongda','5','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('107','quanaobongda','5','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('108','quanaobongda','5','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('109','quanaobongda','5','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('110','quanaobongda','6','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('111','quanaobongda','6','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('112','quanaobongda','6','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('113','quanaobongda','6','Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('114','quanaobongda','7','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('115','quanaobongda','7','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','L','2');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('116','quanaobongda','7','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('117','quanaobongda','7','Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('118','quanaogym','2','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('119','quanaogym','2','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('120','quanaogym','2','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('121','quanaogym','2','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('122','quanaogym','3','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('123','quanaogym','3','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('124','quanaogym','3','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('125','quanaogym','3','Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('126','quanaogym','4','Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('127','quanaogym','4','Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('128','quanaogym','4','Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('129','quanaogym','4','Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('130','quanaogym','5','Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('131','quanaogym','5','Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('132','quanaogym','5','Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('133','quanaogym','5','Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('134','quanaogym','6','Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('135','quanaogym','6','Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('136','quanaogym','6','Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('137','quanaogym','6','Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('138','quanaochaybo','2','Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('139','quanaochaybo','2','Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('140','quanaochaybo','2','Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('141','quanaochaybo','2','Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('142','quanaochaybo','3','Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('143','quanaochaybo','3','Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('144','quanaochaybo','3','Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('145','quanaochaybo','3','Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('146','quanaogym','7','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('147','quanaogym','7','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('148','quanaogym','7','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('149','quanaogym','7','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('150','quanaochaybo','4','Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('151','quanaochaybo','4','Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('152','quanaochaybo','4','Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('153','quanaochaybo','4','Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('154','quanaochaybo','5','Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('155','quanaochaybo','5','Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('156','quanaochaybo','5','Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('157','quanaochaybo','5','Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('158','quanaogym','8','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('159','quanaogym','8','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('160','quanaogym','8','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('161','quanaogym','8','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('162','quanaochaybo','6','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('163','quanaochaybo','6','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('164','quanaochaybo','6','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('165','quanaochaybo','6','Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('166','quanaocaulong','2','Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('167','quanaocaulong','2','Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('168','quanaocaulong','2','Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('169','quanaocaulong','2','Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('170','quanaocaulong','3','Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('171','quanaocaulong','3','Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('172','quanaocaulong','3','Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('173','quanaocaulong','3','Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('174','quanaocaulong','4','Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('175','quanaocaulong','4','Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('176','quanaocaulong','4','Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('177','quanaocaulong','4','Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('178','quanaocaulong','5','Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('179','quanaocaulong','5','Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('180','quanaocaulong','5','Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('181','quanaocaulong','5','Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('182','quanaocaulong','6','Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('183','quanaocaulong','6','Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('184','quanaocaulong','6','Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('185','quanaocaulong','6','Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('190','aobia','3','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('191','aobia','3','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('192','aobia','3','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('193','aobia','3','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('194','aobia','4','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('195','aobia','4','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('196','aobia','4','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('197','aobia','4','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('198','aobia','5','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('199','aobia','5','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('200','aobia','5','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('201','aobia','5','Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng','XXL','0');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('270','quanaobongro','79','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng','M','6');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('271','quanaobongro','79','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('272','quanaobongro','79','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('273','quanaobongro','79','Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('298','quanaocaulong','7','[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('299','quanaocaulong','7','[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('300','quanaocaulong','7','[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('301','quanaocaulong','7','[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('302','quanaocaulong','8','Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('303','quanaocaulong','8','Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('304','quanaocaulong','8','Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('305','quanaocaulong','8','Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('306','quanaocaulong','9','Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng','M','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('307','quanaocaulong','9','Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('308','quanaocaulong','9','Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('309','quanaocaulong','9','Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('310','quanaobongchuyen','7','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng','M','6');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('311','quanaobongchuyen','7','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('312','quanaobongchuyen','7','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('313','quanaobongchuyen','7','Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng','XXL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('318','aobia','2','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng','S','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('319','aobia','2','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng','L','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('320','aobia','2','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng','XL','5');
INSERT INTO `sizequanao` (`id`,`table_name`,`parent_id`,`name_product`,`size`,`quantity`) VALUES ('321','aobia','2','Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng','XXL','5');


-- Table structure for `tags`
DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `tags`
INSERT INTO `tags` (`id`,`name`) VALUES ('1','bóng chuyền');
INSERT INTO `tags` (`id`,`name`) VALUES ('2','bóng đá');
INSERT INTO `tags` (`id`,`name`) VALUES ('3','bóng rổ');
INSERT INTO `tags` (`id`,`name`) VALUES ('4','gym');
INSERT INTO `tags` (`id`,`name`) VALUES ('5','chạy bộ');
INSERT INTO `tags` (`id`,`name`) VALUES ('6','cầu lông');
INSERT INTO `tags` (`id`,`name`) VALUES ('7','bia');
INSERT INTO `tags` (`id`,`name`) VALUES ('8','pickleball');


-- Table structure for `tapgym`
DROP TABLE IF EXISTS `tapgym`;
CREATE TABLE `tapgym` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sanpham_id_gym` (`topic_id`),
  CONSTRAINT `fk_sanpham_id_gym` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `tapgym`
INSERT INTO `tapgym` (`topic_id`,`id`,`item`) VALUES ('4','1','Giày Tập Gym');
INSERT INTO `tapgym` (`topic_id`,`id`,`item`) VALUES ('4','2','Quần Áo Gym');
INSERT INTO `tapgym` (`topic_id`,`id`,`item`) VALUES ('4','3','Phụ Kiện Gym');


-- Table structure for `tintuc`
DROP TABLE IF EXISTS `tintuc`;
CREATE TABLE `tintuc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `author` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `view_count` int(11) DEFAULT 0,
  `active` int(2) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `tintuc`
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('13','Vì sao không bầu mà chỉ định chủ tịch các tỉnh, thành sau sáp nhập?','<p>(Dân trí) - Theo lý giải, đợt sắp xếp đơn vị hành chính các cấp lần này có những điểm đặc biệt, khác những lần trước đó nên sẽ có cơ chế khác với thông lệ, trong đó có chỉ định chủ tịch tỉnh, thành sau sáp nhập. Đây là vấn đề được đặt ra tại cuộc họp báo chiều 4/5 về dự kiến chương trình kỳ họp thứ 9 Quốc hội khóa XV.</p>\r\n<p>Liên quan chủ trương sắp xếp đơn vị hành chính các cấp, Bộ Chính trị đã có kết luận và Ban Tổ chức Trung ương đã có hướng dẫn về việc không bầu chủ tịch, phó chủ tịch tỉnh, thành sau sáp nhập mà thay vào đó là chỉ định, bổ nhiệm.</p>\r\n<p>Tuy nhiên không ít ý kiến lo ngại việc chỉ định nhân sự sẽ mang ý chí cá nhân, không đảm bảo yếu tố công tâm, khách quan trong chọn lựa nhân sự lãnh đạo cấp tỉnh.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/ZNpgam5lN_uaqNFtDg_o6CADlnk=/thumb_w/1360/2025/05/04/202505041429459751z619244-1746345720801.jpg\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption>Toàn cảnh buổi họp báo (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Với việc chỉ định nhân sự không là đại biểu HĐND giữ các chức danh lãnh đạo HĐND cấp tỉnh, báo chí đặt câu hỏi điều này liệu có phá vỡ nguyên tắc trong công tác bầu cử hiện nay hay không, bởi theo quy định hiện hành, các chức danh lãnh đạo HĐND cấp tỉnh đều phải bầu từ các đại biểu HĐND.</p>\r\n<p>Trả lời câu hỏi này, Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy cho biết đây là nội dung được xem xét và được các cấp có thẩm quyền nghiên cứu, thảo luận.</p>\r\n<p>Cụ thể, tại Kết luận 150, Bộ Chính trị nêu rõ yêu cầu trong lần sắp xếp đơn vị hành chính này sẽ thực hiện cơ chế chỉ định, bổ nhiệm người giữ các chức vụ trong UBND, HĐND ở các đơn vị sau sắp xếp thay cho việc bầu theo quy định của Luật Tổ chức chính quyền địa phương. Bộ Chính trị cũng nêu rõ việc chỉ định nhân sự không phải đại biểu HĐND làm lãnh đạo HĐND cấp tỉnh, cấp xã.</p>\r\n<p>\"Đây là cơ chế trước đây chưa thực hiện, nhưng lần sắp xếp này có đặc điểm khác biệt so với việc sắp xếp đơn vị hành chính trước đây\", theo lý giải được bà Thủy đưa ra.</p>\r\n<p>Bà cho biết trước đây, cả nước đã có 2 đợt sắp xếp lớn vào năm 2019-2021 và 2023-2025. Nhưng lần này, ngoài việc sáp nhập đơn vị hành chính cấp tỉnh và cấp xã, bà Thủy nhấn mạnh chúng ta còn thực hiện chủ trương lớn của Đảng là không tổ chức các đơn vị hành chính cấp huyện. Vì thế, các cơ quan thuộc chính quyền địa phương cấp huyện sẽ kết thúc hoạt động cùng thời điểm nhập tỉnh, nhập xã.</p>\r\n<p>Để đáp ứng yêu cầu về bố trí, sắp xếp cán bộ, đặc biệt là cán bộ công chức đang công tác ở cấp huyện làm việc ở các cơ quan, đơn vị mới cũng như khai thác tối đa nguồn nhân lực hiện có, Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp nhấn mạnh Bộ Chính trị đã có chỉ đạo trong lần sắp xếp này, sẽ thực hiện cơ chế chỉ định, bổ nhiệm đối với người giữ chức vụ lãnh đạo UBND, HĐND tại các đơn vị thực hiện sắp xếp.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/8YC_8Pk4bUs-tM3yz1ANC8NLKE0=/thumb_w/1360/2025/05/04/nguyen-phuong-thuy-edited-1746345760441.jpeg\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption>Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy (Ảnh: Minh Châu).</figcaption>\r\n</figure>\r\n<p>Song bà Thủy lưu ý, việc này chỉ thực hiện trong năm 2025 ứng với lần thực hiện sắp xếp quy mô lớn, còn những năm sau sẽ thực hiện bầu bình thường như thông lệ, HĐND sẽ bầu các chức danh của HĐND và UBND.</p>\r\n<p>Việc này cũng sẽ được ghi nhận trong Nghị quyết sửa đổi, bổ sung một số điều của Hiến pháp 2013 tại quy định chuyển tiếp, để làm cơ sở pháp lý cho việc thực hiện, theo lời Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp.</p>\r\n<p>Theo hướng dẫn của Ban Chấp hành Trung ương Đảng vừa ban hành về sắp xếp tổ chức bộ máy cơ quan Mặt trận Tổ quốc Việt Nam, đoàn thể cấp tỉnh, cấp xã, Ban Tổ chức Trung ương sẽ thẩm định đề án của các tỉnh, thành ủy; đồng thời tham mưu, trình Bộ Chính trị, Ban Bí thư quyết định thành lập đảng bộ các tỉnh, thành phố trực thuộc Trung ương.</p>\r\n<p>Cơ quan này cũng tham mưu Bộ Chính trị, Ban Bí thư việc chỉ định ban chấp hành, ban thường vụ, bí thư, phó bí thư tỉnh ủy, thành ủy, ủy ban kiểm tra, chủ nhiệm, phó chủ nhiệm ủy ban kiểm tra tỉnh ủy, thành ủy nhiệm kỳ 2020-2025. Thời gian hoàn thành nhiệm vụ này cần đồng nhất với việc sáp nhập tỉnh, tức chậm nhất trước 15/9.</p>\r\n<p>Theo Nghị quyết 60 của Hội nghị Trung ương 11 khóa XIII, sẽ có 11 tỉnh, thành phố giữ nguyên hiện trạng (gồm Hà Nội, Huế, Lai Châu, Điện Biên, Sơn La, Lạng Sơn, Quảng Ninh, Thanh Hóa, Nghệ An, Hà Tĩnh và Cao Bằng).</p>\r\n<p>52 địa phương khác sẽ tiến hành sáp nhập để còn lại 23 tỉnh, thành phố.</p>\r\n<p>Số lượng đơn vị hành chính cấp xã dự kiến sau sắp xếp giảm từ 10.035 xuống còn hơn 3.320 đơn vị (tương đương 66,91%).</p>\r\n<p>Về số lượng cán bộ, công chức cấp tỉnh, cấp xã (bao gồm khối Đảng, đoàn thể và khối chính quyền), dự kiến sau sắp xếp, cấp tỉnh sẽ giảm hơn 18.440 biên chế cán bộ, công chức so với số biên chế được cấp có thẩm quyền giao năm 2022.</p>\r\n<p>Cấp xã (xã, phường, đặc khu) sẽ giảm hơn 110.780 biên chế cán bộ, công chức so với tổng số biên chế cấp huyện và cấp xã giao năm 2022 do sắp xếp vị trí việc làm, tinh giản biên chế, nghỉ chế độ theo quy định.</p>\r\n<p>Ngoài ra, khoảng 120.500 người hoạt động không chuyên trách ở cấp xã trong cả nước sẽ kết thúc hoạt động.</p>\r\n<p></p>\r\n<p></p>',NULL,'2024-05-06 16:13:49','2','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('15','\"Sau 8 tiếng trên lớp, giáo viên bỏ công sức dạy thêm không có gì sai\"','<p>Theo đại biểu Trần Khánh Thu, việc giáo viên từ bỏ thời gian cho gia đình để làm thêm công việc chuyên môn và tăng thêm thu nhập, không có gì sai trái. Vấn đề là cần ngăn những khía cạnh tiêu cực. Quan điểm này được đại biểu Quốc hội tỉnh Thái Bình Trần Khánh Thu đưa ra sáng 6/5, khi thảo luận trên hội trường Quốc hội về dự thảo Luật Nhà giáo.</p>\r\n<p>Chia sẻ góc nhìn về vấn đề dạy thêm, học thêm, nữ đại biểu nhận định việc này phải xuất phát từ nhu cầu học tập của xã hội, của học sinh và phụ huynh, không thể quy rằng giáo viên ép buộc trong vấn đề học thêm.</p>\r\n<figure><img src=\"/baocao/view/img/upload/news/681b30c50861c.webp\" alt=\"\" width=\"700\" height=\"467\">\r\n<figcaption>Đại biểu Quốc hội Trần Khánh Thu (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Thực tế, theo bà Thu, nhiều học sinh vẫn tự nguyện ra trung tâm học thêm tiếng Anh hay tự nguyện học thêm các môn văn hóa khác như âm nhạc, mỹ thuật, võ thuật…</p>\r\n<p>Vì thế, việc học thêm, bà Thu cho rằng là nguyện vọng chính đáng. \"Như vậy, khi có nhu cầu của học sinh, của gia đình thì giáo viên cũng mong muốn, có nhu cầu có thêm thu nhập và họ chọn cách đi làm thêm là dạy thêm. Thu nhập của giáo viên ở đây tôi cho rằng hoàn toàn chính đáng, phù hợp\", đại biểu Trần Khánh Thu nêu quan điểm.</p>\r\n<p>Theo bà, sau 8 tiếng dạy ở trên lớp, giáo viên hoàn toàn có thể bỏ công sức ra để dạy thêm.</p>\r\n<p>\"Việc các giáo viên từ bỏ thời gian cho gia đình để làm thêm công việc liên quan đến chuyên môn và mang lại lợi ích, tăng thêm thu nhập, tôi nghĩ không có gì sai trái cả. Ở đây, điều quan trọng nhất cần chống là khía cạnh tiêu cực\", bà Thu nói.</p>\r\n<p>Khía cạnh tiêu cực mà đại biểu đề cập, chính là việc lợi dụng để ép buộc học sinh đi học thêm, gây ra những tác động tiêu cực khác.</p>\r\n<p>\"Bản thân tôi không chấp nhận chuyện giáo viên ép buộc để dạy thêm và trục lợi từ dạy thêm, nhưng chúng ta cần có một quy định để tổ chức các hoạt động này một cách chính thống như một loại hình dịch vụ khác và có nề nếp, có quy định\", nữ đại biểu cho rằng nếu làm được như vậy sẽ hạn chế được tiêu cực.</p>\r\n<p>Vì thế, về những việc không được làm quy định trong dự thảo luật, có nội dung \"Ép buộc người học tham gia học thêm dưới mọi hình thức\".</p>\r\n<p>Đại biểu tỉnh Thái Bình đề nghị cơ quan soạn thảo nghiên cứu, sửa đổi nội dung trên thành \"Cấm tham gia dạy học thêm trái quy định của pháp luật\".</p>\r\n<p>Bà giải thích do quy định \"không ép buộc người học tham gia học thêm dưới mọi hình thức\" đã được quy định từ lâu, song việc hạn chế dạy thêm, học thêm không đạt được hiệu quả.</p>\r\n<p>Thực tế, có rất nhiều hình thức không ép buộc nhưng học sinh vẫn phải học thêm bởi chương trình học hiện nay gây áp lực rất lớn cho học sinh, nhất là bậc tiểu học. Do vậy, việc luật hóa cấm dạy thêm, học thêm tự phát là cần thiết.</p>\r\n<p>Bên cạnh đó, theo bà Thu, có thể quy định giao Chính phủ hoặc Bộ Giáo dục và Đào tạo xây dựng bộ quy chế dạy thêm, học thêm theo hướng công khai như các trung tâm và xây dựng quy chế đặc thù để hạn chế việc dạy thêm, học thêm tự phát tràn lan, tránh lãng phí.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/D8rEw_SBtvf3qtYLRbY6wFoxilg=/thumb_w/1360/2025/05/06/202505060906445662z6572633953976fb10ecbcc66c0f695d18391912e66c12-edited-1746502873900.jpeg\" alt=\"\" width=\"700\" height=\"467\">\r\n<figcaption>Đại biểu Quốc hội Tô Văn Tám (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Đại biểu Phạm Văn Hòa (Đồng Tháp) cũng thừa nhận thực tế không cần giáo viên ép, học sinh cũng phải đi học thêm. Vì thế, trong luật cần làm rõ hơn việc \"ép học sinh\" học thêm như thế nào.</p>\r\n<p>Trong khi đó, đại biểu Tô Văn Tám (Kon Tum) cho rằng nếu chương trình, cách dạy ở trường giúp học sinh nắm được ngay trên lớp, học sinh sẽ không có nhu cầu học thêm. Vì vậy, vấn đề đặt ra là cần xem xét chương trình học có đang nặng quá không, khiến nhiều học sinh phải đi học thêm. Đại biểu góp ý cần giảm chương trình và lượng kiến thức học sinh học trên lớp.</p>',NULL,'2025-05-06 17:19:41','4','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('23','Hướng Dẫn Chạy Bộ Đúng Cách Để Không Bị To Bắp Chân','<figure><img src=\"/baocao/view/img/upload/news/681b62ef97fe4.png\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption></figcaption>\r\n</figure>\r\n<p>Giải đáp: Chạy bộ có to chân không?</p>\r\n<p>Việc chạy bộ có thể dẫn đến việc bắp chân bạn trở nên to hơn do sự phát triển của cơ bắp. Ngược lại, nếu bạn chỉ chạy chậm với khoảng cách dài, như các vận động viên marathon, cơ thể sẽ chủ yếu đốt cháy mỡ thừa, khiến bắp chân trở nên nhỏ gọn và săn chắc hơn.</p>\r\n<p> </p>\r\n<p>Nguyên nhân chính khiến bắp chân phát triển khi chạy bộ bao gồm:</p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Chạy sai kỹ thuật: Tiếp đất bằng mũi chân quá nhiều khiến cơ bắp chân (calf) hoạt động liên tục, dẫn đến phì đại cơ.</p>\r\n</li>\r\n<li>\r\n<p>Chạy nước rút hoặc leo dốc thường xuyên: Các bài tập cường độ cao khiến cơ bắp chân co rút mạnh, kích thích tăng cơ.</p>\r\n</li>\r\n<li>\r\n<p>Không giãn cơ sau khi chạy: Cơ bắp chân bị căng cứng, tạo cảm giác \"bó cơ\" và trông to hơn.</p>\r\n</li>\r\n</ul>',NULL,'2025-05-07 20:41:12','2','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('28','Liệt kê các mẫu áo Đội Tuyển Việt Nam phiên bản 2025 MỚI NHẤT','<p>Năm 2025, Đội tuyển Bóng đá Quốc gia Việt Nam tiếp tục ra mắt những bộ trang phục thi đấu và tập luyện mới, kết hợp giữa công nghệ hiện đại và thiết kế đậm chất truyền thống. Dưới đây là các mẫu áo đội tuyển Việt Nam 2025 đang được người hâm mộ săn đón:</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681b709bbbf4b.png\" alt=\"\" width=\"700\" height=\"467\"></p>\r\n<ol>\r\n<li>Bộ Luyện Tập Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Bộ luyện tập là trang phục không thể thiếu giúp các cầu thủ thoải mái trong các buổi tập. Phiên bản 2025 được làm từ chất liệu 100% polyester cao cấp, mang đến sự bền bỉ, co giãn, giúp cầu thủ vận động dễ dàng.</p>\r\n<p>Thiết kế màu xanh biển tượng trưng cho màu của biển cả, sự tươi mới và năng động. Xen kẽ với những ngôi sao là hình tượng các cơn sóng mạnh mẽ, gợi lên ý chí kiên cường và sức mạnh đoàn kết như dòng chảy bất tận của biển cả Việt Nam. Điểm nhấn nổi bật của áo là những tia sét màu vàng tượng trưng cho sức mạnh của thiên nhiên, tinh thần vượt qua sóng gió của các chiến binh sao vàng.</p>\r\n<figure><img src=\"../img/upload/news/681b70c6892c7.png\" alt=\"\" width=\"400\" height=\"400\">\r\n<figcaption>Bộ quần áo có mức giá khoảng 379.000 đồng</figcaption>\r\n</figure>\r\n<ol start=\"2\">\r\n<li>Áo Polo Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Áo polo là lựa chọn lịch sự, phù hợp với nhiều dịp. Mẫu áo polo 2025 có cổ bẻ, chất liệu thoáng khí. Họa tiết của áo lấy cảm hứng từ hình ảnh sao băng, biểu tượng cho sự tỏa sáng, tốc độ và khát khao chinh phục. Những vệt sáng trên nền áo tượng trưng cho ước mơ vươn xa, khẳng định bản lĩnh trên sân cỏ, giống như cách các cầu thủ Việt Nam không ngừng nỗ lực để tỏa sáng trên đấu trường quốc tế.</p>\r\n<figure><img src=\"/baocao/view/img/upload/news/681b70f17a4d9.png\" alt=\"\" width=\"500\" height=\"500\">\r\n<figcaption>Áo có mức giá khoảng 379.000 đồng</figcaption>\r\n</figure>\r\n<ol start=\"3\">\r\n<li>Áo Thi Đấu Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Áo thi đấu chính thức luôn là sản phẩm được fan săn lùng nhiều nhất. Phiên bản 2025 có 2 phiên bản sân nhà (đỏ) và sân khách (trắng), với họa tiết cách điệu từ hình ảnh lá cờ đỏ sao vàng. Chất liệu 100% polyester có khả năng chống nhăn, không bai dão sau thời gian dài sử dụng. Điều này giúp áo luôn giữ được phom dáng sắc nét, thể hiện sự mạnh mẽ và tinh thần thể thao.</p>\r\n<p>Áo thi đấu có họa tiết dãy núi trùng điệp – tượng trưng cho một Việt Nam kiên cường, bất khuất. Như hành trình của đội tuyển quốc gia, chưa bao giờ dễ dàng nhưng cũng chưa bao giờ chùn bước. Mỗi đường nét trên áo là một dấu ấn mạnh mẽ, nhắc nhở rằng: Không bao giờ lùi bước, chỉ có tiến lên để giành vinh quang!</p>',NULL,'2025-05-07 21:41:33','8','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('35','Những Phụ Kiện Bóng Chuyền Đồng Hành Cùng Các VĐV Tại AVC Champion League','<p>AVC Champion League là giải đấu bóng chuyền hàng đầu châu Á, nơi các vận động viên (VĐV) thi đấu với đỉnh cao phong độ. Để đạt hiệu suất tốt nhất, ngoài kỹ thuật và thể lực, các phụ kiện hỗ trợ như băng gối, băng khuỷu tay và giày bóng chuyền đóng vai trò quan trọng. Bài viết này sẽ phân tích tầm quan trọng của các phụ kiện này trong hành trình chinh phục đỉnh cao của các VĐV.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822adb952dbc.png\" alt=\"\" width=\"700\" height=\"466\"></p>\r\n<p>1. Băng Gối Bóng Chuyền – \"Áo Giáp\" Bảo Vệ Đầu Gối</p>\r\n<p>Vì Sao VĐV AVC Luôn Dùng Băng Gối &amp; Băng Khuỷu Tay?</p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Giảm Chấn Thương Trực Tiếp</p>\r\n</li>\r\n</ul>\r\n<p>Khớp gối phải chịu lực gấp 8 lần trọng lượng cơ thể khi bật nhảy/tiếp đất</p>\r\n<p>Khuỷu tay dễ bị tổn thương khi đỡ bóng hoặc va chạm</p>\r\n<p> </p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Hỗ Trợ Vận Động Chuyên Nghiệp</p>\r\n</li>\r\n</ul>\r\n<p>Cho phép cử động linh hoạt 180 độ</p>\r\n<p>Giữ ổn định khớp trong những tình huống xoay người đột ngột</p>\r\n<p> </p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Ngăn Ngừa Chấn Thương Mãn Tính</p>\r\n</li>\r\n</ul>\r\n<p>Giảm nguy cơ viêm khớp, tràn dịch khớp về lâu dài</p>\r\n<p>Hạn chế tình trạng đau nhức sau trận đấu</p>\r\n<p></p>',NULL,'2025-05-08 08:43:54','3','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('36','Trọn Bộ 6 Phiên Bản Vợt Pickleball Aspire x Phúc Huỳnh','<p>Huỳnh Thiên Phúc hay còn gọi Phúc Huỳnh sinh năm 2000. Phúc Huỳnh là VĐV pickleball chuyên nghiệp từng gây tiếng vang khi thắng nội dung đơn 19+ tại giải pickleball châu Á mở rộng 2024. Khi phong trào pickleball phát triển tại Việt Nam, Phúc Huỳnh đã trở về nước thi đấu, anh mong muốn sẽ được cùng Việt Nam tham dự các giải đấu quốc tế.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad79aa9e4.png\" alt=\"\" width=\"700\" height=\"525\"></p>\r\n<p>Hiện tại, tay vợt Pickleball số 1 châu Á ở nội dung đơn nam đã trở thành đại sứ thương hiệu vợt Zocker cùng với màn ra mắt dòng Vợt Pickleball Aspire x Phúc Huỳnh cao cấp. Nếu bạn đang tìm kiếm một cây vợt pickleball chất lượng, cân bằng giữa hiệu suất và giá trị, Zocker Aspire x Phúc Huỳnh chính là sự lựa chọn hoàn hảo. Được thiết kế dành riêng cho người chơi từ cơ bản đến nâng cao, cây vợt này sở hữu công nghệ tiên tiến cùng thiết kế đẹp mắt, mang đến trải nghiệm thi đấu đỉnh cao.</p>',NULL,'2025-05-08 08:44:57','1','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('37','Hướng Dẫn Cách Cầm Gậy Bi-A Cho Người Mới Chơi','<p>Bi-a là môn thể thao đòi hỏi sự chính xác, kỹ thuật và tư thế cầm gậy đúng. Nếu bạn mới tập chơi, việc học cách cầm gậy bi-a chuẩn ngay từ đầu sẽ giúp cải thiện khả năng điều khiển lực, nâng cao độ chính xác và tránh những thói quen xấu khó sửa sau này. Bài viết này sẽ hướng dẫn chi tiết từ A-Z cách cầm gậy bi-a cho người mới chơi.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad6774901.png\" alt=\"\" width=\"700\" height=\"467\"></p>\r\n<p>1. Chọn Gậy Bi-A Cho Người Mới Chơi</p>\r\n<p>Trước khi học cách cầm gậy, bạn cần chọn một cây cue phù hợp:</p>\r\n<p>Độ dài: Thông thường từ 1.4m – 1.5m, phù hợp với chiều cao người chơi.</p>\r\n<p>Trọng lượng: Khoảng 480–520 gram, không quá nặng hoặc quá nhẹ.</p>\r\n<p>Chất liệu: Gỗ maple hoặc carbon fiber, đảm bảo độ cứng và độ đàn hồi tốt.</p>\r\n<p> </p>\r\n<p>Một số loại gậy đánh bi-a phù hợp cho người mới chơi:</p>\r\n<p>Gậy đánh bi-a Peri STV-04 (6.000.000 đồng)</p>\r\n<p>Gậy đánh bi-a Peri Baron R-D08 (5.800.000 đồng)</p>\r\n<p>Gậy đánh bi-a Peri ST-01 (5.800.000 đồng)</p>',NULL,'2025-05-08 08:46:21','6','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('38','AVC Nation Cup Và AVC Champions League Có Gì Khác Nhau? Đại Diện Việt Nam Tại Giải 2025','<p>AVC (Asian Volleyball Confederation) tổ chức 2 giải đấu lớn nhất châu Á là AVC Nation Cup và AVC Champions League. Dù cùng là giải bóng chuyền nhưng quy mô, đối tượng tham gia và thể thức thi đấu khác nhau. Bài viết này sẽ so sánh chi tiết và cập nhật thông tin đội tuyển Việt Nam năm 2025 mà người hâm mộ không thể bỏ qua.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad5590159.png\" alt=\"\" width=\"700\" height=\"457\"></p>',NULL,'2025-05-08 08:46:56','5','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('39','Cách chọn mua bóng chuyền hơi chuẩn thi đấu','<p><img src=\"/baocao/view/img/upload/news/6826aaa53f833.png\" alt=\"\" width=\"700\" height=\"466\"></p>\r\n<p>1. Bộ môn bóng chuyền hơi là gì?</p>\r\n<p>Bộ môn bóng chuyền hơi là một biến thể của môn bóng chuyền truyền thống, được thiết kế để phù hợp với nhiều đối tượng chơi, đặc biệt là người trung niên, cao tuổi hoặc những người mới tập luyện thể thao. Bóng chuyền hơi thường làm từ nhựa mềm, nhẹ hơn bóng chuyền da truyền thống, giúp giảm tác động lên tay và cơ thể người chơi.</p>\r\n<p></p>',NULL,'2025-05-08 08:47:36','19','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('40','Bóng Rổ 3x3 Là Gì? Cách Chơi & Dòng Bóng Tốt Nhất','<ol>\r\n<li>Bóng rổ 3x3 là gì?</li>\r\n</ol>\r\n<p>Bóng rổ 3x3 (còn gọi là bóng rổ 3 người) là một biến thể của bóng rổ truyền thống, được chơi trên một sân nhỏ hơn với 1 rổ duy nhất và 3 cầu thủ mỗi đội. Môn thể thao này đã trở nên phổ biến toàn cầu và trở thành nội dung thi đấu chính thức tại Thế vận hội Olympic 2020.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681c0d85e8052.png\" alt=\"\" width=\"700\" height=\"606\"></p>\r\n<p>Đặc điểm nổi bật của bóng rổ 3x3:</p>\r\n<p>Thời gian ngắn: Mỗi trận kéo dài 10 phút hoặc đội nào ghi 21 điểm trước sẽ thắng.</p>\r\n<p>Luật chơi đơn giản: Không có đồng hồ 24 giây, chỉ cần đưa bóng ra khỏi vạch 2 điểm sau khi bắt bóng bật bảng.</p>\r\n<p>Tốc độ cao: Phù hợp với lối chơi tấn công nhanh và kỹ thuật cá nhân.</p>\r\n<ol start=\"2\">\r\n<li>Cách chơi bóng rổ 3x3 cơ bản</li>\r\n</ol>\r\n<p>Luật chơi chính:</p>\r\n<p>Mỗi đội 3 người (có thể có 1 cầu thủ dự bị).</p>\r\n<p>Bắt đầu trận đấu: Tung đồng xu hoặc oẳn tù tì để chọn quyền giao bóng.</p>\r\n<p>Tính điểm: 1 điểm cho mỗi pha ném phạt hoặc ném trong vạch 2 điểm. 2 điểm cho ném ngoài vạch 2 điểm.</p>\r\n<p>Thay người: Được thay tự do khi bóng \"chết\".</p>\r\n<p>Phạm lỗi: Mỗi đội chỉ được 6 lỗi, từ lỗi thứ 7 trở đi đối phương được ném phạt.</p>\r\n<p>Chiến thuật phổ biến:</p>\r\n<p>Pick &amp; Roll (Cản rồi xoay người) để tạo khoảng trống ném rổ.</p>\r\n<p>Drive &amp; Kick (Dẫn bóng vào trong rồi chuyền ra ngoài) để tạo cơ hội ném 2 điểm.</p>\r\n<p>Phòng thủ chặt (Man-to-man) để hạn chế đối phương ghi điểm.</p>',NULL,'2025-05-08 08:49:08','13','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('41','TIÊU CHÍ ĐỂ MUA CƠ BI-A CHUẨN, CHẤT LƯỢNG','<p>Khi nhắc đến bộ môn bi-a, việc sở hữu một cây cơ bi-a chất lượng là yếu tố quan trọng giúp bạn nâng cao kỹ năng và tận hưởng trọn vẹn niềm đam mê. Tuy nhiên, không phải ai cũng biết cách mua cơ bi-a chuẩn và phù hợp. Bài viết này sẽ hướng dẫn bạn cách mua cơ bi-a chất lượng, đảm bảo hiệu suất tối ưu khi chơi.</p>\r\n<ol>\r\n<li>Chất Liệu Của Cơ Bi-a Chất liệu là yếu tố đầu tiên quyết định độ bền và hiệu suất của cơ bi-a. Các loại gỗ phổ biến như gỗ phong (Maple) hoặc gỗ hồng đào (Rosewood) thường được ưa chuộng vì độ cứng và khả năng chịu lực tốt. Bạn nên chọn cơ làm từ gỗ tự nhiên, tránh các loại gỗ công nghiệp dễ bị cong vênh. Các dòng gậy/ cơ bi-a từ thương hiệu Peri được làm từ chất liệu Gỗ Phong (Maple). Bạn có thể tham khảo một số dòng cơ Peri dưới đây: Gậy đánh bi-a Peri Speedy SY-02 PR-SY-02 Gậy đánh bi-a Peri ST-02 PR-ST-02 Gậy đánh bi-a Peri Baron R-D05 PR-R-D05</li>\r\n</ol>\r\n<p><img src=\"https://bizweb.dktcdn.net/thumb/1024x1024/100/485/982/products/1-1713578604031.jpg?v=1713578610243\" alt=\"\" width=\"700\" height=\"700\"></p>\r\n<p></p>',NULL,'2025-05-08 08:49:39','12','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('42','TOP 6 PHỤ KIỆN PICKLEBALL KHÔNG THỂ THIẾU: Hướng dẫn chọn mua','<p>Pickleball là môn thể thao kết hợp giữa tennis, cầu lông và bóng bàn, đang ngày càng phổ biến trên toàn thế giới. Để chơi pickleball hiệu quả và an toàn, việc chuẩn bị đầy đủ các vật phẩm cần thiết là điều không thể bỏ qua. Dưới đây là những phụ kiện pickleball không thể thiếu mà bạn cần biết.</p>\r\n<p><img src=\"https://bizweb.dktcdn.net/100/485/982/files/f9ecc92cbe6c0e32577d1.jpg?v=1742376266226\" alt=\"\" width=\"700\" height=\"700\"></p>',NULL,'2025-05-08 08:50:11','21','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('43','Kỹ Thuật Chơi Pickleball: Hướng Dẫn Từ Cơ Bản Đến Nâng Cao','<p>Pickleball là môn thể thao kết hợp giữa quần vợt, cầu lông và bóng bàn, đang ngày càng phổ biến nhờ luật chơi đơn giản và phù hợp với mọi lứa tuổi. Để chơi tốt Pickleball, bạn cần nắm vững các kỹ thuật chơi pickleball cơ bản và luyện tập thường xuyên. Dưới đây là một số kỹ thuật quan trọng giúp bạn cải thiện trình độ.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681c0df777d32.webp\" alt=\"\" width=\"700\" height=\"467\"></p>',NULL,'2025-05-08 08:50:52','31','1');
INSERT INTO `tintuc` (`id`,`title`,`content`,`author`,`created_at`,`view_count`,`active`) VALUES ('44','So Sánh Các Mẫu Bóng Chuyền Thăng Long Dragon Master: Nên Chọn Loại Nào?','<p>Bóng chuyền Thăng Long Dragon Master là một trong những thương hiệu uy tín được nhiều vận động viên và người chơi thể thao tin dùng. Trong đó, các dòng DG7700, DG7400 và DG7000 là những sản phẩm nổi bật với chất lượng vượt trội. Bài viết này sẽ so sánh chi tiết để giúp bạn lựa chọn quả bóng phù hợp nhất với nhu cầu của mình.1213313</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6826aacfb754b.png\" alt=\"\" width=\"500\" height=\"281\"></p>\r\n<table border=\"1\" style=\"border-collapse: collapse; width: 99.9774%; height: 108px;\"><colgroup><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"></colgroup>\r\n<tbody>\r\n<tr style=\"height: 36px;\">\r\n<td>Đặc Điểm</td>\r\n<td>\r\n<p>DG7700</p>\r\n</td>\r\n<td>\r\n<p>DG7400</p>\r\n</td>\r\n<td>\r\n<p>DG7000</p>\r\n</td>\r\n</tr>\r\n<tr style=\"height: 36px;\">\r\n<td>\r\n<p>Chất liệu</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n</tr>\r\n<tr style=\"height: 36px;\">\r\n<td>\r\n<p>Trọng lượng</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n</tr>\r\n</tbody>\r\n</table>\r\n<p></p>',NULL,'2025-05-16 10:09:28','8','1');


-- Table structure for `votcaulong`
DROP TABLE IF EXISTS `votcaulong`;
CREATE TABLE `votcaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `warrenty` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_caulong_id_votcl` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_caulong_id_votcl` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  CONSTRAINT `votcaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `votcaulong`
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','vcl11.webp','vcl12.webp','vcl13.webp','vcl14.webp','Vợt cầu lông Jogarbola Control J750 \"Purple/Blue\" J750-03 - Hàng Chính Hãng','Động Lực','695000','700000','12','5','1','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','vcl21.webp','vcl22.webp','vcl23.webp','vcl24.webp','Vợt cầu lông Jogarbola Control J750 \"Orange/Yellow\" J750-02 - Hàng Chính Hãng','Động Lực','695000','700000','12','5','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','vcl41.webp','vcl42.webp','vcl43.webp','vcl44.webp','Vợt cầu lông Jogarbola Power J800 \"White/Yellow\" J800-04 - Hàng Chính Hãng','Động Lực','795000','0','12','5','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','vcl51.webp','vcl52.webp','vcl53.webp','vcl54.webp','Vợt cầu lông Jogarbola Power J800 \"White/Purple\" J800-03 - Hàng Chính Hãng','Động Lực','795000','0','12','5','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','7','vcl31.webp','vcl32.webp','vcl33.webp','vcl34.webp','Vợt cầu lông Jogarbola Control J750 \"Green/Navy\" J750-01 - Hàng Chính Hãng','Động Lực','649000','0','12','5','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','8','1-1729075726361.webp','j800-2-1729651264519.webp','2-1729075726362.webp','3-1729075726364.webp','Vợt cầu lông Jogarbola Control J750 \"Orange/Yellow\" J750-02 - Hàng Chính Hãng','Bubadu','695000','720000','2','10','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','9','1-1729075690794.webp','j800-3-1729651256306.webp','2-1729075690796.webp','3-1729075690798.webp','Vợt cầu lông Bubadu Control J750 \"Green/Navy\" J750-01 - Hàng Chính Hãng','Bubadu','695000','720000','2','10','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','10','1-1729075258827.jpg','j750-1-1729651208838.webp','2-1729075258829.jpg','3-1729075258830.jpg','Vợt cầu lông Bubadu Power J800 \"Black/Orange\" J800-02 - Hàng Chính Hãng','Bubadu','795000','820000','2','10','0','1','19');
INSERT INTO `votcaulong` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','11','1-1729075222464.webp','j750-4-1729651190127.webp','2-1729075222466.webp','3-1729075222469.webp','Vợt cầu lông Jogarbola Power J800 \"Black/Blue\" J800-01 - Hàng Chính Hãng','Động Lực','795000','0','2','20','1','1','22');


-- Table structure for `votpickleball`
DROP TABLE IF EXISTS `votpickleball`;
CREATE TABLE `votpickleball` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `image2` varchar(255) DEFAULT NULL,
  `image3` varchar(255) DEFAULT NULL,
  `image4` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `oprice` varchar(255) DEFAULT NULL,
  `warrenty` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `view` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `description_id` int(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pick_id_votpick` (`parent_id`),
  KEY `description_id` (`description_id`),
  CONSTRAINT `fk_pick_id_votpick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  CONSTRAINT `votpickleball_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Dumping data for table `votpickleball`
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','2','vpk11.webp','vpk12.webp','vpk13.webp','vpk14.webp','Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Blue\" ZAxPH-06 - Hàng Chính Hãng','Zocker','3890000','0','12','5','1','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','3','vpk21.webp','vpk22.webp','vpk23.webp','vpk24.webp','Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Black\" ZAxPH-05 - Hàng Chính Hãng','Zocker','3890000','0','12','5','3','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','4','vpk31.webp','vpk32.webp','vpk33.webp','vpk34.webp','Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Pink\" ZAxPH-04 - Hàng Chính Hãng','Zocker','3890000','0','12','5','0','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','5','vpk41.webp','vpk42.webp','vpk43.webp','vpk44.webp','Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"White\" ZAxPH-03 - Hàng Chính Hãng','Zocker','3890000','0','12','5','0','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','6','vpk51.webp','vpk52.webp','vpk53.webp','vpk54.webp','Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Purple\" ZAxPH-02 - Hàng Chính Hãng','Zocker','3890000','0','12','5','0','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','7','1-1740371873919.webp','2-1740371873922.webp','3-1740371873924.webp','4-1740371873927.webp','Vợt Pickleball Zocker Happy HP01 Standard Thunder \"White/Pink\" HP01-05 - Hàng Chính Hãng','Zocker','800000','0','2','10','1','1','19');
INSERT INTO `votpickleball` (`parent_id`,`id`,`image`,`image2`,`image3`,`image4`,`name`,`brand`,`price`,`oprice`,`warrenty`,`quantity`,`view`,`is_active`,`description_id`) VALUES ('1','8','1-1744361691008.webp','2-1744361691010.webp','3-1744361691012.webp','4-1744361691014.webp','Vợt Pickleball Zocker Happy HP05 Pro Series \"Black\" HP05-B - Hàng Chính Hãng','Zocker','2690000','0','1','20','1','1','21');


-- Table structure for `voucher`
DROP TABLE IF EXISTS `voucher`;
CREATE TABLE `voucher` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `active` int(11) NOT NULL,
  `id_user` int(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_khachhang_id_voucher` (`id_user`),
  CONSTRAINT `fk_voucher_id_user_khachang` FOREIGN KEY (`id_user`) REFERENCES `khachhang` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `voucher`
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('2','100K','Mã giảm giá WTT100\r\nNhập mã để giảm ngay 100K','WTT100','100000','1','1');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('3','200K','Mã giảm giá WTT200\r\nNhập mã để giảm ngay 200K','WTT200','200000','0','2');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('4','Freeship','Mã giảm giá FREESHIP\r\nNhập mã để miễn phí vận chuyển','FREESHIP','FREESHIP','1','2');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('5','50K','Mã giảm giá WTT50\r\nNhập mã để giảm ngay 50K','WTT50','50000','1','1');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('33','WTT20','Mã giảm 20k','WTT20','20000','1','1');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('34','WTT20','Mã giảm 20k','WTT20','20000','0','2');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('35','10K','Mã giảm 10k','WTT10','10000','1','1');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('36','10K','Mã giảm 10k','WTT10','10000','0','2');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('37','10K','Mã giảm 10k','WTT10','10000','1','17');
INSERT INTO `voucher` (`id`,`title`,`content`,`name`,`price`,`active`,`id_user`) VALUES ('38','1k','Mã giảm 1k','WTT1K','1000','0','2');

SET FOREIGN_KEY_CHECKS=1;
