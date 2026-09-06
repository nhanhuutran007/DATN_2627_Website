-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th5 22, 2025 lúc 03:18 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `nhlsports`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `aobia`
--

CREATE TABLE `aobia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `aobia`
--

INSERT INTO `aobia` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'abia11.webp', 'abia12.webp', 'abia13.webp', '', 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng', 'Sao Vàng', '1249000', '1300000', 20, 6, 1, 1),
(2, 3, 'abia21.webp', 'abia22.webp', 'abia23.webp', '', 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng', 'Sao Vàng', '1249000', '1300000', 20, 3, 1, 1),
(2, 4, 'abia31.webp', 'abia32.webp', 'abia33.webp', '', 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng', 'Sao Vàng', '1249000', '1300000', 20, 1, 1, 1),
(2, 5, 'abia41.webp', 'abia42.webp', 'abia43.webp', 'abia44.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'Sao Vàng', '1249000', '1300000', 15, 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bia`
--

CREATE TABLE `bia` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `bia`
--

INSERT INTO `bia` (`topic_id`, `id`, `item`) VALUES
(7, 1, 'Gậy Bia'),
(7, 2, 'Áo Bia'),
(7, 3, 'Phụ Kiện Bia');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bongchuyen`
--

CREATE TABLE `bongchuyen` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `bongchuyen`
--

INSERT INTO `bongchuyen` (`topic_id`, `id`, `item`) VALUES
(2, 1, 'Quả Bóng Chuyền'),
(2, 2, 'Giày Bóng Chuyền'),
(2, 3, 'Quần Áo Bóng Chuyền'),
(2, 4, 'Phụ Kiện Bóng Chuyền');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bongda`
--

CREATE TABLE `bongda` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `bongda`
--

INSERT INTO `bongda` (`topic_id`, `id`, `item`) VALUES
(3, 1, 'Quả Bóng Đá'),
(3, 2, 'Giày Bóng Đá'),
(3, 3, 'Quần Áo Bóng Đá'),
(3, 4, 'Phụ Kiện Bóng Đá');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `bongro`
--

CREATE TABLE `bongro` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `bongro`
--

INSERT INTO `bongro` (`topic_id`, `id`, `item`) VALUES
(1, 1, 'Quả Bóng Rổ'),
(1, 2, 'Giày Bóng Rổ'),
(1, 3, 'Quần Áo Bóng Rổ'),
(1, 4, 'Phụ Kiện Bóng Rổ');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `category_nav_items`
--

CREATE TABLE `category_nav_items` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `position` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `category_nav_items`
--

INSERT INTO `category_nav_items` (`id`, `name`, `category`, `position`, `created_at`) VALUES
(2, 'Đồ bóng chuyền SALE OFF!', 'bongchuyen', 2, '2025-04-06 14:20:02'),
(3, 'Đồ Bi-a Chính Hãng', 'bia', 3, '2025-04-06 14:20:02'),
(4, 'Đồ cầu lông', 'caulong', 4, '2025-04-06 14:20:02'),
(5, 'SALE OUTLET 40%', 'saleoutlet40', 5, '2025-04-06 14:20:02');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `caulong`
--

CREATE TABLE `caulong` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `caulong`
--

INSERT INTO `caulong` (`topic_id`, `id`, `item`) VALUES
(6, 1, 'Vợt Cầu Lông'),
(6, 2, 'Cầu Thi Đấu'),
(6, 3, 'Giày Cầu Lông'),
(6, 4, 'Quần Áo Cầu Lông'),
(6, 5, 'Phụ Kiện Cầu Lông');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cauthidau`
--

CREATE TABLE `cauthidau` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `cauthidau`
--

INSERT INTO `cauthidau` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'ctd11.webp', '', '', '', 'Hộp cầu lông Động Lực Promax PR-27054 - Hàng Chính Hãng', 'Động Lực', '280000', '300000', 5, 0, 1, 20),
(2, 3, 'ctd21.webp', 'ctd22.webp', '', '', 'Hộp cầu lông Động Lực Promax PR-18103 - Hàng Chính Hãng', 'Động Lực', '300000', '0', 5, 0, 1, 20),
(2, 4, 'ctd31.webp', 'ctd32.webp', '', '', 'Hộp cầu lông Động Lực Promax PR-10521 - Hàng Chính Hãng', 'Động Lực', '180000', '0', 5, 0, 1, 20);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chaybo`
--

CREATE TABLE `chaybo` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chaybo`
--

INSERT INTO `chaybo` (`topic_id`, `id`, `item`) VALUES
(5, 1, 'Giày Chạy Bộ'),
(5, 2, 'Quần Áo Chạy Bộ'),
(5, 3, 'Phụ Kiện Chạy Bộ');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `donhang`
--

CREATE TABLE `donhang` (
  `id` int(255) NOT NULL,
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
  `trangthai` varchar(50) NOT NULL DEFAULT 'Đang xử lý'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `donhang`
--

INSERT INTO `donhang` (`id`, `username`, `fullname`, `phone`, `address`, `totalAll`, `sale`, `tienship`, `freeship`, `grandtotal`, `paymentmethod`, `note`, `ngaydat`, `trangthai`) VALUES
(46, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '649000', '0', '30000', 'no', '679000', 'cod', '', '2025-03-25 11:05:28', 'Đã hủy'),
(49, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '649000', '0', '30000', 'no', '679000', 'cod', '', '2025-03-25 21:28:18', 'Đã giao'),
(50, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '1040000', '0', '30000', 'no', '1070000', 'cod', '', '2025-04-26 11:51:42', 'Đã giao'),
(51, 'haochuai', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '198000', '0', '30000', 'no', '228000', '', '', '2025-04-26 18:20:41', 'Đã hủy'),
(52, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '99000', '0', '30000', 'no', '129000', 'bank-transfer', '', '2025-04-26 18:32:33', 'Đang xử lý'),
(53, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '99000', '0', '30000', 'no', '129000', 'bank-transfer', '', '2025-04-26 22:45:08', 'Đã hủy'),
(54, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '629000', '0', '30000', 'no', '659000', 'cod', '', '2025-04-26 23:30:53', 'Đang xử lý'),
(55, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '595000', '0', '30000', 'no', '625000', 'cod', '', '2025-04-27 17:13:09', 'Đang xử lý'),
(57, 'haochuai', 'nma', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 11:44:42', 'Đang xử lý'),
(58, '', 'nma', '0777566324', 'q8', '379000', '0', '30000', 'no', '409000', 'bank-transfer', '', '2025-05-11 15:21:34', 'Đang xử lý'),
(59, '', 'nma', '0777566324', 'q8', '379000', '0', '30000', 'no', '409000', 'cod', '', '2025-05-11 15:26:06', 'Đang xử lý'),
(60, '', 'nma', '0777566324', 'q8', '379000', '0', '30000', 'no', '409000', 'cod', '', '2025-05-11 15:28:45', 'Đang xử lý'),
(61, 'haochuai', 'nam', '0777566324', 'q8', '295000', '200000', '30000', 'no', '125000', 'bank-transfer', '', '2025-05-11 15:44:18', 'Đang xử lý'),
(62, 'haochuai', 'nam', '0777566324', 'q8', '295000', '0', '30000', 'no', '325000', 'cod', '', '2025-05-11 15:55:36', 'Đang xử lý'),
(63, 'haochuai', 'nam', '0777566324', 'q8', '295000', '0', '30000', 'no', '325000', 'bank-transfer', '', '2025-05-11 15:59:01', 'Đang xử lý'),
(64, 'haochuai', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 16:07:21', 'Đang xử lý'),
(65, 'haochuai', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 16:11:29', 'Đang xử lý'),
(66, 'haochuai', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 16:14:20', 'Đang xử lý'),
(67, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '1309000', '0', '30000', 'no', '1339000', 'cod', '', '2025-05-11 20:05:31', 'Đang xử lý'),
(68, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '520000', '0', '30000', 'no', '550000', 'cod', '', '2025-05-11 20:27:40', 'Đang xử lý'),
(69, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '600000', '0', '30000', 'no', '630000', 'cod', '', '2025-05-11 20:53:40', 'Đang xử lý'),
(70, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '600000', '0', '30000', 'no', '630000', 'cod', '', '2025-05-11 21:01:07', 'Đang xử lý'),
(71, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '600000', '0', '30000', 'no', '630000', 'cod', '', '2025-05-11 21:02:19', 'Đang xử lý'),
(72, '', 'huỳnh nhật nam', '0777566324', '1436 trịnh quang nghị phường 7 quận 8 hồ chí minh', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 21:03:20', 'Đang xử lý'),
(73, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 22:36:46', 'Đang xử lý'),
(74, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'bank-transfer', '', '2025-05-11 22:43:22', 'Đang xử lý'),
(75, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 22:44:03', 'Đang xử lý'),
(76, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 22:50:01', 'Đang xử lý'),
(77, '', 'nam', '0777566324', 'q8', '295000', '0', '30000', 'no', '325000', 'cod', '', '2025-05-11 22:54:02', 'Đang xử lý'),
(78, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'bank-transfer', '', '2025-05-11 22:56:29', 'Đang xử lý'),
(79, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-11 22:57:08', 'Đang xử lý'),
(80, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'bank-transfer', '', '2025-05-12 00:31:45', 'Đang xử lý'),
(81, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 00:32:13', 'Đã giao'),
(82, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 00:42:04', 'Đang xử lý'),
(83, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 00:42:26', 'Đang xử lý'),
(84, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'bank-transfer', '', '2025-05-12 00:44:06', 'Đang xử lý'),
(85, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 00:54:35', 'Đang xử lý'),
(86, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 01:03:54', 'Đang xử lý'),
(87, '', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 06:48:58', 'Đang xử lý'),
(88, '', 'nam', '0777566324', 'q8', '1249000', '0', '30000', 'no', '1279000', 'cod', '', '2025-05-12 07:50:16', 'Đang xử lý'),
(89, '', 'nam', '0777566324', 'q8', '1249000', '0', '30000', 'no', '1279000', 'cod', '', '2025-05-12 07:51:02', 'Đang xử lý'),
(90, '', 'nam', '0777566324', 'q8', '1249000', '0', '30000', 'no', '1279000', 'cod', '', '2025-05-12 07:58:01', 'Đang xử lý'),
(91, '', 'hào', '0777566324', 'q8', '1249000', '0', '30000', 'no', '1279000', 'cod', '', '2025-05-12 08:05:04', 'Đang xử lý'),
(92, '', 'hào', '0777566324', 'q8', '1249000', '0', '30000', 'no', '1279000', 'cod', '', '2025-05-12 08:05:42', 'Đang xử lý'),
(93, '', 'hào', '0777566324', 'q8', '55000', '0', '30000', 'no', '85000', 'cod', '', '2025-05-12 08:39:59', 'Đang xử lý'),
(94, '', 'hào', '0777566324', 'q8', '55000', '0', '30000', 'no', '85000', 'cod', '', '2025-05-12 08:42:13', 'Đang xử lý'),
(95, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 22:38:01', 'Đang giao'),
(96, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 22:42:52', 'Đang giao'),
(97, 'haochuai', 'nam', '0777566324', 'q8', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-12 22:53:45', 'Đang giao'),
(98, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 23:03:21', 'Đã hủy'),
(99, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 23:05:19', 'Đang giao'),
(100, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 23:10:06', 'Đã giao'),
(101, 'haochuai', 'nam', '0777566324', 'q8', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-12 23:26:19', 'Đang xử lý'),
(102, 'haochuai', 'nam', '0777566324', 'q8', '395000', '0', '30000', 'no', '425000', 'cod', '', '2025-05-12 23:27:20', 'Đang xử lý'),
(103, 'haochuai', 'nam', '0777566324', 'q8', '758000', '0', '30000', 'no', '788000', 'cod', '', '2025-05-12 23:30:36', 'Đang giao'),
(104, 'haochuai', 'nam', '0777566324', 'q8', '758000', '0', '30000', 'no', '788000', 'cod', '', '2025-05-12 23:33:24', 'Đã hủy'),
(105, 'haochuai', 'nam', '0777566324', 'q8', '99000', '0', '30000', 'no', '129000', 'cod', '', '2025-05-12 23:37:40', 'Đã giao'),
(106, '', 'Phú Quốc', '0777566324', 'Hồ Chí Minh', '789000', '0', '30000', 'no', '819000', 'cod', 'Giao vào buổi chiều', '2025-05-13 09:29:19', 'Đã hủy'),
(107, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh\r\nHồ Chí Minh', '519000', '0', '30000', 'no', '549000', 'cod', '', '2025-05-13 09:31:22', 'Đang xử lý'),
(108, '', 'Văn Liêm', '0777566324', 'Hồ Chí Minh', '990000', '0', '30000', 'no', '1020000', 'bank-transfer', '', '2025-05-13 22:46:56', 'Đang xử lý'),
(109, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '3432000', '0', '30000', 'no', '3462000', 'cod', '', '2025-05-13 23:26:19', 'Đang giao'),
(110, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '595000', '0', '30000', 'no', '625000', 'cod', '', '2025-05-15 13:21:27', 'Đang xử lý'),
(111, '', 'Huynh Nhat Liêm', '0777566324', 'Hồ Chí Minh', '145000', '0', '30000', 'no', '175000', 'cod', '', '2025-05-15 13:24:15', 'Đang xử lý'),
(112, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '295000', '0', '30000', 'no', '325000', 'cod', '', '2025-05-15 13:33:53', 'Đang xử lý'),
(113, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '99000', '0', '30000', 'no', '129000', 'cod', '', '2025-05-15 14:19:06', 'Đang xử lý'),
(114, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '2294000', '0', '30000', 'no', '2324000', 'bank-transfer', 'Giao vào ktx', '2025-05-15 14:39:59', 'Đang xử lý'),
(115, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '69000', '0', '30000', 'no', '99000', 'cod', '', '2025-05-15 14:41:10', 'Đã hủy'),
(116, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '899999', '0', '30000', 'no', '929999', 'cod', '', '2025-05-16 23:14:10', 'Đang xử lý'),
(117, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '350000', '0', '30000', 'no', '380000', 'cod', '', '2025-05-16 23:20:21', 'Đang xử lý'),
(118, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '329000', '0', '30000', 'no', '359000', 'cod', '', '2025-05-16 23:24:10', 'Đang xử lý'),
(119, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '1449000', '0', '30000', 'no', '1479000', 'cod', '', '2025-05-16 23:25:33', 'Đang xử lý'),
(120, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '30000', '0', '30000', 'no', '60000', 'cod', '', '2025-05-17 17:32:22', 'Đang xử lý'),
(121, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 11:21:29', 'Đang xử lý'),
(122, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 15:38:23', 'Đang xử lý'),
(123, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 15:44:06', 'Đang xử lý'),
(124, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 15:45:20', 'Đang xử lý'),
(125, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 15:49:54', 'Đang xử lý'),
(126, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 15:50:33', 'Đang xử lý'),
(127, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 16:22:32', 'Đang xử lý'),
(128, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 16:25:30', 'Đang xử lý'),
(129, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'cod', '', '2025-05-18 16:26:23', 'Đang xử lý'),
(131, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 16:42:49', 'Đang xử lý'),
(132, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 16:46:43', 'Đang xử lý'),
(133, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 16:49:32', 'Đang xử lý'),
(134, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 16:51:00', 'Đang xử lý'),
(135, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 17:55:17', 'Đang xử lý'),
(136, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 20:08:15', 'Đang xử lý'),
(137, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '200', '0', '1900', 'no', '2100', 'bank-transfer', '', '2025-05-18 20:26:22', 'Đang xử lý'),
(138, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '200', '0', '1900', 'no', '2100', 'bank-transfer', '', '2025-05-18 20:35:06', 'Đang xử lý'),
(139, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-18 20:49:34', 'Đang xử lý'),
(140, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 12:49:19', 'Đang xử lý'),
(141, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 12:49:24', 'Đang xử lý'),
(142, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 12:50:59', 'Đang xử lý'),
(143, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 12:54:44', 'Đang xử lý'),
(144, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 12:54:49', 'Đang xử lý'),
(145, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 13:15:17', 'Đang xử lý'),
(146, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 13:19:05', 'Đã hủy'),
(147, 'admin', 'Huỳnh Nhật Nam', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-20 15:53:47', 'Đã giao'),
(148, 'haochuai', 'Nguyễn Nhật Hào', '0777566324', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', '955000', '20000', '1900', 'no', '936900', 'cod', '', '2025-05-20 16:01:47', 'Đang xử lý'),
(149, '', 'Huynh Nhat Nam', '0777566324', 'Hồ Chí Minh', '100', '0', '1900', 'no', '2000', 'bank-transfer', '', '2025-05-21 21:15:04', 'Đang xử lý');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `donhangchitiet`
--

CREATE TABLE `donhangchitiet` (
  `id` int(255) NOT NULL,
  `image` varchar(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `iddonhang` int(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `donhangchitiet`
--

INSERT INTO `donhangchitiet` (`id`, `image`, `name_product`, `size`, `quantity`, `price`, `iddonhang`) VALUES
(54, 'gr11.webp', 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '42', 1, '649000', 46),
(57, 'gr11.webp', 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '40', 1, '649000', 49),
(58, 'gcl31.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '38', 1, '520000', 50),
(59, 'gcl31.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '41', 1, '520000', 50),
(60, 'phukienbongro51.webp', 'Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng', 'N/A', 2, '99000', 51),
(61, 'phukienbongro51.webp', 'Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng', 'N/A', 1, '99000', 52),
(62, 'phukienbongro51.webp', 'Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng', 'N/A', 1, '99000', 53),
(63, 'gr51.webp', 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '38', 1, '629000', 54),
(64, 'giaybongchuyen21.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '42', 1, '595000', 55),
(65, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'l', 1, '350000', 57),
(66, 'qabd51.webp', 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'L', 1, '379000', 58),
(67, 'qabd51.webp', 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'L', 1, '379000', 59),
(68, 'qabd51.webp', 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'L', 1, '379000', 60),
(69, 'quanaobongro41.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'XL', 1, '295000', 61),
(70, 'quanaobongro41.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'M', 1, '295000', 62),
(71, 'quanaobongro41.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'M', 1, '295000', 63),
(72, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'M', 1, '350000', 64),
(73, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'M', 1, '350000', 65),
(74, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'L', 1, '350000', 66),
(75, 'quabongro31.webp', 'Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng', 'N/A', 1, '520000', 67),
(76, 'giaybongro31.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '38', 1, '789000', 67),
(77, 'quabongro31.webp', 'Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng', 'N/A', 1, '520000', 68),
(78, 'quabongro21.webp', 'Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng', 'N/A', 1, '600000', 69),
(79, 'quabongro21.webp', 'Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng', 'N/A', 1, '600000', 70),
(80, 'quabongro21.webp', 'Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng', 'N/A', 1, '600000', 71),
(81, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'L', 1, '350000', 72),
(82, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'L', 1, '350000', 73),
(83, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'L', 1, '350000', 74),
(84, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'L', 1, '350000', 75),
(85, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'M', 1, '350000', 76),
(86, 'quanaobongro41.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'M', 1, '295000', 77),
(87, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'M', 1, '350000', 78),
(88, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'M', 1, '350000', 79),
(89, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'L', 1, '350000', 80),
(90, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'L', 1, '350000', 81),
(91, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'L', 1, '350000', 82),
(92, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'L', 1, '350000', 83),
(93, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'M', 1, '350000', 84),
(94, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'M', 1, '350000', 85),
(95, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'XXL', 1, '350000', 86),
(96, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'XXL', 1, '350000', 87),
(97, 'abia41.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 1, '1249000', 88),
(98, 'abia41.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 1, '1249000', 89),
(99, 'abia41.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 1, '1249000', 90),
(100, 'abia41.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 1, '1249000', 91),
(101, 'abia41.webp', 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 1, '1249000', 92),
(102, 'pkbd11.webp', 'Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng', 'N/A', 1, '55000', 93),
(103, 'pkbd11.webp', 'Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng', 'N/A', 1, '55000', 94),
(104, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 95),
(105, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 96),
(106, 'quanaobongro31.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'XL', 1, '350000', 97),
(107, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 98),
(108, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 99),
(109, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 100),
(110, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 101),
(111, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 102),
(112, 'phukienbongro31.webp', 'Balo thể thao Zocker - Hàng Chính Hãng', 'N/A', 1, '250000', 102),
(113, 'qabd11.webp', 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'L', 1, '379000', 103),
(114, 'qabd21.webp', 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'L', 1, '379000', 103),
(115, 'qabd11.webp', 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'L', 1, '379000', 104),
(116, 'qabd21.webp', 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'L', 1, '379000', 104),
(117, 'pkr11.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Tím\" JG-DTQG-TD-06 - Hàng Chính Hãng', 'N/A', 1, '99000', 105),
(118, 'giaybongro41.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '38', 1, '789000', 106),
(119, 'gcl51.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '40', 1, '519000', 107),
(120, 'gtg41.webp', 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '40', 1, '990000', 108),
(121, 'gbd31.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '38', 1, '955000', 109),
(122, 'gcl31.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '42', 1, '520000', 109),
(123, 'gcl41.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '41', 1, '519000', 109),
(124, 'giaybongro31.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '38', 1, '789000', 109),
(125, 'gr31.webp', 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '39', 1, '649000', 109),
(126, 'giaybongchuyen11.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '40', 1, '595000', 110),
(127, 'pkbc51.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'N/A', 1, '145000', 111),
(128, 'phukienbongro21.webp', 'Balo thể thao Zocker Montana - Hàng Chính Hãng', 'N/A', 1, '295000', 112),
(129, 'phukienbongro51.webp', 'Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng', 'N/A', 1, '99000', 113),
(130, 'gbd11.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '38', 1, '955000', 114),
(131, 'gcl31.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '38', 1, '520000', 114),
(132, 'giaybongchuyen51.webp', 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '38', 1, '819000', 114),
(133, 'pkpk11.webp', 'Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng', 'N/A', 1, '69000', 115),
(134, '1-1718267704021.webp', 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '40', 1, '899999', 116),
(135, 'quanaobongro11.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Tím\" MJ-AJ1551-03 - Hàng Chính Hãng', 'XL', 1, '350000', 117),
(136, 'phukienbongro11.webp', 'Balo thể thao Zocker Winner Energy - Hàng Chính Hãng', 'N/A', 1, '329000', 118),
(137, 'pkpk11.webp', 'Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng', 'N/A', 1, '69000', 119),
(138, 'gpk11.webp', 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '40', 1, '690000', 119),
(139, 'gpk11.webp', 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '41', 1, '690000', 119),
(140, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '30000', 120),
(141, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 121),
(142, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 122),
(143, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 123),
(144, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 124),
(145, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 125),
(146, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 126),
(147, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 127),
(148, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 128),
(149, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 129),
(150, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 131),
(151, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 132),
(152, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 133),
(153, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 134),
(154, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 135),
(155, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 136),
(156, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 137),
(157, 'quanaobongro51.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'M', 1, '100', 137),
(158, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 138),
(159, 'quanaobongro51.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'M', 1, '100', 138),
(160, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 139),
(161, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 140),
(162, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 141),
(163, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 142),
(164, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 143),
(165, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 144),
(166, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 145),
(167, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 146),
(168, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 147),
(169, 'gbd21.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '40', 1, '955000', 148),
(170, 'pkbd51.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'N/A', 1, '100', 149);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `foot_banner`
--

CREATE TABLE `foot_banner` (
  `id` int(255) NOT NULL,
  `image` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `foot_banner`
--

INSERT INTO `foot_banner` (`id`, `image`) VALUES
(4, 'banner04.webp'),
(5, 'banner02.webp');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `gaybia`
--

CREATE TABLE `gaybia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `gaybia`
--

INSERT INTO `gaybia` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `warrenty`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'gbia11.webp', 'gbia12.webp', 'gbia13.webp', 'gbia14.webp', 'Gậy đánh bi-a Peri Viscount WB-G02 PR-WB-G02 - Hàng Chính Hãng', 'Peri', '25000000', '0', '12', 5, 0, 1, 19),
(1, 3, 'gbia21.webp', 'gbia22.webp', 'gbia23.webp', 'gbia24.webp', 'Gậy đánh bi-a Peri Viscount WB-P02 PR-WB-P02 - Hàng Chính Hãng', 'Peri', '24000000', '0', '12', 5, 0, 1, 19),
(1, 4, 'gbia31.webp', 'gbia32.webp', 'gbia33.webp', 'gbia34.webp', 'Gậy đánh bi-a Peri Earl P-TE09 PR-P-TE09 - Hàng Chính Hãng', 'Peri', '37000000', '0', '12', 5, 0, 1, 19),
(1, 5, 'gbia41.webp', 'gbia42.webp', 'gbia43.webp', 'gbia44.webp', 'Gậy đánh bi-a Peri Earl P-TE08 PR-P-TE08 - Hàng Chính Hãng', 'Peri', '38000000', '0', '12', 5, 0, 1, 19),
(1, 6, 'gbia51.webp', 'gbia52.webp', 'gbia53.webp', 'gbia54.webp', 'Gậy đánh bi-a Peri Earl P-TE07 PR-P-TE07 - Hàng Chính Hãng', 'Peri', '30000000', '0', '12', 5, 0, 1, 19);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaybongchuyen`
--

CREATE TABLE `giaybongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaybongchuyen`
--

INSERT INTO `giaybongchuyen` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 4, 'giaybongchuyen11.webp', 'giaybongchuyen12.webp', 'giaybongchuyen13.webp', 'giaybongchuyen14.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', 'Động Lực', '595000', '0', 24, 4, 1, 2),
(2, 5, 'giaybongchuyen21.webp', 'giaybongchuyen22.webp', 'giaybongchuyen23.webp', 'giaybongchuyen24.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', 'Động Lực', '595000', '0', 22, 1, 1, 2),
(2, 6, 'giaybongchuyen31.webp', 'giaybongchuyen33.webp', 'giaybongchuyen32.webp', 'giaybongchuyen34.webp', 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', 'Động Lực', '819000', '909000', 25, 0, 1, 2),
(2, 7, 'giaybongchuyen41.webp', 'giaybongchuyen42.webp', 'giaybongchuyen43.webp', 'giaybongchuyen44.webp', 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', 'Động Lực', '819000', '909000', 25, 0, 1, 2),
(2, 8, 'giaybongchuyen51.webp', 'giaybongchuyen52.webp', 'giaybongchuyen53.webp', 'giaybongchuyen54.webp', 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', 'Động Lực', '819000', '909999', 24, 4, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaybongda`
--

CREATE TABLE `giaybongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaybongda`
--

INSERT INTO `giaybongda` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'gbd11.webp', 'gbd12.webp', 'gbd13.webp', 'gbd14.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', 'Động Lực', '955000', '1000000', 24, 0, 1, 2),
(2, 3, 'gbd21.webp', 'gbd22.webp', 'gbd23.webp', 'gbd24.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', 'Động Lực', '955000', '0', 24, 1, 1, 2),
(2, 4, 'gbd31.webp', 'gbd32.webp', 'gbd33.webp', 'gbd34.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', 'Động Lực', '955000', '1000000', 22, 2, 1, 2),
(2, 5, 'gbd41.webp', 'gbd42.webp', 'gbd43.webp', 'gbd44.webp', 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', 'Động Lực', '955000', '0', 25, 1, 1, 2),
(2, 6, 'gbd51.webp', 'gbd52.webp', 'gbd53.webp', 'gbd54.webp', 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', 'Động Lực', '850000', '900000', 25, 2, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaybongro`
--

CREATE TABLE `giaybongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaybongro`
--

INSERT INTO `giaybongro` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 11, 'giaybongro11.webp', 'giaybongro12.webp', 'giaybongro13.webp', 'giaybongro14.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', 'Động Lực', '789000', '880000', 21, 27, 1, 2),
(2, 12, 'giaybongro21.webp', 'giaybongro22.webp', 'giaybongro23.webp', 'giaybongro24.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', 'Động Lực', '789000', '880000', 25, 15, 1, 2),
(2, 13, 'giaybongro31.webp', 'giaybongro32.webp', 'giaybongro33.webp', 'giaybongro34.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', 'Động Lực', '789000', '880000', 23, 2, 1, 2),
(2, 14, 'giaybongro41.webp', 'giaybongro42.webp', 'giaybongro43.webp', 'giaybongro44.webp', 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', 'Động Lực', '789000', '880000', 25, 2, 1, 2),
(2, 15, 'giaybongro51.webp', 'giaybongro52.webp', 'giaybongro53.webp', 'giaybongro54.webp', 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', 'Động Lực', '789000', '880000', 24, 3, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaycaulong`
--

CREATE TABLE `giaycaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaycaulong`
--

INSERT INTO `giaycaulong` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 2, 'gcl11.webp', 'gcl12.webp', 'gcl13.webp', 'gcl14.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', 'Động Lực', '519000', '580000', 25, 0, 1, 2),
(3, 3, 'gcl21.webp', 'gcl22.webp', 'gcl23.webp', 'gcl24.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', 'Động Lực', '519000', '580000', 24, 1, 1, 2),
(3, 4, 'gcl31.webp', 'gcl32.webp', 'gcl33.webp', 'gcl34.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', 'Động Lực', '520000', '580000', 6, 6, 1, 1),
(3, 5, 'gcl41.webp', 'gcl42.webp', 'gcl43.webp', 'gcl44.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', 'Động Lực', '519000', '580000', 24, 0, 1, 1),
(3, 6, 'gcl51.webp', 'gcl52.webp', 'gcl53.webp', 'gcl54.webp', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', 'Động Lực', '519000', '580000', 23, 1, 1, 2),
(3, 7, 'anh-san-pham-web-shop-1-1712570979016.jpg', 'a5-0-jpeg-1712570979038.webp', 'a5-1-jpeg-1712570979055.webp', 'a5-3-jpeg-1712570979077.jpg', 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', 'Động Lực', '519000', '580000', 25, 1, 1, 23);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaychaybo`
--

CREATE TABLE `giaychaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaychaybo`
--

INSERT INTO `giaychaybo` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'gr11.webp', 'gr12.webp', 'gr13.webp', 'gr14.webp', 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', 'Động Lực', '649000', '725000', 23, 3, 1, 2),
(1, 3, 'gr21.webp', 'gr22.webp', 'gr23.webp', 'gr24.webp', 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', 'Động Lực', '649000', '725000', 25, 0, 1, 2),
(1, 4, 'gr31.webp', 'gr32.webp', 'gr33.webp', 'gr34.webp', 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', 'Động Lực', '649000', '725000', 23, 2, 1, 2),
(1, 5, 'gr41.webp', 'gr42.webp', 'gr43.webp', 'gr44.webp', 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', 'Động Lực', '649000', '725000', 25, 0, 1, 2),
(1, 6, 'gr51.webp', 'gr52.webp', 'gr53.webp', 'gr54.webp', 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', 'Động Lực', '629000', '785000', 24, 3, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaypickleball`
--

CREATE TABLE `giaypickleball` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaypickleball`
--

INSERT INTO `giaypickleball` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'gpk11.webp', 'gpk12.webp', 'gpk13.webp', 'gpk14.webp', 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', 'Động Lực', '690000', '0', 23, 3, 1, 2),
(2, 3, 'gpk21.webp', 'gpk22.webp', 'gpk23.webp', 'gpk24.webp', 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', 'Động Lực', '690000', '0', 25, 1, 1, 2),
(2, 4, 'gpk31.webp', 'gpk32.webp', 'gpk33.webp', 'gpk34.webp', 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', 'Động Lực', '690000', '700000', 25, 0, 1, 2),
(2, 5, 'gpk41.webp', 'gpk42.webp', 'gpk43.webp', 'gpk44.webp', 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', 'Động Lực', '690000', '700000', 25, 1, 1, 2),
(2, 6, 'gpk51.webp', 'gpk52.webp', 'gpk53.webp', 'gpk54.webp', 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', 'Động Lực', '690000', '700000', 25, 0, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giaytapgym`
--

CREATE TABLE `giaytapgym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giaytapgym`
--

INSERT INTO `giaytapgym` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'gtg11.webp', 'gtg12.webp', 'gtg13.webp', 'gtg14.webp', 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', 'Động Lực', '1190000', '0', 25, 5, 1, 2),
(1, 3, 'gtg21.webp', 'gtg22.webp', 'gtg23.webp', 'gtg24.webp', 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', 'Sao Vàng', '1190000', '0', 25, 4, 1, 2),
(1, 4, 'gtg31.webp', 'gtg32.webp', 'gtg33.webp', 'gtg34.webp', 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', 'Động Lực', '1190000', '0', 25, 0, 1, 2),
(1, 5, 'gtg41.webp', 'gtg42.webp', 'gtg43.webp', 'gtg44.webp', 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', 'Động Lực', '990000', '1090000', 24, 11, 1, 2),
(1, 6, 'gtg51.webp', 'gtg52.webp', 'gtg53.webp', 'gtg54.webp', 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', 'Động Lực', '599000', '0', 25, 1, 1, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giohang`
--

CREATE TABLE `giohang` (
  `id` int(255) NOT NULL,
  `image` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `size` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `quantity` int(255) NOT NULL,
  `id_user` int(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `giohang`
--

INSERT INTO `giohang` (`id`, `image`, `name`, `size`, `price`, `quantity`, `id_user`, `active`) VALUES
(145, 'pkbc41.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Trắng\" JG-DTQG-M-02 - Hàng Chính Hãng', 'N/A', '145000', 2, 2, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `head_banner`
--

CREATE TABLE `head_banner` (
  `id` int(255) NOT NULL,
  `image` varchar(255) NOT NULL,
  `mb_image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `url` varchar(255) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 0,
  `alt_text` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `head_banner`
--

INSERT INTO `head_banner` (`id`, `image`, `mb_image`, `is_active`, `url`, `order`, `alt_text`) VALUES
(45, 'banner02.webp', 'z6548127651511_475f92bf6dde768234ddea38022bb156.jpg', 1, NULL, 0, NULL),
(46, 'banner05.webp', 'z6548127651510_0ff6a1e4f05ca4e87370ab8d89dca3cb.jpg', 1, NULL, 0, NULL),
(47, 'banner04.webp', 'z6548127637746_b7761e1008bfaadfc52a4b62bcb80e03.jpg', 1, NULL, 0, NULL),
(48, 'banner06.webp', 'z6548153921564_7ba37ccf6aafb57107b3f86fe9a9b1b9.jpg', 1, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `khachhang`
--

CREATE TABLE `khachhang` (
  `id_user` int(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `active_2fa` int(2) NOT NULL DEFAULT 0,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `khachhang`
--

INSERT INTO `khachhang` (`id_user`, `username`, `password`, `email`, `phone`, `fullname`, `address`, `avatar`, `active_2fa`, `reset_token`, `reset_expires`) VALUES
(1, 'admin', '$2y$10$xCfDFZ3zXWpuK1BJdXhF5OdHlBDqL5o8/lKhvbvfuiuDuvtb6Yc96', 'nhatnam161005@gmail.com', '0777566324', 'Huỳnh Nhật Nam', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', 'anhthe.jpg', 1, '125285', '2025-05-21 21:42:23'),
(2, 'haochuai', '$2y$10$5TC499q0YLoj7wR16cgE5.Uh//2NEzYcHd13A4s.Nr9Xld//EicaC', 'nhatnam161005@gmail.com', '0777566325', 'Nguyễn Nhật Hào', '1436 Trịnh Quang Nghị, Phường 8, Quận 8, Tp.Hcm', 'anhthe.jpg', 0, NULL, NULL),
(17, 'phuquoc', '$2y$10$hheHy7Z/ZhnIyivtdx3BWerkRnRy8xiY/J/97jk6P5KLTybO4saQu', 'nhatnam161005@gmail.com', '0777566325', 'Huynh Nhat Nam', 'Hồ Chí Minh', 'unnamed (12).png', 0, '125285', '2025-05-21 21:42:23'),
(18, 'vanliem', '$2y$10$FRxAarhFifJzuTiakkdKU.sXzpONef0tFJ6yyTrsxgP8a6fNpkueq', 'admin@gmail.com', '0777566324', 'Huynh Nhat Nam', 'Hồ Chí Minh', NULL, 0, NULL, NULL),
(19, 'vanquyen', '$2y$10$gk5QJ9c7jj2y6k.4FpuCUOu0HYwWyphT6KpsFQcOL0OQQUyS3Tx8u', 'abc@gmail.com', '0777566324', 'Huynh Nhat Nam', 'Hồ Chí Minh', NULL, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `messenger`
--

CREATE TABLE `messenger` (
  `id` int(11) NOT NULL,
  `sender` enum('user','bot','admin') NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `status` enum('active','waiting_for_admin') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `messenger`
--

INSERT INTO `messenger` (`id`, `sender`, `user_id`, `session_id`, `message`, `created_at`, `status`) VALUES
(1, 'bot', 2, 'vftkhebe3fbbvl866bnofg0iv5', 'Chào bạn! Tôi có thể giúp gì? (Tìm sản phẩm, tra cứu đơn hàng, tư vấn)', '2025-05-22 18:28:38', 'active'),
(2, 'bot', 2, 'vftkhebe3fbbvl866bnofg0iv5', 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!', '2025-05-22 18:28:40', 'active'),
(3, 'bot', 2, 'i1s60t9ndspeb1sv4dpjheeiag', 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!', '2025-05-22 18:43:21', 'active'),
(4, 'bot', 2, 'eek00g1h7hvj7eiajgalkpjtfa', 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!', '2025-05-22 18:44:20', 'active'),
(5, 'bot', 2, '9mfu0s4spn89gpe8mnjiru1coi', 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!', '2025-05-22 18:44:41', 'active'),
(6, 'bot', 2, '019j61v94ai44fpp4ehuok67t4', 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!', '2025-05-22 18:46:54', 'active');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `messenger_products`
--

CREATE TABLE `messenger_products` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `price` int(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `sizes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mid_banner`
--

CREATE TABLE `mid_banner` (
  `id` int(255) NOT NULL,
  `image1` varchar(255) NOT NULL,
  `image2` varchar(255) NOT NULL,
  `image3` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `mid_banner`
--

INSERT INTO `mid_banner` (`id`, `image1`, `image2`, `image3`) VALUES
(4, 'mid_banner01.webp', 'mid_banner02.webp', 'mid_banner03.webp');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `motasanpham`
--

CREATE TABLE `motasanpham` (
  `id` int(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `chatlieu` text NOT NULL,
  `thietke` text NOT NULL,
  `mausac` varchar(255) NOT NULL,
  `kichthuoc` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `motasanpham`
--

INSERT INTO `motasanpham` (`id`, `name`, `chatlieu`, `thietke`, `mausac`, `kichthuoc`) VALUES
(1, 'quanao', 'Áo được may từ vải MK23/MK22 cao cấp, mang đến cảm giác mát mịn, thoáng khí vượt trội, thấm hút mồ hôi nhanh chóng, kháng khuẩn, khử mùi hiện đại giúp bạn luôn khô thoáng, tự tin trong suốt trận đấu.\r\nThêm vào đó, chất vải chống nhăn, co giãn tốt, bền màu, giúp bạn thoải mái vận động, thực hiện mọi động tác kỹ thuật mà không lo áo bị giãn, mất form.\r\n', 'Nổi bật trên nền áo là hình ảnh ngôi sao 5 cánh cách điệu được in chuyển nhiệt thể hiện tinh thần tự hào dân tộc, khát khao chinh phục mọi thử thách, mang đến sự tự tin và sức mạnh cho người mặc.\r\n\r\nForm áo chuẩn thể thao, ôm vừa vặn cơ thể, tạo sự thoải mái tối đa khi vận động mà vẫn đảm bảo tính thẩm mỹ. Quần thiết kế đơn giản, khỏe khoắn với dây rút chắc chắn, giúp bạn dễ dàng điều chỉnh độ rộng, cho cảm giác vừa vặn, tự tin khi thi đấu.\r\n', 'Đủ loại', 'M-2XL'),
(2, 'giay', 'CHẤT LIỆU VẢI LƯỚI VÀ DA PU\r\nMềm, thoáng, mang lại cảm giác thoải mái cho bàn chân\r\nĐẾ CAO SU + PHYLON\r\nĐàn hồi, bền, hiệu suất bật theo chiều dọc tốt giúp giảm tổn thất năng lượng\r\n\r\n\r\n\r\n', 'THIẾT KẾ THANH GIẰNG VÒM ĐẾ\r\nBảo vệ vòm chân, cải thiện sự ổn định\r\n', 'Đủ loại', '38-42'),
(17, 'Phukien', 'Bền chắc , bền bỉ phù hợp cho vận động', 'Thoải mái , linh hoạt', 'Đủ loại', ''),
(18, 'quabongro', 'Toàn bộ bề mặt được bao phủ bởi lớp composite, mang lại cho bóng độ bám vững chắc để kiểm soát toàn diện.', 'CHƠI TRÊN TẤT CẢ CÁC BỀ MẶT: Từ lối đi vào gara đến phòng tập thể dục và mọi nơi xung quanh.\r\nKÍCH THƯỚC CHÍNH THỨC: Kích thước 7, 29,5\"', 'Đủ loại', ''),
(19, 'votcaulong', '- Độ cứng:  Cứng trung bình\n- Khung vợt: Carbon High Modulus Graphite Carbon\n- Thân vợt: Carbon High Modulus Graphite Carbon, 100% carbon T35 Taiwan\n- Trọng lượng: 4U (82+-2gr).\n- Điểm cân bằng: 290+-3mm， vợt tấn công', '- Chiều dài tổng thể: 675 mm\r\n- Điểm swing weight: 84,4 kg/cm2 \r\n- Chu vi cán vợt: G5\r\n- Sức căng tối đa: 28 (12.7 kgs) LBS', 'Đủ loại', ''),
(20, 'Hộp cầu lông Động Lực Promax PR-27054 - Hàng Chính Hãng', 'Đặc điểm nổi bật\r\nLÔNG VỊT\r\nChắc chắn, độ bền cao, đường bay ổn định\r\nĐẾ BẤC', 'Nhẹ, không thấm nước, khó mục rữa, tính nén và độ đàn hồi cao\r\nTỐC ĐỘ CẦU 77\r\nThích hợp với khí hậu, điều kiện tự nhiên Việt Nam', 'trắng', ''),
(21, 'Vợt Pickleball Zocker Happy HP05 Pro Series \"Black\" HP05-B - Hàng Chính Hãng', '<p><strong>Vợt Pickleball Zocker Happy HP05 Pro Series Black</strong> là sản phẩm kết hợp giữa công nghệ hiện đại và phong cách thiết kế tối giản, dành cho người chơi đam mê sự cân bằng giữa lực đánh bùng nổ và kiểm soát chi tiết từng đường bóng. Với hai phiên bản độ dày linh hoạt, vợt không chỉ là công cụ thi đấu mà còn là biểu tượng của sự chuyên nghiệp, giúp bạn tỏa sáng trên mọi mặt trận.</p>', '<p>Mặt vợt làm từ Raw Carbon Fiber T700 không chỉ mang lại độ bền cao mà còn tạo ma sát tối ưu, giúp tăng độ xoáy và kiểm soát bóng ngay cả trong những cú đánh biên. Công nghệ mô phỏng vợt tennis mở rộng vùng sweet spot, đảm bảo độ chính xác dù đánh ở bất kỳ vị trí nào.</p>\r\n<p>Phần lõi sử dụng cấu trúc tổ ong ép nóng mật độ cao, phân tán lực đồng đều, giảm rung chấn đến mức tối thiểu và trở lại vị trí sẵn sàng nhanh chóng sau mỗi cú đánh.</p>\r\n<p>Đặc biệt, chuôi vợt ứng dụng công nghệ Hyper Press giúp hấp thụ chấn động, giảm áp lực lên khớp tay và mang lại cảm giác êm ái khi thi đấu liên tục.</p>', 'Đủ màu', ''),
(22, 'Vợt cầu lông Jogarbola Power J800 \"Black/Blue\" J800-01 - Hàng Chính Hãng', '<p>Vợt không chỉ là 1 công cụ mà còn là người bạn đồng hành lý tưởng, giúp bạn chinh phục mọi thử thách trên sân pickleball. Với thiết kế đơn giản, hiện đại, mang tính xu hướng toàn cầu, vợt Zocker Aspire phù hợp với nhiều đối tượng, từ người mới chơi cho tới vận động viên chuyên nghiệp.</p>', '<p>Với Aspire, Zocker cho ra mắt 2 phiên bản với độ dày lần lượt 13.3mm và 16mm, cùng 6 màu sắc khác nhau gồm: Trắng, hồng, đỏ, xanh, tím, đen. Mỗi màu đều mang theo sắc thái riêng. Trong đó, Vợt Pickleball Zocker Aspire viền Đỏ nổi bật với sự mạnh mẽ, năng lượng bùng cháy. Sự đa dạng về độ dày cũng như màu sắc giúp người dùng thoải mái đưa ra lựa chọn phù hợp với lối chơi cũng như phong cách thời thượng.</p>\r\n<p>Zocker sử dụng cấu trúc tổ ong cùng công nghệ ép nóng cho phần lõi, mang tới độ bền vượt trội, vô cùng chắc chắn. Kết hợp với bề mặt carbon T700 nhập từ Nhật giúp tăng độ nhám, hỗ trợ rất tốt cho các kỹ thuật tạo xoáy.</p>\r\n<p><img src=\"../img/upload/news/681b6cc71826f.webp\" alt=\"\" width=\"150\" height=\"150\"></p>', 'Đủ màu', ''),
(23, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '<p>Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng Giày cầu lông Promax PR-241023 được thiết kế dành những người yêu thích môn cầu lông chuyên nghiệp với chất lượng tiêu chuẩn.</p>\r\n<p>Đôi giày vừa mang đến cảm giác thoải mái, vừa như một tấm \"lá chắn toàn diện\", giúp bảo vệ chân từ mọi góc độ.</p>\r\n<p>Giày cầu lông Promax PR-241023 sẽ là bạn đồng hành hoàn hảo cho những cú \"smash\" mạnh mẽ và uy lực</p>', '<p>Đặc điểm nổi bật</p>\r\n<p>CHẤT LIỆU VẢI LƯỚI VÀ DA PU</p>\r\n<p>Mềm, thoáng, mang lại cảm giác thoải mái cho bàn chân</p>\r\n<p>ĐẾ CAO SU + PHYLON</p>\r\n<p>Đàn hồi, bền, hiệu suất bật theo chiều dọc tốt giúp giảm tổn thất năng lượng</p>\r\n<p>THIẾT KẾ THANH GIẰNG VÒM ĐẾ</p>\r\n<p>Bảo vệ vòm chân, cải thiện sự ổn định</p>', 'Tím/Đỏ/Xanh navy', '38-42'),
(24, 'Giày Pickleball Nam Động Lực Jogarbola Endura \"Navy\" JG-23557-06 - Hàng Chính Hãng', '<p>Giày Pickleball Jogarbola Endura – Bảo Vệ Chân, Lên Sân Tự Tin</p>\r\n<p>Giày Pickleball Jogarbola Endura là lựa chọn hoàn hảo cho người chơi bán chuyên và phong trào, mang đến sự thoải mái, ổn định và hiệu suất vượt trội trên sân. Với thiết kế tối giản, dễ phối đồ cùng những công nghệ hiện đại, đôi giày này giúp bạn làm chủ từng bước di chuyển.</p>', '<p>Đặc điểm nổi bật</p>\r\n<p>Upper TPU kết hợp Microfiber bền bỉ cùng lưới thoáng khí, mang lại độ ôm chân vừa vặn và sự thông thoáng tối đa.</p>\r\n<p>Công nghệ J-Foam – Đế Phylon đàn hồi tốt, giảm chấn hiệu quả, mang lại cảm giác nhẹ nhàng và êm ái trong từng bước di chuyển.</p>\r\n<p>Công nghệ J-Rubber – Đế cao su tăng cường ma sát, chống trơn trượt, giúp bạn luôn vững vàng trên mọi mặt sân.</p>\r\n<p>Công nghệ J-Lock – Thanh TPU chống vặn xoắn, hạn chế lật cổ chân, tối ưu phản lực khi di chuyển và đổi hướng nhanh.</p>', 'Beige, Navy, White', '38-42'),
(25, 'Giày Pickleball Nam Động Lực Jogarbola Endura \"Navy\" JG-23557-06 - Hàng Chính Hãng', '<p>Giày Pickleball Jogarbola Endura – Bảo Vệ Chân, Lên Sân Tự Tin</p>\r\n<p>Giày Pickleball Jogarbola Endura là lựa chọn hoàn hảo cho người chơi bán chuyên và phong trào, mang đến sự thoải mái, ổn định và hiệu suất vượt trội trên sân. Với thiết kế tối giản, dễ phối đồ cùng những công nghệ hiện đại, đôi giày này giúp bạn làm chủ từng bước di chuyển.</p>\r\n<p></p>', '<p>Đặc điểm nổi bật</p>\r\n<p>Upper TPU kết hợp Microfiber bền bỉ cùng lưới thoáng khí, mang lại độ ôm chân vừa vặn và sự thông thoáng tối đa.</p>\r\n<p>Công nghệ J-Foam – Đế Phylon đàn hồi tốt, giảm chấn hiệu quả, mang lại cảm giác nhẹ nhàng và êm ái trong từng bước di chuyển.</p>\r\n<p>Công nghệ J-Rubber – Đế cao su tăng cường ma sát, chống trơn trượt, giúp bạn luôn vững vàng trên mọi mặt sân.</p>\r\n<p>Công nghệ J-Lock – Thanh TPU chống vặn xoắn, hạn chế lật cổ chân, tối ưu phản lực khi di chuyển và đổi hướng nhanh.</p>', 'Beige, Navy, White', '38-42');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `news_images`
--

CREATE TABLE `news_images` (
  `id` int(11) NOT NULL,
  `news_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `news_images`
--

INSERT INTO `news_images` (`id`, `news_id`, `image_url`, `caption`, `is_primary`, `created_at`) VALUES
(29, 28, '/baocao/view/img/upload/news/681b709bbbf4b.png', 'Không có chú thích', 1, '2025-05-07 21:41:33'),
(30, 28, '/baocao/view/img/upload/news/681b70c6892c7.png', 'Bộ quần áo có mức giá khoảng 379.000 đồng', 0, '2025-05-07 21:41:33'),
(31, 28, '/baocao/view/img/upload/news/681b70f17a4d9.png', 'Áo có mức giá khoảng 379.000 đồng', 0, '2025-05-07 21:41:33'),
(40, 15, '/baocao/view/img/upload/news/681b30c50861c.webp', 'Đại biểu Quốc hội Trần Khánh Thu (Ảnh: Hồng Phong).', 1, '2025-05-07 22:44:41'),
(41, 15, 'https://cdnphoto.dantri.com.vn/D8rEw_SBtvf3qtYLRbY6wFoxilg=/thumb_w/1360/2025/05/06/202505060906445662z6572633953976fb10ecbcc66c0f695d18391912e66c12-edited-1746502873900.jpeg', 'Đại biểu Quốc hội Tô Văn Tám (Ảnh: Hồng Phong).', 0, '2025-05-07 22:44:41'),
(44, 23, '/baocao/view/img/upload/news/681b62ef97fe4.png', 'Không có chú thích', 1, '2025-05-07 22:47:27'),
(45, 13, 'https://cdnphoto.dantri.com.vn/ZNpgam5lN_uaqNFtDg_o6CADlnk=/thumb_w/1360/2025/05/04/202505041429459751z619244-1746345720801.jpg', 'Toàn cảnh buổi họp báo (Ảnh: Hồng Phong).', 1, '2025-05-07 22:50:49'),
(46, 13, 'https://cdnphoto.dantri.com.vn/8YC_8Pk4bUs-tM3yz1ANC8NLKE0=/thumb_w/1360/2025/05/04/nguyen-phuong-thuy-edited-1746345760441.jpeg', 'Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy (Ảnh: Minh Châu).', 0, '2025-05-07 22:50:49'),
(63, 40, '/baocao/view/img/upload/news/681c0d85e8052.png', 'Không có chú thích', 1, '2025-05-08 08:49:08'),
(64, 41, 'https://bizweb.dktcdn.net/thumb/1024x1024/100/485/982/products/1-1713578604031.jpg?v=1713578610243', 'Không có chú thích', 1, '2025-05-08 08:49:39'),
(65, 42, 'https://bizweb.dktcdn.net/100/485/982/files/f9ecc92cbe6c0e32577d1.jpg?v=1742376266226', 'Không có chú thích', 1, '2025-05-08 08:50:11'),
(66, 43, '/baocao/view/img/upload/news/681c0df777d32.webp', 'Không có chú thích', 1, '2025-05-08 08:50:52'),
(79, 38, '/baocao/view/img/upload/news/6822ad5590159.png', 'Không có chú thích', 1, '2025-05-13 09:24:26'),
(80, 37, '/baocao/view/img/upload/news/6822ad6774901.png', 'Không có chú thích', 1, '2025-05-13 09:24:45'),
(81, 36, '/baocao/view/img/upload/news/6822ad79aa9e4.png', 'Không có chú thích', 1, '2025-05-13 09:25:04'),
(84, 39, '/baocao/view/img/upload/news/6826aaa53f833.png', 'Không có chú thích', 1, '2025-05-16 10:02:01'),
(87, 35, '/baocao/view/img/upload/news/6822adb952dbc.png', 'Không có chú thích', 1, '2025-05-16 22:47:57'),
(88, 44, '/baocao/view/img/upload/news/6826aacfb754b.png', 'Không có chú thích', 1, '2025-05-20 13:28:16'),
(90, 45, '/baocao/view/img/upload/news/682c46cccc423.jpg', 'Không có chú thích', 1, '2025-05-20 16:09:39');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `news_tags`
--

CREATE TABLE `news_tags` (
  `news_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `news_tags`
--

INSERT INTO `news_tags` (`news_id`, `tag_id`) VALUES
(13, 1),
(15, 1),
(15, 2),
(15, 4),
(15, 5),
(15, 6),
(15, 8),
(23, 1),
(23, 5),
(23, 6),
(28, 1),
(28, 2),
(28, 3),
(28, 4),
(28, 5),
(28, 6),
(28, 7),
(28, 8),
(35, 1),
(36, 8),
(37, 7),
(38, 1),
(39, 1),
(40, 3),
(41, 7),
(42, 8),
(43, 8),
(44, 1),
(45, 7);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `pending_orders`
--

CREATE TABLE `pending_orders` (
  `id` int(11) NOT NULL,
  `order_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `pending_orders`
--

INSERT INTO `pending_orders` (`id`, `order_id`) VALUES
(85, 'webtt161659'),
(74, 'webtt181030'),
(10, 'webtt207278'),
(39, 'webtt211533'),
(50, 'webtt216636'),
(18, 'webtt220705'),
(60, 'webtt224179'),
(94, 'webtt236696'),
(28, 'webtt255844'),
(27, 'webtt260977'),
(57, 'webtt266965'),
(62, 'webtt273786'),
(4, 'webtt279470'),
(92, 'webtt282162'),
(86, 'webtt282786'),
(49, 'webtt306355'),
(90, 'webtt307588'),
(72, 'webtt347942'),
(5, 'webtt350396'),
(67, 'webtt352789'),
(52, 'webtt365246'),
(89, 'webtt371317'),
(48, 'webtt381320'),
(15, 'webtt388581'),
(51, 'webtt396714'),
(76, 'webtt400854'),
(24, 'webtt402591'),
(34, 'webtt413012'),
(78, 'webtt413798'),
(6, 'webtt414794'),
(44, 'webtt421005'),
(29, 'webtt423888'),
(11, 'webtt437332'),
(43, 'webtt440876'),
(64, 'webtt443920'),
(2, 'webtt471292'),
(32, 'webtt473993'),
(35, 'webtt494934'),
(47, 'webtt524083'),
(31, 'webtt544574'),
(25, 'webtt544772'),
(54, 'webtt565910'),
(26, 'webtt566967'),
(7, 'webtt592626'),
(1, 'webtt599581'),
(83, 'webtt611319'),
(79, 'webtt614188'),
(22, 'webtt620883'),
(14, 'webtt625316'),
(42, 'webtt633503'),
(75, 'webtt637495'),
(80, 'webtt647691'),
(65, 'webtt663521'),
(81, 'webtt670818'),
(33, 'webtt676670'),
(13, 'webtt703103'),
(82, 'webtt704222'),
(40, 'webtt704770'),
(9, 'webtt709229'),
(88, 'webtt715802'),
(53, 'webtt723538'),
(12, 'webtt732540'),
(61, 'webtt734770'),
(37, 'webtt742393'),
(19, 'webtt757189'),
(20, 'webtt774959'),
(36, 'webtt794144'),
(55, 'webtt798672'),
(46, 'webtt816845'),
(41, 'webtt817254'),
(21, 'webtt835127'),
(23, 'webtt836351'),
(17, 'webtt841574'),
(84, 'webtt846004'),
(59, 'webtt847450'),
(93, 'webtt848452'),
(91, 'webtt854554'),
(66, 'webtt857340'),
(8, 'webtt857390'),
(56, 'webtt858737'),
(45, 'webtt871399'),
(58, 'webtt878690'),
(73, 'webtt880594'),
(38, 'webtt897163'),
(16, 'webtt907935'),
(68, 'webtt917470'),
(71, 'webtt918236'),
(63, 'webtt918951'),
(30, 'webtt927876'),
(70, 'webtt944475'),
(87, 'webtt968148'),
(77, 'webtt981647'),
(3, 'webtt983675'),
(69, 'webtt996422');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienbia`
--

CREATE TABLE `phukienbia` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienbia`
--

INSERT INTO `phukienbia` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 2, 'pkbia11.webp', 'pkbia12.webp', 'pkbia13.webp', '', 'Lơ bi-a Taom V10 \"Green\" PR-ChalkTaom-V10-01 - Hàng Chính Hãng', 'Peri', '450000', '590000', 5, 1, 1, 17),
(3, 3, 'pkbia21.webp', 'pkbia22.webp', '', '', 'Lơ bi-a Taom V10 \"Blue\" PR-ChalkTaom-V10-02 - Hàng Chính Hãng', 'Peri', '450000', '590000', 5, 6, 1, 17),
(3, 4, 'pkbia31.webp', 'pkbia32.webp', 'pkbia33.webp', 'pkbia34.webp', 'Bao đựng cơ Bi-a 3 Seconds 3x5 \"Gray\" PR-3SCase35-04 - Hàng Chính Hãng', 'Peri', '9000000', '0', 5, 3, 1, 17),
(3, 5, 'pkbia41.webp', 'pkbia42.webp', 'pkbia43.webp', 'pkbia44.webp', 'Bao đựng cơ Bi-a 3 Seconds 3x5 \"Blue\" PR-3SCase35-03 - Hàng Chính Hãng', 'Peri', '9000000', '0', 5, 2, 1, 17),
(3, 6, 'pkbia51.webp', 'pkbia52.webp', 'pkbia53.webp', 'pkbia54.webp', 'Bao đựng cơ Bi-a 3 Seconds 3x5 \"Light Camo\" PR-3SCase-05 - Hàng Chính Hãng', 'Peri', '9000000', '0', 5, 4, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienbongchuyen`
--

CREATE TABLE `phukienbongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienbongchuyen`
--

INSERT INTO `phukienbongchuyen` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(4, 3, 'pkbc11.webp', 'pkbc12.webp', 'pkbc13.webp', 'pkbc14.webp', 'Lưới bóng chuyền da cáp Anh Việt 4 viền - Hàng Chính Hãng', 'Sao Vàng', '650000', '0', 5, 1, 1, 17),
(4, 4, 'pkbc21.webp', 'pkbc22.webp', 'pkbc23.webp', '', 'Lưới bóng chuyền hơi có cáp Huy Hoàng - 4 viền trắng - Hàng Chính Hãng', 'Sao Vàng', '450000', '0', 5, 2, 1, 17),
(4, 5, 'pkbc31.webp', 'pkbc32.webp', 'pkbc33.webp', '', 'Lưới bóng chuyền hơi có cáp Huy Hoàng - 1 viền trắng - Hàng Chính Hãng', 'Sao Vàng', '320000', '0', 5, 1, 1, 17),
(4, 6, 'pkbc41.webp', 'pkbc42.webp', 'pkbc43.webp', 'pkbc44.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Trắng\" JG-DTQG-M-02 - Hàng Chính Hãng', 'Động Lực', '145000', '0', 5, 3, 1, 17),
(4, 7, 'pkbc51.webp', 'pkbc52.webp', 'pkbc53.webp', 'pkbc54.webp', 'Mũ đội tuyển quốc gia Việt Nam 2024 \"Đen\" JG-DTQG-M-01 - Hàng Chính Hãng', 'Động Lực', '145000', '0', 3, 2, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienbongda`
--

CREATE TABLE `phukienbongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienbongda`
--

INSERT INTO `phukienbongda` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(4, 2, 'pkbd11.webp', '', '', '', 'Bó gối thể thao PJ \"Ngắn\" - Hàng Chính Hãng', 'Sao Vàng', '55000', '0', '5', 1, 1, 17),
(4, 3, 'pkbd21.webp', 'pkbd22.webp', '', '', 'Bó gối thể thao LP - Hàng Chính Hãng', 'Sao Vàng', '250000', '0', '0', 0, 1, 17),
(4, 4, 'pkbd31.webp', '', '', '', 'Bó gót thể thao Winstar - Hàng Chính Hãng', 'Sao Vàng', '110000', '0', '5', 3, 1, 17),
(4, 5, 'pkbd41.webp', 'pkbd42.webp', 'pkbd43.webp', 'pkbd44.webp', 'BĂNG CỔ CHÂN SUPER-K SKB56589 - Hàng Chính Hãng', 'Động Lực', '60000', '0', '5', 3, 1, 17),
(4, 6, 'pkbd51.webp', 'pkbd52.webp', 'pkbd53.webp', 'pkbd54.webp', 'BĂNG CỔ TAY JOEREX JE058 - Hàng Chính Hãng', 'Động Lực', '100', '0', '1', 3, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienbongro`
--

CREATE TABLE `phukienbongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienbongro`
--

INSERT INTO `phukienbongro` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(4, 4, 'phukienbongro11.webp', 'phukienbongro12.webp', 'phukienbongro13.webp', 'phukienbongro14.webp', 'Balo thể thao Zocker Winner Energy - Hàng Chính Hãng', 'Zocker', '329000', '0', 4, 4, 1, 17),
(4, 5, 'phukienbongro21.webp', 'phukienbongro22.webp', 'phukienbongro23.webp', 'phukienbongro24.webp', 'Balo thể thao Zocker Montana - Hàng Chính Hãng', 'Zocker', '295000', '0', 4, 2, 1, 17),
(4, 6, 'phukienbongro31.webp', 'phukienbongro32.webp', 'phukienbongro33.webp', 'phukienbongro34.webp', 'Balo thể thao Zocker - Hàng Chính Hãng', 'Zocker', '250000', '0', 4, 5, 1, 17),
(4, 7, 'phukienbongro41.webp', 'phukienbongro42.webp', 'phukienbongro43.webp', 'phukienbongro44.webp', 'Balo thể thao đội tuyển 2025 \"Đen\" AJ-HP2502 - Hàng Chính Hãng', 'Động Lực', '596000', '0', 5, 4, 1, 17),
(4, 8, 'phukienbongro51.webp', 'phukienbongro52.webp', 'phukienbongro53.webp', 'phukienbongro54.webp', 'Túi rút thể thao Jogarbola \"Đen\" - Hàng Chính Hãng', 'Động Lực', '99000', '0', 0, 2, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukiencaulong`
--

CREATE TABLE `phukiencaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukiencaulong`
--

INSERT INTO `phukiencaulong` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(5, 2, 'pkcl11.webp', 'pkcl12.webp', 'pkcl13.webp', 'pkcl14.webp', 'BĂNG CỔ TAY SUPER-K SK-3518 - Hàng Chính Hãng', 'Động Lực', '50000', '0', 5, 0, 1, 17),
(5, 3, 'pkcl21.webp', 'pkcl22.webp', 'pkcl23.webp', 'pkcl24.webp', 'BĂNG CỔ CHÂN JOEREX JE052 - Hàng Chính Hãng', 'Động Lực', '85000', '0', 5, 0, 1, 17),
(5, 4, 'pkcl31.webp', 'pkcl32.webp', 'pkcl33.webp', '', 'BĂNG KHUỶU TAY JOEREX JKA-46513 - Hàng Chính Hãng', 'Động Lực', '120000', '200000', 5, 0, 1, 17),
(5, 5, 'pkcl41.webp', 'pkcl42.webp', 'pkcl43.webp', 'pkcl44.webp', 'BĂNG KHUỶU TAY JOREX-0506 - Hàng Chính Hãng', 'Động Lực', '55000', '0', 5, 0, 1, 17),
(5, 6, 'pkcl51.webp', 'pkcl52.webp', 'pkcl53.webp', '', 'BĂNG CỔ CHÂN SUPER-K SKB56589 - Hàng Chính Hãng', 'Động Lực', '60000', '0', 5, 0, 1, 17),
(5, 7, '1-1742179768792.webp', '2-1742179768795.webp', '3-1742179768797.webp', '4-1742179768800.webp', 'Balo thể thao đội tuyển 2025 \"Đen\" AJ-HP2502 - Hàng Chính Hãng', 'Bubadu', '569000', '600000', 0, 0, 1, 17),
(5, 8, '1-12b097f4-bc24-4028-8ed1-e7c20727353e.webp', 'anh-san-pham-web-shop-5-1695115120950.png', 'image-1695114914716.png', 'image-1695114914716.png', 'BĂNG CỔ TAY Bubadu JE058 - Hàng Chính Hãng', 'Bubadu', '30000', '', 10, 0, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienchaybo`
--

CREATE TABLE `phukienchaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienchaybo`
--

INSERT INTO `phukienchaybo` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 2, 'pkr11.webp', 'pkr12.webp', 'pkr13.webp', 'pkr14.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Tím\" JG-DTQG-TD-06 - Hàng Chính Hãng', 'Động Lực', '99000', '0', 5, 0, 1, 17),
(3, 3, 'pkr21.webp', 'pkr22.webp', 'pkr23.webp', 'pkr24.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Hồng\" JG-DTQG-TD-05 - Hàng Chính Hãng', 'Động Lực', '99000', '100000', 5, 0, 1, 17),
(3, 4, 'pkr31.webp', 'pkr32.webp', 'pkr33.webp', 'pkr34.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Vàng\" JG-DTQG-TD-04 - Hàng Chính Hãng', 'Động Lực', '99000', '0', 5, 1, 1, 17),
(3, 5, 'pkr41.webp', 'pkr42.webp', 'pkr43.webp', 'pkr44.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Xanh Lá\" JG-DTQG-TD-03 - Hàng Chính Hãng', 'Động Lực', '99000', '0', 5, 0, 1, 17),
(3, 6, 'pkr51.webp', 'pkr52.webp', 'pkr53.webp', 'pkr54.webp', 'Tất dài thi đấu đội tuyển quốc gia Việt Nam 2024 \"Trắng\" JG-DTQG-TD-02 - Hàng Chính Hãng', 'Động Lực', '99000', '0', 5, 0, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukiengym`
--

CREATE TABLE `phukiengym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukiengym`
--

INSERT INTO `phukiengym` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 2, 'pkg11.webp', 'pkg12.webp', 'pkg13.webp', 'pkg14.webp', 'Xe đạp tập Động Lực EVERTOP DLE-42816B - Hàng Chính Hãng', 'Động Lực', '4800000', '0', 5, 1, 1, 17),
(3, 3, 'pkg21.webp', 'pkg22.webp', 'pkg23.webp', 'pkg24.webp', 'Xe đạp tập Động Lực EVERTOP 8911 - Hàng Chính Hãng', 'Động Lực', '6050000', '0', 5, 1, 1, 17),
(3, 4, 'pkg31.webp', 'pkg32.webp', 'pkg33.webp', 'pkg34.webp', 'XE ĐẠP ĐA NĂNG Động Lực EVERTOP KPR-4090E - Hàng Chính Hãng', 'Động Lực', '3000000', '0', 5, 1, 1, 17),
(3, 5, 'pkg41.webp', 'pkg42.webp', 'pkg43.webp', 'pkg44.webp', 'Xe đạp đa năng Động Lực EVERTOP GB-506R - Hàng Chính Hãng', 'Động Lực', '4900000', '0', 5, 0, 1, 17),
(3, 7, 'pkg51.webp', 'pkg52.webp', 'pkg53.webp', 'pkg54.webp', 'Máy chạy bộ điện đa năng Động Lực DL-T6D - Hàng Chính Hãng', 'Động Lực', '26180000', '0', 5, 1, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phukienpick`
--

CREATE TABLE `phukienpick` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phukienpick`
--

INSERT INTO `phukienpick` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 2, 'pkpk11.webp', 'pkpk12.webp', 'pkpk13.webp', 'pkpk14.webp', 'Túi đựng giày Zocker 2 ngăn TZ-2019 - Hàng Chính Hãng', 'Zocker', '69000', '71000', 4, 2, 1, 17),
(3, 3, 'pkpk21.webp', 'pkpk22.webp', 'pkpk23.webp', 'pkpk24.webp', 'Combo 6 Quả bóng thi đấu Pickleball Zocker ZB-06 - Hàng Chính Hãng', 'Zocker', '369000', '0', 5, 0, 1, 17),
(3, 4, 'pkpk31.webp', 'pkpk22.webp', 'pkpk23.webp', 'pkpk24.webp', 'Combo 3 Quả bóng thi đấu Pickleball Zocker ZB-03 - Hàng Chính Hãng', 'Zocker', '189000', '0', 5, 0, 1, 17),
(3, 5, 'pkpk22.webp', 'pkpk23.webp', '', '', 'Quả bóng thi đấu Pickleball Zocker ZB-01 - Hàng Chính Hãng', 'Zocker', '65000', '0', 5, 0, 1, 17);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `pickleball`
--

CREATE TABLE `pickleball` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `pickleball`
--

INSERT INTO `pickleball` (`topic_id`, `id`, `item`) VALUES
(8, 1, 'Vợt Pickleball'),
(8, 2, 'Giày Pickleball'),
(8, 3, 'Phụ Kiện Pick');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quabongchuyen`
--

CREATE TABLE `quabongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quabongchuyen`
--

INSERT INTO `quabongchuyen` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'quabc11.webp', 'quabc12.webp', 'quabc13.webp', 'quabc14.webp', 'Bóng Chuyền Da Động Lực 210 M3 DL-DL210M3 - Hàng Chính Hãng', 'Động Lực', '309000', '0', 5, 2, 1, 18),
(1, 3, 'quabc21.webp', 'quabc22.webp', 'quabc23.webp', 'quabc24.webp', 'Bóng Chuyền Da Động Lực 240 M3 DL-DL240M3 - Hàng Chính Hãng', 'Động Lực', '239000', '255000', 5, 4, 1, 18),
(1, 4, 'quabc31.webp', 'quabc32.webp', 'quabc33.webp', 'quabc34.webp', 'Bóng Chuyền Da Thi Đấu Thăng Long Dragon Master DG7700 - Hàng Chính Hãng', 'Thăng Long', '1050000', '0', 5, 2, 1, 18),
(1, 5, 'quabc41.webp', '', '', '', 'Bóng Chuyền Da Thi Đấu Thăng Long Dragon DG7000 - Hàng Chính Hãng', 'Thăng Long', '693000', '0', 5, 0, 1, 18),
(1, 6, 'quabc51.webp', 'quabc52.webp', 'quabc53.webp', '', 'Bóng Chuyền Da Thi Đấu Thăng Long Dragon Master DG7400 - Hàng Chính Hãng', 'Thăng Long', '890000', '0', 5, 0, 1, 18);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quabongda`
--

CREATE TABLE `quabongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quabongda`
--

INSERT INTO `quabongda` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'qbd11.webp', 'qbd12.webp', 'qbd13.webp', 'qbd14.webp', 'Bóng đá Động Lực UHV 1.02D DL-UHV102 - Hàng Chính Hãng', 'Động Lực', '598000', '0', 5, 8, 1, 18),
(1, 3, 'qbd21.webp', 'qbd22.webp', 'qbd23.webp', 'qbd24.webp', 'Bóng đá Động Lực UHV 2.16 size 5 DL-UHV216-05 - Hàng Chính Hãng', 'Động Lực', '558000', '0', 5, 1, 1, 18),
(1, 4, 'qbd31.webp', 'qbd32.webp', 'qbd33.webp', 'qbd34.webp', 'Bóng đá Động Lực FIFA QUALITY UHV 2.05 size 5 DL-UHV203-05 - Hàng Chính Hãng', 'Động Lực', '1020000', '0', 5, 0, 1, 18),
(1, 5, 'qbd41.webp', 'qbd42.webp', 'qbd43.webp', 'qbd44.webp', 'Bóng đá FIFA Quality Pro SEA Games UHV 2.07 \"Victor\" DL-UHV207-V - Hàng Chính Hãng', 'Động Lực', '2500000', '0', 5, 0, 1, 18),
(1, 6, 'qbd51.webp', 'qbd52.webp', 'qbd53.webp', 'qbd54.webp', 'Bóng đá Động Lực UCV 3.05 số 4 DL-UCV305 - Hàng Chính Hãng', 'Động Lực', '285000', '300000', 5, 0, 1, 18);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quabongro`
--

CREATE TABLE `quabongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quabongro`
--

INSERT INTO `quabongro` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 12, 'quabongro11.webp', 'quabongro12.webp', 'quabongro13.webp', 'quabongro14.webp', 'Bóng rổ Spalding Sketch Dribble – Indoor/Outdoor Size 7 84-381z - Hàng Chính Hãng', 'Động Lực', '550000', '0', 5, 36, 1, 18),
(1, 13, 'quabongro21.webp', 'quabongro22.webp', 'quabongro23.webp', '', 'Bóng rổ Spalding TF33 Gold – Indoor/Outdoor Size 6 84-532z - Hàng Chính Hãng', 'Spalding', '600000', '0', 5, 6, 1, 18),
(1, 14, 'quabongro31.webp', 'quabongro32.webp', 'quabongro33.webp', 'quabongro34.webp', 'Bóng rổ Spalding Commander – Indoor/Outdoor Size 7 84-589z - Hàng Chính Hãng', 'Spalding', '520000', '0', 4, 1, 1, 18),
(1, 15, 'quabongro41.webp', 'quabongro42.webp', 'quabongro43.webp', '', 'Bóng rổ Spalding Green/Yellow Graffiti – Indoor/Outdoor Size 7 84-374z - Hàng Chính Hãng', 'Spalding', '520000', '0', 5, 1, 1, 18),
(1, 16, 'quabongro51.webp', 'quabongro52.webp', 'quabongro53.webp', 'quabongro54.webp', 'Bóng rổ Spalding Orange Graffiti – Indoor/Outdoor Size 7 84-376z - Hàng Chính Hãng', 'Spalding', '520000', '0', 0, 0, 1, 18);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaobongchuyen`
--

CREATE TABLE `quanaobongchuyen` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaobongchuyen`
--

INSERT INTO `quanaobongchuyen` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 7, 'quanaobongchuyen11.webp', 'quanaobongchuyen12.webp', 'quanaobongchuyen13.webp', 'quanaobongchuyen14.webp', 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng', 'Động Lực', '199000', '200000', 21, 2, 1, 1),
(3, 8, 'quanaobongchuyen21.webp', 'quanaobongchuyen22.webp', 'quanaobongchuyen23.webp', 'quanaobongchuyen24.webp', 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Xanh\" PR-2406.M-02 - Hàng Chính Hãng', 'Động Lực', '199000', '300000', 5, 1, 1, 1),
(3, 9, 'quanaobongchuyen31.webp', 'quanaobongchuyen32.webp', 'quanaobongchuyen33.webp', 'quanaobongchuyen34.webp', 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Trắng\" PR-2406.M-01 - Hàng Chính Hãng', 'Động Lực', '199000', '200000', 5, 1, 1, 1),
(3, 10, 'quanaobongchuyen41.webp', 'quanaobongchuyen42.webp', 'quanaobongchuyen43.webp', 'quanaobongchuyen44.webp', 'Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng', 'Động Lực', '645000', '0', 20, 0, 1, 1),
(3, 11, 'quanaobongchuyen51.webp', 'quanaobongchuyen52.webp', 'quanaobongchuyen53.webp', 'quanaobongchuyen54.webp', 'Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng', 'Động Lực', '645000', '700000', 20, 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaobongda`
--

CREATE TABLE `quanaobongda` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaobongda`
--

INSERT INTO `quanaobongda` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 3, 'qabd11.webp', 'qabd12.webp', 'qabd13.webp', 'qabd14.webp', 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'Động Lực', '379000', '398000', 19, 0, 1, 1),
(3, 4, 'qabd21.webp', 'qabd22.webp', 'qabd23.webp', 'qabd24.webp', 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'Động Lực', '379000', '400000', 19, 1, 1, 1),
(3, 5, 'qabd31.webp', 'qabd32.webp', 'qabd33.webp', 'qabd34.webp', 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng', 'Động Lực', '379000', '400000', 20, 1, 1, 1),
(3, 6, 'qabd41.webp', 'qabd42.webp', 'qabd43.webp', 'qabd44.webp', 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng', 'Sao Vàng', '379000', '400000', 20, 1, 1, 1),
(3, 7, 'qabd51.webp', 'qabd52.webp', 'qabd53.webp', 'qabd54.webp', 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'Động Lực', '379000', '400000', 17, 3, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaobongro`
--

CREATE TABLE `quanaobongro` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaobongro`
--

INSERT INTO `quanaobongro` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(3, 80, 'quanaobongro31.webp', 'quanaobongro32.webp', 'quanaobongro33.webp', 'quanaobongro34.webp', 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'Động Lực', '350000', '400000', 12, 1, 0, 1),
(3, 81, 'quanaobongro41.webp', 'quanaobongro42.webp', 'quanaobongro43.webp', 'quanaobongro44.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'Động Lực', '295000', '0', 16, 1, 1, 1),
(3, 82, 'quanaobongro51.webp', 'quanaobongro52.webp', 'quanaobongro53.webp', 'quanaobongro54.webp', 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'Động Lực', '100', '300000', 18, 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaocaulong`
--

CREATE TABLE `quanaocaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaocaulong`
--

INSERT INTO `quanaocaulong` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(4, 2, 'qacl11.webp', 'qacl12.webp', 'qacl13.webp', 'qacl14.webp', 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng', 'Động Lực', '175000', '200000', 20, 0, 1, 1),
(4, 3, 'qacl21.webp', 'qacl22.webp', 'qacl23.webp', 'qacl24.webp', 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng', 'Động Lực', '175000', '200000', 20, 1, 1, 1),
(4, 4, 'qacl31.webp', 'qacl32.webp', 'qacl33.webp', 'qacl34.webp', 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng', 'Động Lực', '175000', '200000', 20, 0, 1, 1),
(4, 5, 'qacl41.webp', 'qacl42.webp', 'qacl43.webp', 'qacl44.webp', 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng', 'Động Lực', '175000', '0', 20, 0, 1, 1),
(4, 6, 'qacl51.webp', 'qacl52.webp', 'qacl53.webp', 'qacl54.webp', 'Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng', 'Động Lực', '175000', '0', 20, 4, 1, 1),
(4, 8, 'jg-492-23-01-1686822670556.webp', 'image-1686822621217.png', 'image-1686822605824.png', 'image-1686822608388.png', 'Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng', 'Bubadu', '419000', '450000', 20, 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaochaybo`
--

CREATE TABLE `quanaochaybo` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaochaybo`
--

INSERT INTO `quanaochaybo` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'qar11.webp', 'qar12.webp', 'qar13.webp', 'qar14.webp', 'Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng', 'Động Lực', '690000', '700000', 20, 1, 1, 1),
(2, 3, 'qar21.webp', 'qar22.webp', 'qar23.webp', 'qar24.webp', 'Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng', 'Động Lực', '395000', '400000', 20, 1, 1, 1),
(2, 4, 'qar41.webp', 'qar42.webp', 'qar43.webp', 'qar44.webp', 'Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng', 'Động Lực', '580000', '600000', 20, 2, 1, 1),
(2, 5, 'qar51.webp', 'qar52.webp', 'qar53.webp', 'qar54.webp', 'Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng', 'Động Lực', '580000', '0', 20, 0, 1, 1),
(2, 6, 'qar31.webp', 'qar32.webp', 'qar33.webp', 'qar34.webp', 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'Động Lực', '395000', '0', 20, 2, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quanaogym`
--

CREATE TABLE `quanaogym` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `quanaogym`
--

INSERT INTO `quanaogym` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(2, 2, 'qag11.webp', 'qag12.webp', 'qag13.webp', 'qag14.webp', 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng', 'Sao Vàng', '399000', '0', '20', 1, 1, 1),
(2, 3, 'qag21.webp', 'qag22.webp', 'qag23.webp', 'qag24.webp', 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng', 'Sao Vàng', '399000', '0', '20', 0, 1, 1),
(2, 4, 'qag31.webp', 'qag32.webp', 'qag33.webp', 'qag34.webp', 'Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng', 'Sao Vàng', '299000', '349000', '20', 0, 1, 1),
(2, 5, 'qag41.webp', 'qag42.webp', 'qag43.webp', 'qag44.webp', 'Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng', 'Sao Vàng', '339000', '395000', '20', 2, 1, 1),
(2, 6, 'qag51.webp', 'qag52.webp', 'qag53.webp', 'qag54.webp', 'Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng', 'Sao Vàng', '339000', '395000', '20', 3, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sanpham`
--

CREATE TABLE `sanpham` (
  `topic_id` int(255) NOT NULL,
  `topic` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sanpham`
--

INSERT INTO `sanpham` (`topic_id`, `topic`) VALUES
(1, 'Bóng Rổ'),
(2, 'Bóng Chuyền'),
(3, 'Bóng Đá'),
(4, 'Tập Gym'),
(5, 'Chạy Bộ'),
(6, 'Cầu Lông'),
(7, 'Bia'),
(8, 'Pickleball');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sizegiay`
--

CREATE TABLE `sizegiay` (
  `id` int(255) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `parent_id` int(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(10) NOT NULL,
  `quantity` int(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sizegiay`
--

INSERT INTO `sizegiay` (`id`, `table_name`, `parent_id`, `name_product`, `size`, `quantity`) VALUES
(2, 'giaybongro', 11, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', '38', 3),
(3, 'giaybongro', 11, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', '39', 5),
(4, 'giaybongro', 11, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', '40', 5),
(5, 'giaybongro', 11, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', '41', 5),
(6, 'giaybongro', 11, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23232-02 - Hàng Chính Hãng', '42', 5),
(7, 'giaybongro', 12, 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', '38', 5),
(8, 'giaybongro', 12, 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', '39', 5),
(9, 'giaybongro', 12, 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', '40', 5),
(10, 'giaybongro', 12, 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', '41', 5),
(11, 'giaybongro', 12, 'Giày Bóng Rổ Jogarbola x Stepback \"Ghi\" JG-23232-01 - Hàng Chính Hãng', '42', 5),
(12, 'giaybongro', 13, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '38', 3),
(13, 'giaybongro', 13, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '39', 5),
(14, 'giaybongro', 13, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '40', 5),
(15, 'giaybongro', 13, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '41', 5),
(16, 'giaybongro', 13, 'Giày Bóng Rổ Jogarbola x Stepback \"Xanh\" JG-23234-02 - Hàng Chính Hãng', '42', 5),
(17, 'giaybongro', 14, 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '38', 5),
(18, 'giaybongro', 14, 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '39', 5),
(19, 'giaybongro', 14, 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '40', 5),
(20, 'giaybongro', 14, 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '41', 5),
(21, 'giaybongro', 14, 'Giày Bóng Rổ Jogarbola x Stepback \"Trắng\" JG-23234-01 - Hàng Chính Hãng', '42', 5),
(22, 'giaybongro', 15, 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', '38', 5),
(23, 'giaybongro', 15, 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', '39', 5),
(24, 'giaybongro', 15, 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', '40', 5),
(25, 'giaybongro', 15, 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', '41', 5),
(26, 'giaybongro', 15, 'Giày Bóng Rổ Jogarbola x Stepback Ace \"Xanh Navy\" JG-23211-02 - Hàng Chính Hãng', '42', 4),
(27, 'giaybongchuyen', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '38', 5),
(28, 'giaybongchuyen', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '39', 5),
(29, 'giaybongchuyen', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '40', 4),
(30, 'giaybongchuyen', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '41', 5),
(31, 'giaybongchuyen', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-240625-02 - Hàng Chính Hãng', '42', 5),
(32, 'giaybongchuyen', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '38', 4),
(33, 'giaybongchuyen', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '39', 5),
(34, 'giaybongchuyen', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '40', 5),
(35, 'giaybongchuyen', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '41', 5),
(36, 'giaybongchuyen', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue/Orange\" PR-240625-03 - Hàng Chính Hãng', '42', 3),
(37, 'giaybongchuyen', 6, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', '38', 5),
(38, 'giaybongchuyen', 6, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', '39', 5),
(39, 'giaybongchuyen', 6, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', '40', 5),
(40, 'giaybongchuyen', 6, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', '41', 5),
(41, 'giaybongchuyen', 6, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Đỏ - Đen\" JG-220420-05 - Hàng Chính Hãng', '42', 5),
(42, 'giaybongchuyen', 7, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', '38', 5),
(43, 'giaybongchuyen', 7, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', '39', 5),
(44, 'giaybongchuyen', 7, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', '40', 5),
(45, 'giaybongchuyen', 7, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', '41', 5),
(46, 'giaybongchuyen', 7, 'Giày Cầu Lông / Bóng Chuyền Nam Động Lực Jogarbola Kira \"Xanh Navy\" JG-220420-04 - Hàng Chính Hãng', '42', 5),
(47, 'giaybongchuyen', 8, 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '38', 4),
(48, 'giaybongchuyen', 8, 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '39', 5),
(49, 'giaybongchuyen', 8, 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '40', 5),
(50, 'giaybongchuyen', 8, 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '41', 5),
(51, 'giaybongchuyen', 8, 'Giày Cầu Lông / Bóng Chuyền Nam Nữ Động Lực Jogarbola Kira \"Xanh lá\" JG-220420-03 - Hàng Chính Hãng', '42', 5),
(52, 'giaybongda', 2, 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '38', 4),
(53, 'giaybongda', 2, 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '39', 5),
(54, 'giaybongda', 2, 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '40', 5),
(55, 'giaybongda', 2, 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '41', 5),
(56, 'giaybongda', 2, 'Giày bóng đá Động Lực Jogarbola Kumo \"Light blue/Purple\" JG-221106-1-04 - Hàng Chính Hãng', '42', 5),
(57, 'giaybongda', 3, 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '38', 5),
(58, 'giaybongda', 3, 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '39', 5),
(59, 'giaybongda', 3, 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '40', 4),
(60, 'giaybongda', 3, 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '41', 5),
(61, 'giaybongda', 3, 'Giày bóng đá Động Lực Jogarbola Kumo \"Aqua/White\" JG-221106-1-03 - Hàng Chính Hãng', '42', 5),
(62, 'giaybongda', 4, 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '38', 3),
(63, 'giaybongda', 4, 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '39', 5),
(64, 'giaybongda', 4, 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '40', 5),
(65, 'giaybongda', 4, 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '41', 5),
(66, 'giaybongda', 4, 'Giày bóng đá Động Lực Jogarbola Kumo \"Black/Yellow\" JG-221106-1-02 - Hàng Chính Hãng', '42', 5),
(67, 'giaybongda', 5, 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', '38', 5),
(68, 'giaybongda', 5, 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', '39', 5),
(69, 'giaybongda', 5, 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', '40', 5),
(70, 'giaybongda', 5, 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', '41', 5),
(71, 'giaybongda', 5, 'Giày bóng đá Động Lực Jogarbola Kumo \"Navy/Blue\" JG-221106-1-01 - Hàng Chính Hãng', '42', 5),
(72, 'giaybongda', 6, 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', '38', 5),
(73, 'giaybongda', 6, 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', '39', 5),
(74, 'giaybongda', 6, 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', '40', 5),
(75, 'giaybongda', 6, 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', '41', 5),
(76, 'giaybongda', 6, 'Giày bóng đá Nam Động Lực Jogarbola Sân Cỏ Tự Nhiên \"Đen Cam\" 190424A-02 - Hàng Chính Hãng', '42', 5),
(77, 'giaytapgym', 2, 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', '38', 5),
(78, 'giaytapgym', 2, 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', '39', 5),
(79, 'giaytapgym', 2, 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', '40', 5),
(80, 'giaytapgym', 2, 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', '41', 5),
(81, 'giaytapgym', 2, 'Giày thể thao chạy bộ Jogarbola Kaze \"Navy\" JG-KAZE-04 - Hàng Chính Hãng', '42', 5),
(82, 'giaytapgym', 3, 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', '38', 5),
(83, 'giaytapgym', 3, 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', '39', 5),
(84, 'giaytapgym', 3, 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', '40', 5),
(85, 'giaytapgym', 3, 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', '41', 5),
(86, 'giaytapgym', 3, 'Giày thể thao chạy bộ Jogarbola Kaze \"Orange\" JG-KAZE-03 - Hàng Chính Hãng', '42', 5),
(87, 'giaytapgym', 4, 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', '38', 5),
(88, 'giaytapgym', 4, 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', '39', 5),
(89, 'giaytapgym', 4, 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', '40', 5),
(90, 'giaytapgym', 4, 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', '41', 5),
(91, 'giaytapgym', 4, 'Giày thể thao chạy bộ Jogarbola Kaze \"Grey\" JG-KAZE-02 - Hàng Chính Hãng', '42', 5),
(92, 'giaytapgym', 5, 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '38', 5),
(93, 'giaytapgym', 5, 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '39', 5),
(94, 'giaytapgym', 5, 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '40', 4),
(95, 'giaytapgym', 5, 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '41', 5),
(96, 'giaytapgym', 5, 'Giày thể thao chạy bộ Jogarbola Cloud Step \"Blue\" JG-CLOUD-03 - Hàng Chính Hãng', '42', 5),
(97, 'giaytapgym', 6, 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', '38', 5),
(98, 'giaytapgym', 6, 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', '39', 5),
(99, 'giaytapgym', 6, 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', '40', 5),
(100, 'giaytapgym', 6, 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', '41', 5),
(101, 'giaytapgym', 6, 'Giày thể thao Nam Promax Muran \"Navy\" PR-MURAN-05 - Hàng Chính Hãng', '42', 5),
(102, 'giaychaybo', 2, 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '38', 5),
(103, 'giaychaybo', 2, 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '39', 5),
(104, 'giaychaybo', 2, 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '40', 4),
(105, 'giaychaybo', 2, 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '41', 4),
(106, 'giaychaybo', 2, 'Giày Thể Thao Chạy Bộ Nam Động Lực Jogarbola SR24 \"Navy / Royal\" JG-SR24-02 - Hàng Chính Hãng', '42', 5),
(107, 'giaychaybo', 3, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', '38', 5),
(108, 'giaychaybo', 3, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', '39', 5),
(109, 'giaychaybo', 3, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', '40', 5),
(110, 'giaychaybo', 3, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', '41', 5),
(111, 'giaychaybo', 3, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Pink / Grey\" JG-SR24-04 - Hàng Chính Hãng', '42', 5),
(112, 'giaychaybo', 4, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '38', 4),
(113, 'giaychaybo', 4, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '39', 4),
(114, 'giaychaybo', 4, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '40', 5),
(115, 'giaychaybo', 4, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '41', 5),
(116, 'giaychaybo', 4, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Black / Pink\" JG-SR24-05 - Hàng Chính Hãng', '42', 5),
(117, 'giaychaybo', 5, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', '38', 5),
(118, 'giaychaybo', 5, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', '39', 5),
(119, 'giaychaybo', 5, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', '40', 5),
(120, 'giaychaybo', 5, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', '41', 5),
(121, 'giaychaybo', 5, 'Giày Thể Thao Chạy Bộ Nữ Động Lực Jogarbola SR24 \"Purple / Blue / White\" JG-SR24-06 - Hàng Chính Hãng', '42', 5),
(122, 'giaychaybo', 6, 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '38', 4),
(123, 'giaychaybo', 6, 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '39', 5),
(124, 'giaychaybo', 6, 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '40', 5),
(125, 'giaychaybo', 6, 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '41', 5),
(126, 'giaychaybo', 6, 'Giày Thể Thao Chạy Bộ Nam Nữ Động Lực Jogarbola S24 \"Light Blue\" JG-23097-02 - Hàng Chính Hãng', '42', 5),
(127, 'giaycaulong', 2, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', '38', 5),
(128, 'giaycaulong', 2, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', '39', 5),
(129, 'giaycaulong', 2, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', '40', 5),
(130, 'giaycaulong', 2, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', '41', 5),
(131, 'giaycaulong', 2, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Black/Red\" PR-241023-04 - Hàng Chính Hãng', '42', 5),
(132, 'giaycaulong', 3, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', '38', 4),
(133, 'giaycaulong', 3, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', '39', 5),
(134, 'giaycaulong', 3, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', '40', 5),
(135, 'giaycaulong', 3, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', '41', 5),
(136, 'giaycaulong', 3, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-05 - Hàng Chính Hãng', '42', 5),
(137, 'giaycaulong', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '38', 4),
(138, 'giaycaulong', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '39', 5),
(139, 'giaycaulong', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '40', 5),
(140, 'giaycaulong', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '41', 5),
(141, 'giaycaulong', 4, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Blue\" PR-241023-06 - Hàng Chính Hãng', '42', 4),
(142, 'giaycaulong', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '38', 5),
(143, 'giaycaulong', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '39', 5),
(144, 'giaycaulong', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '40', 5),
(145, 'giaycaulong', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '41', 4),
(146, 'giaycaulong', 5, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"White/Purple\" PR-241023-08 - Hàng Chính Hãng', '42', 5),
(147, 'giaycaulong', 6, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '38', 5),
(148, 'giaycaulong', 6, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '39', 4),
(149, 'giaycaulong', 6, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '40', 4),
(150, 'giaycaulong', 6, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '41', 5),
(151, 'giaycaulong', 6, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Red/White\" PR-241023-09 - Hàng Chính Hãng', '42', 5),
(152, 'giaypickleball', 2, 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '38', 5),
(153, 'giaypickleball', 2, 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '39', 5),
(154, 'giaypickleball', 2, 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '40', 4),
(155, 'giaypickleball', 2, 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '41', 4),
(156, 'giaypickleball', 2, 'Giày thể thao Pickleball Promax PI86 \"PInk\" DL-PI86-05 - Hàng Chính Hãng', '42', 5),
(157, 'giaypickleball', 3, 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', '38', 5),
(158, 'giaypickleball', 3, 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', '39', 5),
(159, 'giaypickleball', 3, 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', '40', 5),
(160, 'giaypickleball', 3, 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', '41', 5),
(161, 'giaypickleball', 3, 'Giày thể thao Pickleball Promax PI86 \"White/PInk\" DL-PI86-04 - Hàng Chính Hãng', '42', 5),
(162, 'giaypickleball', 4, 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', '38', 5),
(163, 'giaypickleball', 4, 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', '39', 5),
(164, 'giaypickleball', 4, 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', '40', 5),
(165, 'giaypickleball', 4, 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', '41', 5),
(166, 'giaypickleball', 4, 'Giày thể thao Pickleball Promax PI86 \"White/Navy\" DL-PI86-03 - Hàng Chính Hãng', '42', 5),
(167, 'giaypickleball', 5, 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', '38', 5),
(168, 'giaypickleball', 5, 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', '39', 5),
(169, 'giaypickleball', 5, 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', '40', 5),
(170, 'giaypickleball', 5, 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', '41', 5),
(171, 'giaypickleball', 5, 'Giày thể thao Pickleball Promax PI86 \"Navy\" DL-PI86-02 - Hàng Chính Hãng', '42', 5),
(192, 'giaypickleball', 8, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '38', 5),
(193, 'giaypickleball', 8, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '39', 5),
(194, 'giaypickleball', 8, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '40', 4),
(195, 'giaypickleball', 8, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '41', 5),
(196, 'giaypickleball', 8, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '42', 5),
(197, 'giaypickleball', 9, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '38', 5),
(198, 'giaypickleball', 9, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '39', 5),
(199, 'giaypickleball', 9, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '40', 4),
(200, 'giaypickleball', 9, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '41', 5),
(201, 'giaypickleball', 9, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '42', 5),
(202, 'giaypickleball', 10, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '38', 5),
(203, 'giaypickleball', 10, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '39', 5),
(204, 'giaypickleball', 10, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '40', 4),
(205, 'giaypickleball', 10, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '41', 5),
(206, 'giaypickleball', 10, 'Giày Pickleball Nam Động Lực Jogarbola \"Xanh Navy\" JG-23557-01 - Hàng Chính Hãng', '42', 5),
(217, 'giaypickleball', 11, 'Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng', '38', 5),
(218, 'giaypickleball', 11, 'Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng', '39', 5),
(219, 'giaypickleball', 11, 'Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng', '40', 5),
(220, 'giaypickleball', 11, 'Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng', '41', 5),
(221, 'giaypickleball', 11, 'Giày Pickleball Jogarbola JG-222064 \"Đen\" JG-222064-02 - Hàng Chính Hãng', '42', 5),
(222, 'giaycaulong', 7, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '38', 5),
(223, 'giaycaulong', 7, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '39', 5),
(224, 'giaycaulong', 7, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '40', 5),
(225, 'giaycaulong', 7, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '41', 5),
(226, 'giaycaulong', 7, 'Giày Cầu Lông / Bóng Chuyền Động Lực Promax \"Navy\" PR-241023-02 - Hàng Chính Hãng', '42', 5),
(247, 'giaypickleball', 6, 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', '36', 5),
(248, 'giaypickleball', 6, 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', '39', 5),
(249, 'giaypickleball', 6, 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', '40', 5),
(250, 'giaypickleball', 6, 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', '41', 5),
(251, 'giaypickleball', 6, 'Giày thể thao Pickleball Promax PI86 \"Stone Blue\" DL-PI86-01 - Hàng Chính Hãng', '42', 5);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sizequanao`
--

CREATE TABLE `sizequanao` (
  `id` int(255) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `parent_id` int(255) NOT NULL,
  `name_product` varchar(255) NOT NULL,
  `size` varchar(10) NOT NULL,
  `quantity` int(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sizequanao`
--

INSERT INTO `sizequanao` (`id`, `table_name`, `parent_id`, `name_product`, `size`, `quantity`) VALUES
(72, 'quanaobongro', 80, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'M', 3),
(73, 'quanaobongro', 80, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'L', 0),
(74, 'quanaobongro', 80, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'XL', 4),
(75, 'quanaobongro', 80, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Blue\" MJ-AJ1551-01 - Hàng Chính Hãng', 'XXL', 5),
(76, 'quanaobongro', 81, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'M', 2),
(78, 'quanaobongro', 81, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'L', 5),
(79, 'quanaobongro', 81, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'XL', 4),
(80, 'quanaobongro', 81, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Trắng\" MJ-AJ1497-03 - Hàng Chính Hãng', 'XXL', 5),
(82, 'quanaobongro', 82, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'M', 3),
(83, 'quanaobongro', 82, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'L', 5),
(84, 'quanaobongro', 82, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'XL', 5),
(85, 'quanaobongro', 82, 'Áo phông thể thao Động Lực MJ-AJ1497 \"Xanh\" MJ-AJ1497-02 - Hàng Chính Hãng', 'XXL', 5),
(90, 'quanaobongchuyen', 10, 'Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng', 'M', 5),
(91, 'quanaobongchuyen', 10, 'Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng', 'L', 5),
(92, 'quanaobongchuyen', 10, 'Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng', 'XL', 5),
(93, 'quanaobongchuyen', 10, 'Áo khoác gió Jogarbola \"Trắng\" MJ-P3124-03 - Hàng Chính Hãng', 'XXL', 5),
(94, 'quanaobongchuyen', 11, 'Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng', 'M', 5),
(95, 'quanaobongchuyen', 11, 'Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng', 'L', 5),
(96, 'quanaobongchuyen', 11, 'Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng', 'XL', 5),
(97, 'quanaobongchuyen', 11, 'Áo khoác gió Jogarbola \"Be\" MJ-P3124-02 - Hàng Chính Hãng', 'XXL', 5),
(98, 'quanaobongda', 3, 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'M', 5),
(99, 'quanaobongda', 3, 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'L', 4),
(100, 'quanaobongda', 3, 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'XL', 5),
(101, 'quanaobongda', 3, 'Áo polo Ban Huấn Luyện Đội tuyển Quốc gia 2025 \"Blue\" MJ-A4049-127 - Hàng Chính Hãng', 'XXL', 5),
(102, 'quanaobongda', 4, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'M', 5),
(103, 'quanaobongda', 4, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'L', 4),
(104, 'quanaobongda', 4, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'XL', 5),
(105, 'quanaobongda', 4, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Green\" MJ-E3053-132 - Hàng Chính Hãng', 'XXL', 5),
(106, 'quanaobongda', 5, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng', 'M', 5),
(107, 'quanaobongda', 5, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng', 'L', 5),
(108, 'quanaobongda', 5, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng', 'XL', 5),
(109, 'quanaobongda', 5, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Blue\" MJ-E4047-29 - Hàng Chính Hãng', 'XXL', 5),
(110, 'quanaobongda', 6, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng', 'M', 5),
(111, 'quanaobongda', 6, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng', 'L', 5),
(112, 'quanaobongda', 6, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng', 'XL', 5),
(113, 'quanaobongda', 6, 'Bộ luyện tập Đội tuyển Bóng đá Quốc gia 2025 \"Orange\" MJ-E3053-133 - Hàng Chính Hãng', 'XXL', 5),
(114, 'quanaobongda', 7, 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'M', 5),
(115, 'quanaobongda', 7, 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'L', 2),
(116, 'quanaobongda', 7, 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'XL', 5),
(117, 'quanaobongda', 7, 'Áo polo Đội tuyển Bóng đá Quốc gia 2025 \"Burgundy\" MJ-A4049-126 - Hàng Chính Hãng', 'XXL', 5),
(118, 'quanaogym', 2, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng', 'M', 5),
(119, 'quanaogym', 2, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng', 'L', 5),
(120, 'quanaogym', 2, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng', 'XL', 5),
(121, 'quanaogym', 2, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-500-01 - Hàng Chính Hãng', 'XXL', 5),
(122, 'quanaogym', 3, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng', 'M', 5),
(123, 'quanaogym', 3, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng', 'L', 5),
(124, 'quanaogym', 3, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng', 'XL', 5),
(125, 'quanaogym', 3, 'Áo thun Động Lực Jogarbola nữ \"Trắng\" JG-502-01 - Hàng Chính Hãng', 'XXL', 5),
(126, 'quanaogym', 4, 'Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng', 'M', 5),
(127, 'quanaogym', 4, 'Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng', 'L', 5),
(128, 'quanaogym', 4, 'Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng', 'XL', 5),
(129, 'quanaogym', 4, 'Quần thể thao Jogarbola nam \"Ghi nhạt\" MJ-0422.05-02 - Hàng Chính Hãng', 'XXL', 5),
(130, 'quanaogym', 5, 'Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng', 'M', 5),
(131, 'quanaogym', 5, 'Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng', 'L', 5),
(132, 'quanaogym', 5, 'Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng', 'XL', 5),
(133, 'quanaogym', 5, 'Quần thể thao Jogarbola nam \"Xanh navy\" JG-113-11 - Hàng Chính Hãng', 'XXL', 5),
(134, 'quanaogym', 6, 'Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng', 'M', 5),
(135, 'quanaogym', 6, 'Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng', 'L', 5),
(136, 'quanaogym', 6, 'Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng', 'XL', 5),
(137, 'quanaogym', 6, 'Quần thể thao Jogarbola nam \"Xám\" JG-113-23 - Hàng Chính Hãng', 'XXL', 5),
(138, 'quanaochaybo', 2, 'Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng', 'M', 5),
(139, 'quanaochaybo', 2, 'Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng', 'L', 5),
(140, 'quanaochaybo', 2, 'Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng', 'XL', 5),
(141, 'quanaochaybo', 2, 'Áo khoác gió thể thao đội tuyển quốc gia Việt Nam 2024 \"Xanh Navy\" MJ-PJ1003-02 - Hàng Chính Hãng', 'XXL', 5),
(142, 'quanaochaybo', 3, 'Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng', 'M', 5),
(143, 'quanaochaybo', 3, 'Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng', 'L', 5),
(144, 'quanaochaybo', 3, 'Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng', 'XL', 5),
(145, 'quanaochaybo', 3, 'Áo khoác Jogarbola Pro Training 1.0 \"Đen\" P0124.02-01 - Hàng Chính Hãng', 'XXL', 5),
(146, 'quanaogym', 7, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'M', 5),
(147, 'quanaogym', 7, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'L', 5),
(148, 'quanaogym', 7, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XL', 5),
(149, 'quanaogym', 7, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XXL', 5),
(150, 'quanaochaybo', 4, 'Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng', 'M', 5),
(151, 'quanaochaybo', 4, 'Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng', 'L', 5),
(152, 'quanaochaybo', 4, 'Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng', 'XL', 5),
(153, 'quanaochaybo', 4, 'Áo khoác Jogarbola Active 1.0 \"Đen\" P0124.01-01 - Hàng Chính Hãng', 'XXL', 5),
(154, 'quanaochaybo', 5, 'Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng', 'M', 5),
(155, 'quanaochaybo', 5, 'Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng', 'L', 5),
(156, 'quanaochaybo', 5, 'Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng', 'XL', 5),
(157, 'quanaochaybo', 5, 'Áo khoác Jogarbola Active 1.0 \"Xanh Navy\" P0124.01-02 - Hàng Chính Hãng', 'XXL', 5),
(158, 'quanaogym', 8, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'M', 5),
(159, 'quanaogym', 8, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'L', 5),
(160, 'quanaogym', 8, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XL', 5),
(161, 'quanaogym', 8, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XXL', 5),
(162, 'quanaochaybo', 6, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'M', 5),
(163, 'quanaochaybo', 6, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'L', 5),
(164, 'quanaochaybo', 6, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XL', 5),
(165, 'quanaochaybo', 6, 'Áo khoác Jogarbola Pro Training 1.0 \"Xám\" P0124.02-02 - Hàng Chính Hãng', 'XXL', 5),
(166, 'quanaocaulong', 2, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng', 'M', 5),
(167, 'quanaocaulong', 2, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng', 'L', 5),
(168, 'quanaocaulong', 2, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng', 'XL', 5),
(169, 'quanaocaulong', 2, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Tím - Trắng\" DL-AP668-01 - Hàng Chính Hãng', 'XXL', 5),
(170, 'quanaocaulong', 3, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng', 'M', 5),
(171, 'quanaocaulong', 3, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng', 'L', 5),
(172, 'quanaocaulong', 3, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng', 'XL', 5),
(173, 'quanaocaulong', 3, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Hồng - Trắng\" DL-AP666-01 - Hàng Chính Hãng', 'XXL', 5),
(174, 'quanaocaulong', 4, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng', 'M', 5),
(175, 'quanaocaulong', 4, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng', 'L', 5),
(176, 'quanaocaulong', 4, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng', 'XL', 5),
(177, 'quanaocaulong', 4, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Đỏ - Trắng\" DL-AP664-01 - Hàng Chính Hãng', 'XXL', 5),
(178, 'quanaocaulong', 5, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng', 'M', 5),
(179, 'quanaocaulong', 5, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng', 'L', 5),
(180, 'quanaocaulong', 5, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng', 'XL', 5),
(181, 'quanaocaulong', 5, 'Áo Phông Cầu Lông Nữ Động Lực Promax \"Vàng - Xanh\" DL-AP664-10 - Hàng Chính Hãng', 'XXL', 5),
(182, 'quanaocaulong', 6, 'Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng', 'M', 5),
(183, 'quanaocaulong', 6, 'Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng', 'L', 5),
(184, 'quanaocaulong', 6, 'Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng', 'XL', 5),
(185, 'quanaocaulong', 6, 'Áo Phông Cầu Lông Nam Động Lực Promax \"Vàng - Xanh\" DL-AP1369-10 - Hàng Chính Hãng', 'XXL', 5),
(190, 'aobia', 3, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng', 'M', 5),
(191, 'aobia', 3, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng', 'L', 5),
(192, 'aobia', 3, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng', 'XL', 5),
(193, 'aobia', 3, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Xanh lá\" WPC-02 - Hàng Chính Hãng', 'XXL', 5),
(194, 'aobia', 4, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng', 'M', 5),
(195, 'aobia', 4, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng', 'L', 5),
(196, 'aobia', 4, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng', 'XL', 5),
(197, 'aobia', 4, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Đen\" WPC-01 - Hàng Chính Hãng', 'XXL', 5),
(198, 'aobia', 5, 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'M', 5),
(199, 'aobia', 5, 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'L', 5),
(200, 'aobia', 5, 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XL', 5),
(201, 'aobia', 5, 'Áo thi đấu bi-a Peri PR-Shirt (Đỏ / Hồng) - Hàng Chính Hãng', 'XXL', 0),
(270, 'quanaobongro', 79, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng', 'M', 6),
(271, 'quanaobongro', 79, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng', 'L', 5),
(272, 'quanaobongro', 79, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng', 'XL', 5),
(273, 'quanaobongro', 79, 'Áo polo thể thao Jogarbola MJ-AJ1551 \"Xanh Ngọc\" MJ-AJ1551-02 - Hàng Chính Hãng', 'XXL', 5),
(298, 'quanaocaulong', 7, '[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU', 'M', 5),
(299, 'quanaocaulong', 7, '[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU', 'L', 5),
(300, 'quanaocaulong', 7, '[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU', 'XL', 5),
(301, 'quanaocaulong', 7, '[CHÍNH HÃNG BUBADU] ÁO CẦU LÔNG KỈ NIỆM BUBADU OPEN 2024 CHÍNH HÃNG BUBADU', 'XXL', 5),
(302, 'quanaocaulong', 8, 'Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng', 'M', 5),
(303, 'quanaocaulong', 8, 'Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng', 'L', 5),
(304, 'quanaocaulong', 8, 'Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng', 'XL', 5),
(305, 'quanaocaulong', 8, 'Áo thể thao Bubadu nữ \"Xám\" JG-492-23 - Hàng Chính Hãng', 'XXL', 5),
(306, 'quanaocaulong', 9, 'Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng', 'M', 5),
(307, 'quanaocaulong', 9, 'Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng', 'L', 5),
(308, 'quanaocaulong', 9, 'Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng', 'XL', 5),
(309, 'quanaocaulong', 9, 'Áo phông thể thao Bubadu nam nữ \"Trắng\" MJ-MC0323.02-02 - Hàng Chính Hãng', 'XXL', 5),
(310, 'quanaobongchuyen', 7, 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng', 'M', 6),
(311, 'quanaobongchuyen', 7, 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng', 'L', 5),
(312, 'quanaobongchuyen', 7, 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng', 'XL', 5),
(313, 'quanaobongchuyen', 7, 'Bộ quần áo bóng chuyền Nam Promax PR-2406.M \"Cam\" PR-2406.M-03 - Hàng Chính Hãng', 'XXL', 5),
(318, 'aobia', 2, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng', 'S', 5),
(319, 'aobia', 2, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng', 'L', 5),
(320, 'aobia', 2, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng', 'XL', 5),
(321, 'aobia', 2, 'Áo bi-a thi đấu chính thức của giải World Pool Championship \"Trắng Xanh\" WPC-03 - Hàng Chính Hãng', 'XXL', 5);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tags`
--

INSERT INTO `tags` (`id`, `name`) VALUES
(1, 'bóng chuyền'),
(2, 'bóng đá'),
(3, 'bóng rổ'),
(4, 'gym'),
(5, 'chạy bộ'),
(6, 'cầu lông'),
(7, 'bia'),
(8, 'pickleball');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tapgym`
--

CREATE TABLE `tapgym` (
  `topic_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
  `item` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tapgym`
--

INSERT INTO `tapgym` (`topic_id`, `id`, `item`) VALUES
(4, 1, 'Giày Tập Gym'),
(4, 2, 'Quần Áo Gym'),
(4, 3, 'Phụ Kiện Gym');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tintuc`
--

CREATE TABLE `tintuc` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `author` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `view_count` int(11) DEFAULT 0,
  `active` int(2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tintuc`
--

INSERT INTO `tintuc` (`id`, `title`, `content`, `author`, `created_at`, `view_count`, `active`) VALUES
(13, 'Vì sao không bầu mà chỉ định chủ tịch các tỉnh, thành sau sáp nhập?', '<p>(Dân trí) - Theo lý giải, đợt sắp xếp đơn vị hành chính các cấp lần này có những điểm đặc biệt, khác những lần trước đó nên sẽ có cơ chế khác với thông lệ, trong đó có chỉ định chủ tịch tỉnh, thành sau sáp nhập. Đây là vấn đề được đặt ra tại cuộc họp báo chiều 4/5 về dự kiến chương trình kỳ họp thứ 9 Quốc hội khóa XV.</p>\r\n<p>Liên quan chủ trương sắp xếp đơn vị hành chính các cấp, Bộ Chính trị đã có kết luận và Ban Tổ chức Trung ương đã có hướng dẫn về việc không bầu chủ tịch, phó chủ tịch tỉnh, thành sau sáp nhập mà thay vào đó là chỉ định, bổ nhiệm.</p>\r\n<p>Tuy nhiên không ít ý kiến lo ngại việc chỉ định nhân sự sẽ mang ý chí cá nhân, không đảm bảo yếu tố công tâm, khách quan trong chọn lựa nhân sự lãnh đạo cấp tỉnh.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/ZNpgam5lN_uaqNFtDg_o6CADlnk=/thumb_w/1360/2025/05/04/202505041429459751z619244-1746345720801.jpg\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption>Toàn cảnh buổi họp báo (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Với việc chỉ định nhân sự không là đại biểu HĐND giữ các chức danh lãnh đạo HĐND cấp tỉnh, báo chí đặt câu hỏi điều này liệu có phá vỡ nguyên tắc trong công tác bầu cử hiện nay hay không, bởi theo quy định hiện hành, các chức danh lãnh đạo HĐND cấp tỉnh đều phải bầu từ các đại biểu HĐND.</p>\r\n<p>Trả lời câu hỏi này, Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy cho biết đây là nội dung được xem xét và được các cấp có thẩm quyền nghiên cứu, thảo luận.</p>\r\n<p>Cụ thể, tại Kết luận 150, Bộ Chính trị nêu rõ yêu cầu trong lần sắp xếp đơn vị hành chính này sẽ thực hiện cơ chế chỉ định, bổ nhiệm người giữ các chức vụ trong UBND, HĐND ở các đơn vị sau sắp xếp thay cho việc bầu theo quy định của Luật Tổ chức chính quyền địa phương. Bộ Chính trị cũng nêu rõ việc chỉ định nhân sự không phải đại biểu HĐND làm lãnh đạo HĐND cấp tỉnh, cấp xã.</p>\r\n<p>\"Đây là cơ chế trước đây chưa thực hiện, nhưng lần sắp xếp này có đặc điểm khác biệt so với việc sắp xếp đơn vị hành chính trước đây\", theo lý giải được bà Thủy đưa ra.</p>\r\n<p>Bà cho biết trước đây, cả nước đã có 2 đợt sắp xếp lớn vào năm 2019-2021 và 2023-2025. Nhưng lần này, ngoài việc sáp nhập đơn vị hành chính cấp tỉnh và cấp xã, bà Thủy nhấn mạnh chúng ta còn thực hiện chủ trương lớn của Đảng là không tổ chức các đơn vị hành chính cấp huyện. Vì thế, các cơ quan thuộc chính quyền địa phương cấp huyện sẽ kết thúc hoạt động cùng thời điểm nhập tỉnh, nhập xã.</p>\r\n<p>Để đáp ứng yêu cầu về bố trí, sắp xếp cán bộ, đặc biệt là cán bộ công chức đang công tác ở cấp huyện làm việc ở các cơ quan, đơn vị mới cũng như khai thác tối đa nguồn nhân lực hiện có, Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp nhấn mạnh Bộ Chính trị đã có chỉ đạo trong lần sắp xếp này, sẽ thực hiện cơ chế chỉ định, bổ nhiệm đối với người giữ chức vụ lãnh đạo UBND, HĐND tại các đơn vị thực hiện sắp xếp.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/8YC_8Pk4bUs-tM3yz1ANC8NLKE0=/thumb_w/1360/2025/05/04/nguyen-phuong-thuy-edited-1746345760441.jpeg\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption>Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp Nguyễn Phương Thủy (Ảnh: Minh Châu).</figcaption>\r\n</figure>\r\n<p>Song bà Thủy lưu ý, việc này chỉ thực hiện trong năm 2025 ứng với lần thực hiện sắp xếp quy mô lớn, còn những năm sau sẽ thực hiện bầu bình thường như thông lệ, HĐND sẽ bầu các chức danh của HĐND và UBND.</p>\r\n<p>Việc này cũng sẽ được ghi nhận trong Nghị quyết sửa đổi, bổ sung một số điều của Hiến pháp 2013 tại quy định chuyển tiếp, để làm cơ sở pháp lý cho việc thực hiện, theo lời Phó Chủ nhiệm Ủy ban Pháp luật và Tư pháp.</p>\r\n<p>Theo hướng dẫn của Ban Chấp hành Trung ương Đảng vừa ban hành về sắp xếp tổ chức bộ máy cơ quan Mặt trận Tổ quốc Việt Nam, đoàn thể cấp tỉnh, cấp xã, Ban Tổ chức Trung ương sẽ thẩm định đề án của các tỉnh, thành ủy; đồng thời tham mưu, trình Bộ Chính trị, Ban Bí thư quyết định thành lập đảng bộ các tỉnh, thành phố trực thuộc Trung ương.</p>\r\n<p>Cơ quan này cũng tham mưu Bộ Chính trị, Ban Bí thư việc chỉ định ban chấp hành, ban thường vụ, bí thư, phó bí thư tỉnh ủy, thành ủy, ủy ban kiểm tra, chủ nhiệm, phó chủ nhiệm ủy ban kiểm tra tỉnh ủy, thành ủy nhiệm kỳ 2020-2025. Thời gian hoàn thành nhiệm vụ này cần đồng nhất với việc sáp nhập tỉnh, tức chậm nhất trước 15/9.</p>\r\n<p>Theo Nghị quyết 60 của Hội nghị Trung ương 11 khóa XIII, sẽ có 11 tỉnh, thành phố giữ nguyên hiện trạng (gồm Hà Nội, Huế, Lai Châu, Điện Biên, Sơn La, Lạng Sơn, Quảng Ninh, Thanh Hóa, Nghệ An, Hà Tĩnh và Cao Bằng).</p>\r\n<p>52 địa phương khác sẽ tiến hành sáp nhập để còn lại 23 tỉnh, thành phố.</p>\r\n<p>Số lượng đơn vị hành chính cấp xã dự kiến sau sắp xếp giảm từ 10.035 xuống còn hơn 3.320 đơn vị (tương đương 66,91%).</p>\r\n<p>Về số lượng cán bộ, công chức cấp tỉnh, cấp xã (bao gồm khối Đảng, đoàn thể và khối chính quyền), dự kiến sau sắp xếp, cấp tỉnh sẽ giảm hơn 18.440 biên chế cán bộ, công chức so với số biên chế được cấp có thẩm quyền giao năm 2022.</p>\r\n<p>Cấp xã (xã, phường, đặc khu) sẽ giảm hơn 110.780 biên chế cán bộ, công chức so với tổng số biên chế cấp huyện và cấp xã giao năm 2022 do sắp xếp vị trí việc làm, tinh giản biên chế, nghỉ chế độ theo quy định.</p>\r\n<p>Ngoài ra, khoảng 120.500 người hoạt động không chuyên trách ở cấp xã trong cả nước sẽ kết thúc hoạt động.</p>\r\n<p></p>\r\n<p></p>', NULL, '2024-05-06 16:13:49', 2, 1),
(15, '\"Sau 8 tiếng trên lớp, giáo viên bỏ công sức dạy thêm không có gì sai\"', '<p>Theo đại biểu Trần Khánh Thu, việc giáo viên từ bỏ thời gian cho gia đình để làm thêm công việc chuyên môn và tăng thêm thu nhập, không có gì sai trái. Vấn đề là cần ngăn những khía cạnh tiêu cực. Quan điểm này được đại biểu Quốc hội tỉnh Thái Bình Trần Khánh Thu đưa ra sáng 6/5, khi thảo luận trên hội trường Quốc hội về dự thảo Luật Nhà giáo.</p>\r\n<p>Chia sẻ góc nhìn về vấn đề dạy thêm, học thêm, nữ đại biểu nhận định việc này phải xuất phát từ nhu cầu học tập của xã hội, của học sinh và phụ huynh, không thể quy rằng giáo viên ép buộc trong vấn đề học thêm.</p>\r\n<figure><img src=\"/baocao/view/img/upload/news/681b30c50861c.webp\" alt=\"\" width=\"700\" height=\"467\">\r\n<figcaption>Đại biểu Quốc hội Trần Khánh Thu (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Thực tế, theo bà Thu, nhiều học sinh vẫn tự nguyện ra trung tâm học thêm tiếng Anh hay tự nguyện học thêm các môn văn hóa khác như âm nhạc, mỹ thuật, võ thuật…</p>\r\n<p>Vì thế, việc học thêm, bà Thu cho rằng là nguyện vọng chính đáng. \"Như vậy, khi có nhu cầu của học sinh, của gia đình thì giáo viên cũng mong muốn, có nhu cầu có thêm thu nhập và họ chọn cách đi làm thêm là dạy thêm. Thu nhập của giáo viên ở đây tôi cho rằng hoàn toàn chính đáng, phù hợp\", đại biểu Trần Khánh Thu nêu quan điểm.</p>\r\n<p>Theo bà, sau 8 tiếng dạy ở trên lớp, giáo viên hoàn toàn có thể bỏ công sức ra để dạy thêm.</p>\r\n<p>\"Việc các giáo viên từ bỏ thời gian cho gia đình để làm thêm công việc liên quan đến chuyên môn và mang lại lợi ích, tăng thêm thu nhập, tôi nghĩ không có gì sai trái cả. Ở đây, điều quan trọng nhất cần chống là khía cạnh tiêu cực\", bà Thu nói.</p>\r\n<p>Khía cạnh tiêu cực mà đại biểu đề cập, chính là việc lợi dụng để ép buộc học sinh đi học thêm, gây ra những tác động tiêu cực khác.</p>\r\n<p>\"Bản thân tôi không chấp nhận chuyện giáo viên ép buộc để dạy thêm và trục lợi từ dạy thêm, nhưng chúng ta cần có một quy định để tổ chức các hoạt động này một cách chính thống như một loại hình dịch vụ khác và có nề nếp, có quy định\", nữ đại biểu cho rằng nếu làm được như vậy sẽ hạn chế được tiêu cực.</p>\r\n<p>Vì thế, về những việc không được làm quy định trong dự thảo luật, có nội dung \"Ép buộc người học tham gia học thêm dưới mọi hình thức\".</p>\r\n<p>Đại biểu tỉnh Thái Bình đề nghị cơ quan soạn thảo nghiên cứu, sửa đổi nội dung trên thành \"Cấm tham gia dạy học thêm trái quy định của pháp luật\".</p>\r\n<p>Bà giải thích do quy định \"không ép buộc người học tham gia học thêm dưới mọi hình thức\" đã được quy định từ lâu, song việc hạn chế dạy thêm, học thêm không đạt được hiệu quả.</p>\r\n<p>Thực tế, có rất nhiều hình thức không ép buộc nhưng học sinh vẫn phải học thêm bởi chương trình học hiện nay gây áp lực rất lớn cho học sinh, nhất là bậc tiểu học. Do vậy, việc luật hóa cấm dạy thêm, học thêm tự phát là cần thiết.</p>\r\n<p>Bên cạnh đó, theo bà Thu, có thể quy định giao Chính phủ hoặc Bộ Giáo dục và Đào tạo xây dựng bộ quy chế dạy thêm, học thêm theo hướng công khai như các trung tâm và xây dựng quy chế đặc thù để hạn chế việc dạy thêm, học thêm tự phát tràn lan, tránh lãng phí.</p>\r\n<figure><img src=\"https://cdnphoto.dantri.com.vn/D8rEw_SBtvf3qtYLRbY6wFoxilg=/thumb_w/1360/2025/05/06/202505060906445662z6572633953976fb10ecbcc66c0f695d18391912e66c12-edited-1746502873900.jpeg\" alt=\"\" width=\"700\" height=\"467\">\r\n<figcaption>Đại biểu Quốc hội Tô Văn Tám (Ảnh: Hồng Phong).</figcaption>\r\n</figure>\r\n<p>Đại biểu Phạm Văn Hòa (Đồng Tháp) cũng thừa nhận thực tế không cần giáo viên ép, học sinh cũng phải đi học thêm. Vì thế, trong luật cần làm rõ hơn việc \"ép học sinh\" học thêm như thế nào.</p>\r\n<p>Trong khi đó, đại biểu Tô Văn Tám (Kon Tum) cho rằng nếu chương trình, cách dạy ở trường giúp học sinh nắm được ngay trên lớp, học sinh sẽ không có nhu cầu học thêm. Vì vậy, vấn đề đặt ra là cần xem xét chương trình học có đang nặng quá không, khiến nhiều học sinh phải đi học thêm. Đại biểu góp ý cần giảm chương trình và lượng kiến thức học sinh học trên lớp.</p>', NULL, '2025-05-06 17:19:41', 4, 1),
(23, 'Hướng Dẫn Chạy Bộ Đúng Cách Để Không Bị To Bắp Chân', '<figure><img src=\"/baocao/view/img/upload/news/681b62ef97fe4.png\" alt=\"\" width=\"700\" height=\"466\">\r\n<figcaption></figcaption>\r\n</figure>\r\n<p>Giải đáp: Chạy bộ có to chân không?</p>\r\n<p>Việc chạy bộ có thể dẫn đến việc bắp chân bạn trở nên to hơn do sự phát triển của cơ bắp. Ngược lại, nếu bạn chỉ chạy chậm với khoảng cách dài, như các vận động viên marathon, cơ thể sẽ chủ yếu đốt cháy mỡ thừa, khiến bắp chân trở nên nhỏ gọn và săn chắc hơn.</p>\r\n<p> </p>\r\n<p>Nguyên nhân chính khiến bắp chân phát triển khi chạy bộ bao gồm:</p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Chạy sai kỹ thuật: Tiếp đất bằng mũi chân quá nhiều khiến cơ bắp chân (calf) hoạt động liên tục, dẫn đến phì đại cơ.</p>\r\n</li>\r\n<li>\r\n<p>Chạy nước rút hoặc leo dốc thường xuyên: Các bài tập cường độ cao khiến cơ bắp chân co rút mạnh, kích thích tăng cơ.</p>\r\n</li>\r\n<li>\r\n<p>Không giãn cơ sau khi chạy: Cơ bắp chân bị căng cứng, tạo cảm giác \"bó cơ\" và trông to hơn.</p>\r\n</li>\r\n</ul>', NULL, '2025-05-07 20:41:12', 2, 1),
(28, 'Liệt kê các mẫu áo Đội Tuyển Việt Nam phiên bản 2025 MỚI NHẤT', '<p>Năm 2025, Đội tuyển Bóng đá Quốc gia Việt Nam tiếp tục ra mắt những bộ trang phục thi đấu và tập luyện mới, kết hợp giữa công nghệ hiện đại và thiết kế đậm chất truyền thống. Dưới đây là các mẫu áo đội tuyển Việt Nam 2025 đang được người hâm mộ săn đón:</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681b709bbbf4b.png\" alt=\"\" width=\"700\" height=\"467\"></p>\r\n<ol>\r\n<li>Bộ Luyện Tập Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Bộ luyện tập là trang phục không thể thiếu giúp các cầu thủ thoải mái trong các buổi tập. Phiên bản 2025 được làm từ chất liệu 100% polyester cao cấp, mang đến sự bền bỉ, co giãn, giúp cầu thủ vận động dễ dàng.</p>\r\n<p>Thiết kế màu xanh biển tượng trưng cho màu của biển cả, sự tươi mới và năng động. Xen kẽ với những ngôi sao là hình tượng các cơn sóng mạnh mẽ, gợi lên ý chí kiên cường và sức mạnh đoàn kết như dòng chảy bất tận của biển cả Việt Nam. Điểm nhấn nổi bật của áo là những tia sét màu vàng tượng trưng cho sức mạnh của thiên nhiên, tinh thần vượt qua sóng gió của các chiến binh sao vàng.</p>\r\n<figure><img src=\"../img/upload/news/681b70c6892c7.png\" alt=\"\" width=\"400\" height=\"400\">\r\n<figcaption>Bộ quần áo có mức giá khoảng 379.000 đồng</figcaption>\r\n</figure>\r\n<ol start=\"2\">\r\n<li>Áo Polo Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Áo polo là lựa chọn lịch sự, phù hợp với nhiều dịp. Mẫu áo polo 2025 có cổ bẻ, chất liệu thoáng khí. Họa tiết của áo lấy cảm hứng từ hình ảnh sao băng, biểu tượng cho sự tỏa sáng, tốc độ và khát khao chinh phục. Những vệt sáng trên nền áo tượng trưng cho ước mơ vươn xa, khẳng định bản lĩnh trên sân cỏ, giống như cách các cầu thủ Việt Nam không ngừng nỗ lực để tỏa sáng trên đấu trường quốc tế.</p>\r\n<figure><img src=\"/baocao/view/img/upload/news/681b70f17a4d9.png\" alt=\"\" width=\"500\" height=\"500\">\r\n<figcaption>Áo có mức giá khoảng 379.000 đồng</figcaption>\r\n</figure>\r\n<ol start=\"3\">\r\n<li>Áo Thi Đấu Đội Tuyển Bóng Đá Quốc Gia 2025</li>\r\n</ol>\r\n<p>Áo thi đấu chính thức luôn là sản phẩm được fan săn lùng nhiều nhất. Phiên bản 2025 có 2 phiên bản sân nhà (đỏ) và sân khách (trắng), với họa tiết cách điệu từ hình ảnh lá cờ đỏ sao vàng. Chất liệu 100% polyester có khả năng chống nhăn, không bai dão sau thời gian dài sử dụng. Điều này giúp áo luôn giữ được phom dáng sắc nét, thể hiện sự mạnh mẽ và tinh thần thể thao.</p>\r\n<p>Áo thi đấu có họa tiết dãy núi trùng điệp – tượng trưng cho một Việt Nam kiên cường, bất khuất. Như hành trình của đội tuyển quốc gia, chưa bao giờ dễ dàng nhưng cũng chưa bao giờ chùn bước. Mỗi đường nét trên áo là một dấu ấn mạnh mẽ, nhắc nhở rằng: Không bao giờ lùi bước, chỉ có tiến lên để giành vinh quang!</p>', NULL, '2025-05-07 21:41:33', 8, 1),
(35, 'Những Phụ Kiện Bóng Chuyền Đồng Hành Cùng Các VĐV Tại AVC Champion League', '<p>AVC Champion League là giải đấu bóng chuyền hàng đầu châu Á, nơi các vận động viên (VĐV) thi đấu với đỉnh cao phong độ. Để đạt hiệu suất tốt nhất, ngoài kỹ thuật và thể lực, các phụ kiện hỗ trợ như băng gối, băng khuỷu tay và giày bóng chuyền đóng vai trò quan trọng. Bài viết này sẽ phân tích tầm quan trọng của các phụ kiện này trong hành trình chinh phục đỉnh cao của các VĐV.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822adb952dbc.png\" alt=\"\" width=\"700\" height=\"466\"></p>\r\n<p>1. Băng Gối Bóng Chuyền – \"Áo Giáp\" Bảo Vệ Đầu Gối</p>\r\n<p>Vì Sao VĐV AVC Luôn Dùng Băng Gối &amp; Băng Khuỷu Tay?</p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Giảm Chấn Thương Trực Tiếp</p>\r\n</li>\r\n</ul>\r\n<p>Khớp gối phải chịu lực gấp 8 lần trọng lượng cơ thể khi bật nhảy/tiếp đất</p>\r\n<p>Khuỷu tay dễ bị tổn thương khi đỡ bóng hoặc va chạm</p>\r\n<p> </p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Hỗ Trợ Vận Động Chuyên Nghiệp</p>\r\n</li>\r\n</ul>\r\n<p>Cho phép cử động linh hoạt 180 độ</p>\r\n<p>Giữ ổn định khớp trong những tình huống xoay người đột ngột</p>\r\n<p> </p>\r\n<ul style=\"list-style-type: none;\">\r\n<li>\r\n<p>Ngăn Ngừa Chấn Thương Mãn Tính</p>\r\n</li>\r\n</ul>\r\n<p>Giảm nguy cơ viêm khớp, tràn dịch khớp về lâu dài</p>\r\n<p>Hạn chế tình trạng đau nhức sau trận đấu</p>\r\n<p></p>', NULL, '2025-05-08 08:43:54', 3, 1),
(36, 'Trọn Bộ 6 Phiên Bản Vợt Pickleball Aspire x Phúc Huỳnh', '<p>Huỳnh Thiên Phúc hay còn gọi Phúc Huỳnh sinh năm 2000. Phúc Huỳnh là VĐV pickleball chuyên nghiệp từng gây tiếng vang khi thắng nội dung đơn 19+ tại giải pickleball châu Á mở rộng 2024. Khi phong trào pickleball phát triển tại Việt Nam, Phúc Huỳnh đã trở về nước thi đấu, anh mong muốn sẽ được cùng Việt Nam tham dự các giải đấu quốc tế.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad79aa9e4.png\" alt=\"\" width=\"700\" height=\"525\"></p>\r\n<p>Hiện tại, tay vợt Pickleball số 1 châu Á ở nội dung đơn nam đã trở thành đại sứ thương hiệu vợt Zocker cùng với màn ra mắt dòng Vợt Pickleball Aspire x Phúc Huỳnh cao cấp. Nếu bạn đang tìm kiếm một cây vợt pickleball chất lượng, cân bằng giữa hiệu suất và giá trị, Zocker Aspire x Phúc Huỳnh chính là sự lựa chọn hoàn hảo. Được thiết kế dành riêng cho người chơi từ cơ bản đến nâng cao, cây vợt này sở hữu công nghệ tiên tiến cùng thiết kế đẹp mắt, mang đến trải nghiệm thi đấu đỉnh cao.</p>', NULL, '2025-05-08 08:44:57', 1, 1),
(37, 'Hướng Dẫn Cách Cầm Gậy Bi-A Cho Người Mới Chơi', '<p>Bi-a là môn thể thao đòi hỏi sự chính xác, kỹ thuật và tư thế cầm gậy đúng. Nếu bạn mới tập chơi, việc học cách cầm gậy bi-a chuẩn ngay từ đầu sẽ giúp cải thiện khả năng điều khiển lực, nâng cao độ chính xác và tránh những thói quen xấu khó sửa sau này. Bài viết này sẽ hướng dẫn chi tiết từ A-Z cách cầm gậy bi-a cho người mới chơi.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad6774901.png\" alt=\"\" width=\"700\" height=\"467\"></p>\r\n<p>1. Chọn Gậy Bi-A Cho Người Mới Chơi</p>\r\n<p>Trước khi học cách cầm gậy, bạn cần chọn một cây cue phù hợp:</p>\r\n<p>Độ dài: Thông thường từ 1.4m – 1.5m, phù hợp với chiều cao người chơi.</p>\r\n<p>Trọng lượng: Khoảng 480–520 gram, không quá nặng hoặc quá nhẹ.</p>\r\n<p>Chất liệu: Gỗ maple hoặc carbon fiber, đảm bảo độ cứng và độ đàn hồi tốt.</p>\r\n<p> </p>\r\n<p>Một số loại gậy đánh bi-a phù hợp cho người mới chơi:</p>\r\n<p>Gậy đánh bi-a Peri STV-04 (6.000.000 đồng)</p>\r\n<p>Gậy đánh bi-a Peri Baron R-D08 (5.800.000 đồng)</p>\r\n<p>Gậy đánh bi-a Peri ST-01 (5.800.000 đồng)</p>', NULL, '2025-05-08 08:46:21', 6, 1),
(38, 'AVC Nation Cup Và AVC Champions League Có Gì Khác Nhau? Đại Diện Việt Nam Tại Giải 2025', '<p>AVC (Asian Volleyball Confederation) tổ chức 2 giải đấu lớn nhất châu Á là AVC Nation Cup và AVC Champions League. Dù cùng là giải bóng chuyền nhưng quy mô, đối tượng tham gia và thể thức thi đấu khác nhau. Bài viết này sẽ so sánh chi tiết và cập nhật thông tin đội tuyển Việt Nam năm 2025 mà người hâm mộ không thể bỏ qua.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6822ad5590159.png\" alt=\"\" width=\"700\" height=\"457\"></p>', NULL, '2025-05-08 08:46:56', 5, 1),
(39, 'Cách chọn mua bóng chuyền hơi chuẩn thi đấu', '<p><img src=\"/baocao/view/img/upload/news/6826aaa53f833.png\" alt=\"\" width=\"700\" height=\"466\"></p>\r\n<p>1. Bộ môn bóng chuyền hơi là gì?</p>\r\n<p>Bộ môn bóng chuyền hơi là một biến thể của môn bóng chuyền truyền thống, được thiết kế để phù hợp với nhiều đối tượng chơi, đặc biệt là người trung niên, cao tuổi hoặc những người mới tập luyện thể thao. Bóng chuyền hơi thường làm từ nhựa mềm, nhẹ hơn bóng chuyền da truyền thống, giúp giảm tác động lên tay và cơ thể người chơi.</p>\r\n<p></p>', NULL, '2025-05-08 08:47:36', 18, 1),
(40, 'Bóng Rổ 3x3 Là Gì? Cách Chơi & Dòng Bóng Tốt Nhất', '<ol>\r\n<li>Bóng rổ 3x3 là gì?</li>\r\n</ol>\r\n<p>Bóng rổ 3x3 (còn gọi là bóng rổ 3 người) là một biến thể của bóng rổ truyền thống, được chơi trên một sân nhỏ hơn với 1 rổ duy nhất và 3 cầu thủ mỗi đội. Môn thể thao này đã trở nên phổ biến toàn cầu và trở thành nội dung thi đấu chính thức tại Thế vận hội Olympic 2020.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681c0d85e8052.png\" alt=\"\" width=\"700\" height=\"606\"></p>\r\n<p>Đặc điểm nổi bật của bóng rổ 3x3:</p>\r\n<p>Thời gian ngắn: Mỗi trận kéo dài 10 phút hoặc đội nào ghi 21 điểm trước sẽ thắng.</p>\r\n<p>Luật chơi đơn giản: Không có đồng hồ 24 giây, chỉ cần đưa bóng ra khỏi vạch 2 điểm sau khi bắt bóng bật bảng.</p>\r\n<p>Tốc độ cao: Phù hợp với lối chơi tấn công nhanh và kỹ thuật cá nhân.</p>\r\n<ol start=\"2\">\r\n<li>Cách chơi bóng rổ 3x3 cơ bản</li>\r\n</ol>\r\n<p>Luật chơi chính:</p>\r\n<p>Mỗi đội 3 người (có thể có 1 cầu thủ dự bị).</p>\r\n<p>Bắt đầu trận đấu: Tung đồng xu hoặc oẳn tù tì để chọn quyền giao bóng.</p>\r\n<p>Tính điểm: 1 điểm cho mỗi pha ném phạt hoặc ném trong vạch 2 điểm. 2 điểm cho ném ngoài vạch 2 điểm.</p>\r\n<p>Thay người: Được thay tự do khi bóng \"chết\".</p>\r\n<p>Phạm lỗi: Mỗi đội chỉ được 6 lỗi, từ lỗi thứ 7 trở đi đối phương được ném phạt.</p>\r\n<p>Chiến thuật phổ biến:</p>\r\n<p>Pick &amp; Roll (Cản rồi xoay người) để tạo khoảng trống ném rổ.</p>\r\n<p>Drive &amp; Kick (Dẫn bóng vào trong rồi chuyền ra ngoài) để tạo cơ hội ném 2 điểm.</p>\r\n<p>Phòng thủ chặt (Man-to-man) để hạn chế đối phương ghi điểm.</p>', NULL, '2025-05-08 08:49:08', 13, 1),
(41, 'TIÊU CHÍ ĐỂ MUA CƠ BI-A CHUẨN, CHẤT LƯỢNG', '<p>Khi nhắc đến bộ môn bi-a, việc sở hữu một cây cơ bi-a chất lượng là yếu tố quan trọng giúp bạn nâng cao kỹ năng và tận hưởng trọn vẹn niềm đam mê. Tuy nhiên, không phải ai cũng biết cách mua cơ bi-a chuẩn và phù hợp. Bài viết này sẽ hướng dẫn bạn cách mua cơ bi-a chất lượng, đảm bảo hiệu suất tối ưu khi chơi.</p>\r\n<ol>\r\n<li>Chất Liệu Của Cơ Bi-a Chất liệu là yếu tố đầu tiên quyết định độ bền và hiệu suất của cơ bi-a. Các loại gỗ phổ biến như gỗ phong (Maple) hoặc gỗ hồng đào (Rosewood) thường được ưa chuộng vì độ cứng và khả năng chịu lực tốt. Bạn nên chọn cơ làm từ gỗ tự nhiên, tránh các loại gỗ công nghiệp dễ bị cong vênh. Các dòng gậy/ cơ bi-a từ thương hiệu Peri được làm từ chất liệu Gỗ Phong (Maple). Bạn có thể tham khảo một số dòng cơ Peri dưới đây: Gậy đánh bi-a Peri Speedy SY-02 PR-SY-02 Gậy đánh bi-a Peri ST-02 PR-ST-02 Gậy đánh bi-a Peri Baron R-D05 PR-R-D05</li>\r\n</ol>\r\n<p><img src=\"https://bizweb.dktcdn.net/thumb/1024x1024/100/485/982/products/1-1713578604031.jpg?v=1713578610243\" alt=\"\" width=\"700\" height=\"700\"></p>\r\n<p></p>', NULL, '2025-05-08 08:49:39', 12, 1),
(42, 'TOP 6 PHỤ KIỆN PICKLEBALL KHÔNG THỂ THIẾU: Hướng dẫn chọn mua', '<p>Pickleball là môn thể thao kết hợp giữa tennis, cầu lông và bóng bàn, đang ngày càng phổ biến trên toàn thế giới. Để chơi pickleball hiệu quả và an toàn, việc chuẩn bị đầy đủ các vật phẩm cần thiết là điều không thể bỏ qua. Dưới đây là những phụ kiện pickleball không thể thiếu mà bạn cần biết.</p>\r\n<p><img src=\"https://bizweb.dktcdn.net/100/485/982/files/f9ecc92cbe6c0e32577d1.jpg?v=1742376266226\" alt=\"\" width=\"700\" height=\"700\"></p>', NULL, '2025-05-08 08:50:11', 20, 1),
(43, 'Kỹ Thuật Chơi Pickleball: Hướng Dẫn Từ Cơ Bản Đến Nâng Cao', '<p>Pickleball là môn thể thao kết hợp giữa quần vợt, cầu lông và bóng bàn, đang ngày càng phổ biến nhờ luật chơi đơn giản và phù hợp với mọi lứa tuổi. Để chơi tốt Pickleball, bạn cần nắm vững các kỹ thuật chơi pickleball cơ bản và luyện tập thường xuyên. Dưới đây là một số kỹ thuật quan trọng giúp bạn cải thiện trình độ.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/681c0df777d32.webp\" alt=\"\" width=\"700\" height=\"467\"></p>', NULL, '2025-05-08 08:50:52', 31, 1),
(44, 'So Sánh Các Mẫu Bóng Chuyền Thăng Long Dragon Master: Nên Chọn Loại Nào?', '<p>Bóng chuyền Thăng Long Dragon Master là một trong những thương hiệu uy tín được nhiều vận động viên và người chơi thể thao tin dùng. Trong đó, các dòng DG7700, DG7400 và DG7000 là những sản phẩm nổi bật với chất lượng vượt trội. Bài viết này sẽ so sánh chi tiết để giúp bạn lựa chọn quả bóng phù hợp nhất với nhu cầu của mình.</p>\r\n<p><img src=\"/baocao/view/img/upload/news/6826aacfb754b.png\" alt=\"\" width=\"500\" height=\"281\"></p>\r\n<table border=\"1\" style=\"border-collapse: collapse; width: 99.9774%; height: 108px;\"><colgroup><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"><col style=\"width: 25.0283%;\"></colgroup>\r\n<tbody>\r\n<tr style=\"height: 36px;\">\r\n<td>Đặc Điểm</td>\r\n<td>\r\n<p>DG7700</p>\r\n</td>\r\n<td>\r\n<p>DG7400</p>\r\n</td>\r\n<td>\r\n<p>DG7000</p>\r\n</td>\r\n</tr>\r\n<tr style=\"height: 36px;\">\r\n<td>\r\n<p>Chất liệu</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n<td>\r\n<p>Da tổng hợp</p>\r\n</td>\r\n</tr>\r\n<tr style=\"height: 36px;\">\r\n<td>\r\n<p>Trọng lượng</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n<td>\r\n<p>260 – 280 gram</p>\r\n</td>\r\n</tr>\r\n</tbody>\r\n</table>\r\n<p></p>', NULL, '2025-05-16 10:09:28', 7, 1),
(45, 'Test', '<p><img src=\"/baocao/view/img/upload/news/682c46cccc423.jpg\" alt=\"\" width=\"500\" height=\"750\"></p>\r\n<p>hello</p>', NULL, '2025-05-20 16:00:24', 4, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `votcaulong`
--

CREATE TABLE `votcaulong` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `votcaulong`
--

INSERT INTO `votcaulong` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `warrenty`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 3, 'vcl11.webp', 'vcl12.webp', 'vcl13.webp', 'vcl14.webp', 'Vợt cầu lông Jogarbola Control J750 \"Purple/Blue\" J750-03 - Hàng Chính Hãng', 'Động Lực', '695000', '700000', '12', 5, 1, 1, 19),
(1, 4, 'vcl21.webp', 'vcl22.webp', 'vcl23.webp', 'vcl24.webp', 'Vợt cầu lông Jogarbola Control J750 \"Orange/Yellow\" J750-02 - Hàng Chính Hãng', 'Động Lực', '695000', '700000', '12', 5, 0, 1, 19),
(1, 5, 'vcl41.webp', 'vcl42.webp', 'vcl43.webp', 'vcl44.webp', 'Vợt cầu lông Jogarbola Power J800 \"White/Yellow\" J800-04 - Hàng Chính Hãng', 'Động Lực', '795000', '0', '12', 5, 0, 1, 19),
(1, 6, 'vcl51.webp', 'vcl52.webp', 'vcl53.webp', 'vcl54.webp', 'Vợt cầu lông Jogarbola Power J800 \"White/Purple\" J800-03 - Hàng Chính Hãng', 'Động Lực', '795000', '0', '12', 5, 0, 1, 19),
(1, 7, 'vcl31.webp', 'vcl32.webp', 'vcl33.webp', 'vcl34.webp', 'Vợt cầu lông Jogarbola Control J750 \"Green/Navy\" J750-01 - Hàng Chính Hãng', 'Động Lực', '649000', '0', '12', 5, 0, 1, 19),
(1, 8, '1-1729075726361.webp', 'j800-2-1729651264519.webp', '2-1729075726362.webp', '3-1729075726364.webp', 'Vợt cầu lông Jogarbola Control J750 \"Orange/Yellow\" J750-02 - Hàng Chính Hãng', 'Bubadu', '695000', '720000', '2', 10, 0, 1, 19),
(1, 9, '1-1729075690794.webp', 'j800-3-1729651256306.webp', '2-1729075690796.webp', '3-1729075690798.webp', 'Vợt cầu lông Bubadu Control J750 \"Green/Navy\" J750-01 - Hàng Chính Hãng', 'Bubadu', '695000', '720000', '2', 10, 0, 1, 19),
(1, 10, '1-1729075258827.jpg', 'j750-1-1729651208838.webp', '2-1729075258829.jpg', '3-1729075258830.jpg', 'Vợt cầu lông Bubadu Power J800 \"Black/Orange\" J800-02 - Hàng Chính Hãng', 'Bubadu', '795000', '820000', '2', 10, 0, 1, 19),
(1, 11, '1-1729075222464.webp', 'j750-4-1729651190127.webp', '2-1729075222466.webp', '3-1729075222469.webp', 'Vợt cầu lông Jogarbola Power J800 \"Black/Blue\" J800-01 - Hàng Chính Hãng', 'Động Lực', '795000', '0', '2', 20, 1, 1, 22);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `votpickleball`
--

CREATE TABLE `votpickleball` (
  `parent_id` int(255) NOT NULL,
  `id` int(255) NOT NULL,
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
  `description_id` int(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `votpickleball`
--

INSERT INTO `votpickleball` (`parent_id`, `id`, `image`, `image2`, `image3`, `image4`, `name`, `brand`, `price`, `oprice`, `warrenty`, `quantity`, `view`, `is_active`, `description_id`) VALUES
(1, 2, 'vpk11.webp', 'vpk12.webp', 'vpk13.webp', 'vpk14.webp', 'Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Blue\" ZAxPH-06 - Hàng Chính Hãng', 'Zocker', '3890000', '0', '12', 5, 1, 1, 19),
(1, 3, 'vpk21.webp', 'vpk22.webp', 'vpk23.webp', 'vpk24.webp', 'Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Black\" ZAxPH-05 - Hàng Chính Hãng', 'Zocker', '3890000', '0', '12', 5, 3, 1, 19),
(1, 4, 'vpk31.webp', 'vpk32.webp', 'vpk33.webp', 'vpk34.webp', 'Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Pink\" ZAxPH-04 - Hàng Chính Hãng', 'Zocker', '3890000', '0', '12', 5, 0, 1, 19),
(1, 5, 'vpk41.webp', 'vpk42.webp', 'vpk43.webp', 'vpk44.webp', 'Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"White\" ZAxPH-03 - Hàng Chính Hãng', 'Zocker', '3890000', '0', '12', 5, 0, 1, 19),
(1, 6, 'vpk51.webp', 'vpk52.webp', 'vpk53.webp', 'vpk54.webp', 'Vợt Pickleball Zocker Aspire x Phúc Huỳnh \"Purple\" ZAxPH-02 - Hàng Chính Hãng', 'Zocker', '3890000', '0', '12', 5, 0, 1, 19),
(1, 7, '1-1740371873919.webp', '2-1740371873922.webp', '3-1740371873924.webp', '4-1740371873927.webp', 'Vợt Pickleball Zocker Happy HP01 Standard Thunder \"White/Pink\" HP01-05 - Hàng Chính Hãng', 'Zocker', '800000', '0', '2', 10, 1, 1, 19),
(1, 8, '1-1744361691008.webp', '2-1744361691010.webp', '3-1744361691012.webp', '4-1744361691014.webp', 'Vợt Pickleball Zocker Happy HP05 Pro Series \"Black\" HP05-B - Hàng Chính Hãng', 'Zocker', '2690000', '0', '1', 20, 1, 1, 21);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `voucher`
--

CREATE TABLE `voucher` (
  `id` int(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `active` int(11) NOT NULL,
  `id_user` int(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `voucher`
--

INSERT INTO `voucher` (`id`, `title`, `content`, `name`, `price`, `active`, `id_user`) VALUES
(2, '100K', 'Mã giảm giá WTT100\r\nNhập mã để giảm ngay 100K', 'WTT100', '100000', 1, 1),
(3, '200K', 'Mã giảm giá WTT200\r\nNhập mã để giảm ngay 200K', 'WTT200', '200000', 0, 2),
(4, 'Freeship', 'Mã giảm giá FREESHIP\r\nNhập mã để miễn phí vận chuyển', 'FREESHIP', 'FREESHIP', 1, 2),
(5, '50K', 'Mã giảm giá WTT50\r\nNhập mã để giảm ngay 50K', 'WTT50', '50000', 1, 1),
(33, 'WTT20', 'Mã giảm 20k', 'WTT20', '20000', 1, 1),
(34, 'WTT20', 'Mã giảm 20k', 'WTT20', '20000', 0, 2),
(35, '10K', 'Mã giảm 10k', 'WTT10', '10000', 1, 1),
(36, '10K', 'Mã giảm 10k', 'WTT10', '10000', 0, 2),
(37, '10K', 'Mã giảm 10k', 'WTT10', '10000', 1, 17),
(38, '1k', 'Mã giảm 1k', 'WTT1K', '1000', 0, 2);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `aobia`
--
ALTER TABLE `aobia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bia_id_aobia` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `bia`
--
ALTER TABLE `bia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_bia` (`topic_id`);

--
-- Chỉ mục cho bảng `bongchuyen`
--
ALTER TABLE `bongchuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_bongchuyen` (`topic_id`);

--
-- Chỉ mục cho bảng `bongda`
--
ALTER TABLE `bongda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_bongda` (`topic_id`);

--
-- Chỉ mục cho bảng `bongro`
--
ALTER TABLE `bongro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_topic_id_bongro` (`topic_id`);

--
-- Chỉ mục cho bảng `category_nav_items`
--
ALTER TABLE `category_nav_items`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `caulong`
--
ALTER TABLE `caulong`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_caulong` (`topic_id`);

--
-- Chỉ mục cho bảng `cauthidau`
--
ALTER TABLE `cauthidau`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caulong_id_cauthidau` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `chaybo`
--
ALTER TABLE `chaybo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_chaybo` (`topic_id`);

--
-- Chỉ mục cho bảng `donhang`
--
ALTER TABLE `donhang`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `donhangchitiet`
--
ALTER TABLE `donhangchitiet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_donhang_id_donhangchitiet` (`iddonhang`);

--
-- Chỉ mục cho bảng `foot_banner`
--
ALTER TABLE `foot_banner`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `gaybia`
--
ALTER TABLE `gaybia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bia_id_gaybia` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaybongchuyen`
--
ALTER TABLE `giaybongchuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongchuyen_id_giaybongchuyen` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaybongda`
--
ALTER TABLE `giaybongda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongda_id_giaybongda` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaybongro`
--
ALTER TABLE `giaybongro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongro_id_giaybongro` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaycaulong`
--
ALTER TABLE `giaycaulong`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caulong_id_giaycaulong` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaychaybo`
--
ALTER TABLE `giaychaybo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_chaybo_id_giaychaybo` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaypickleball`
--
ALTER TABLE `giaypickleball`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pick_id_giaypick` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giaytapgym`
--
ALTER TABLE `giaytapgym`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tapgym_id_giaygym` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `giohang`
--
ALTER TABLE `giohang`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user_id_giohang` (`id_user`);

--
-- Chỉ mục cho bảng `head_banner`
--
ALTER TABLE `head_banner`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `khachhang`
--
ALTER TABLE `khachhang`
  ADD PRIMARY KEY (`id_user`);

--
-- Chỉ mục cho bảng `messenger`
--
ALTER TABLE `messenger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `messenger_products`
--
ALTER TABLE `messenger_products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `message_id` (`message_id`);

--
-- Chỉ mục cho bảng `mid_banner`
--
ALTER TABLE `mid_banner`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `motasanpham`
--
ALTER TABLE `motasanpham`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `news_images`
--
ALTER TABLE `news_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `news_id` (`news_id`);

--
-- Chỉ mục cho bảng `news_tags`
--
ALTER TABLE `news_tags`
  ADD PRIMARY KEY (`news_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`);

--
-- Chỉ mục cho bảng `pending_orders`
--
ALTER TABLE `pending_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`);

--
-- Chỉ mục cho bảng `phukienbia`
--
ALTER TABLE `phukienbia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bia_id_phukienbia` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukienbongchuyen`
--
ALTER TABLE `phukienbongchuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongchuyen_id_phukienbc` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukienbongda`
--
ALTER TABLE `phukienbongda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongda_id_phukienbongda` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukienbongro`
--
ALTER TABLE `phukienbongro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongro_id_phukienbongro` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukiencaulong`
--
ALTER TABLE `phukiencaulong`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caulong_id_phukiencl` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukienchaybo`
--
ALTER TABLE `phukienchaybo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_chaybo_id_phukienchay` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukiengym`
--
ALTER TABLE `phukiengym`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tapgym_id_phukiengym` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `phukienpick`
--
ALTER TABLE `phukienpick`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pick_id_phukienpick` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `pickleball`
--
ALTER TABLE `pickleball`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_pick` (`topic_id`);

--
-- Chỉ mục cho bảng `quabongchuyen`
--
ALTER TABLE `quabongchuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongchuyen_id_quabongchuyen` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quabongda`
--
ALTER TABLE `quabongda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongda_id_quabongda` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quabongro`
--
ALTER TABLE `quabongro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongro_id_quabongro` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaobongchuyen`
--
ALTER TABLE `quanaobongchuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongchuyen_id_quanaobongchuyen` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaobongda`
--
ALTER TABLE `quanaobongda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongda_id_quanaobongda` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaobongro`
--
ALTER TABLE `quanaobongro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bongro_id_quanaobongro` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaocaulong`
--
ALTER TABLE `quanaocaulong`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caulong_id_quanaocaulong` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaochaybo`
--
ALTER TABLE `quanaochaybo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_chaybo_id_quanaochay` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `quanaogym`
--
ALTER TABLE `quanaogym`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tapgym_id_quanaogym` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `sanpham`
--
ALTER TABLE `sanpham`
  ADD PRIMARY KEY (`topic_id`);

--
-- Chỉ mục cho bảng `sizegiay`
--
ALTER TABLE `sizegiay`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `sizequanao`
--
ALTER TABLE `sizequanao`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `tapgym`
--
ALTER TABLE `tapgym`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sanpham_id_gym` (`topic_id`);

--
-- Chỉ mục cho bảng `tintuc`
--
ALTER TABLE `tintuc`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `votcaulong`
--
ALTER TABLE `votcaulong`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caulong_id_votcl` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `votpickleball`
--
ALTER TABLE `votpickleball`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pick_id_votpick` (`parent_id`),
  ADD KEY `description_id` (`description_id`);

--
-- Chỉ mục cho bảng `voucher`
--
ALTER TABLE `voucher`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_khachhang_id_voucher` (`id_user`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `aobia`
--
ALTER TABLE `aobia`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `bia`
--
ALTER TABLE `bia`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `bongchuyen`
--
ALTER TABLE `bongchuyen`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `bongda`
--
ALTER TABLE `bongda`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `bongro`
--
ALTER TABLE `bongro`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `category_nav_items`
--
ALTER TABLE `category_nav_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `caulong`
--
ALTER TABLE `caulong`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `cauthidau`
--
ALTER TABLE `cauthidau`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `chaybo`
--
ALTER TABLE `chaybo`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `donhang`
--
ALTER TABLE `donhang`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

--
-- AUTO_INCREMENT cho bảng `donhangchitiet`
--
ALTER TABLE `donhangchitiet`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=171;

--
-- AUTO_INCREMENT cho bảng `foot_banner`
--
ALTER TABLE `foot_banner`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `gaybia`
--
ALTER TABLE `gaybia`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `giaybongchuyen`
--
ALTER TABLE `giaybongchuyen`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `giaybongda`
--
ALTER TABLE `giaybongda`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `giaybongro`
--
ALTER TABLE `giaybongro`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT cho bảng `giaycaulong`
--
ALTER TABLE `giaycaulong`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `giaychaybo`
--
ALTER TABLE `giaychaybo`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `giaypickleball`
--
ALTER TABLE `giaypickleball`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT cho bảng `giaytapgym`
--
ALTER TABLE `giaytapgym`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `giohang`
--
ALTER TABLE `giohang`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=146;

--
-- AUTO_INCREMENT cho bảng `head_banner`
--
ALTER TABLE `head_banner`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT cho bảng `khachhang`
--
ALTER TABLE `khachhang`
  MODIFY `id_user` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT cho bảng `messenger`
--
ALTER TABLE `messenger`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `messenger_products`
--
ALTER TABLE `messenger_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `mid_banner`
--
ALTER TABLE `mid_banner`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `motasanpham`
--
ALTER TABLE `motasanpham`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT cho bảng `news_images`
--
ALTER TABLE `news_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT cho bảng `pending_orders`
--
ALTER TABLE `pending_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT cho bảng `phukienbia`
--
ALTER TABLE `phukienbia`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `phukienbongchuyen`
--
ALTER TABLE `phukienbongchuyen`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `phukienbongda`
--
ALTER TABLE `phukienbongda`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `phukienbongro`
--
ALTER TABLE `phukienbongro`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `phukiencaulong`
--
ALTER TABLE `phukiencaulong`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `phukienchaybo`
--
ALTER TABLE `phukienchaybo`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `phukiengym`
--
ALTER TABLE `phukiengym`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `phukienpick`
--
ALTER TABLE `phukienpick`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `pickleball`
--
ALTER TABLE `pickleball`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `quabongchuyen`
--
ALTER TABLE `quabongchuyen`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `quabongda`
--
ALTER TABLE `quabongda`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `quabongro`
--
ALTER TABLE `quabongro`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT cho bảng `quanaobongchuyen`
--
ALTER TABLE `quanaobongchuyen`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `quanaobongda`
--
ALTER TABLE `quanaobongda`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `quanaobongro`
--
ALTER TABLE `quanaobongro`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT cho bảng `quanaocaulong`
--
ALTER TABLE `quanaocaulong`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `quanaochaybo`
--
ALTER TABLE `quanaochaybo`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `quanaogym`
--
ALTER TABLE `quanaogym`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `sanpham`
--
ALTER TABLE `sanpham`
  MODIFY `topic_id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `sizegiay`
--
ALTER TABLE `sizegiay`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=252;

--
-- AUTO_INCREMENT cho bảng `sizequanao`
--
ALTER TABLE `sizequanao`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=322;

--
-- AUTO_INCREMENT cho bảng `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `tapgym`
--
ALTER TABLE `tapgym`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `tintuc`
--
ALTER TABLE `tintuc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT cho bảng `votcaulong`
--
ALTER TABLE `votcaulong`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `votpickleball`
--
ALTER TABLE `votpickleball`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `voucher`
--
ALTER TABLE `voucher`
  MODIFY `id` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `aobia`
--
ALTER TABLE `aobia`
  ADD CONSTRAINT `aobia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`),
  ADD CONSTRAINT `fk_bia_id_aobia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`);

--
-- Các ràng buộc cho bảng `bia`
--
ALTER TABLE `bia`
  ADD CONSTRAINT `fk_sanpham_id_bia` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `bongchuyen`
--
ALTER TABLE `bongchuyen`
  ADD CONSTRAINT `fk_sanpham_id_bongchuyen` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `bongda`
--
ALTER TABLE `bongda`
  ADD CONSTRAINT `fk_sanpham_id_bongda` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `bongro`
--
ALTER TABLE `bongro`
  ADD CONSTRAINT `fk_sanpham_topic_id_bongro` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `caulong`
--
ALTER TABLE `caulong`
  ADD CONSTRAINT `fk_sanpham_id_caulong` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `cauthidau`
--
ALTER TABLE `cauthidau`
  ADD CONSTRAINT `cauthidau_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`),
  ADD CONSTRAINT `fk_caulong_id_cauthidau` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`);

--
-- Các ràng buộc cho bảng `chaybo`
--
ALTER TABLE `chaybo`
  ADD CONSTRAINT `fk_sanpham_id_chaybo` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `donhangchitiet`
--
ALTER TABLE `donhangchitiet`
  ADD CONSTRAINT `fk_donhang_id_donhangchitiet` FOREIGN KEY (`iddonhang`) REFERENCES `donhang` (`id`);

--
-- Các ràng buộc cho bảng `gaybia`
--
ALTER TABLE `gaybia`
  ADD CONSTRAINT `fk_bia_id_gaybia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`),
  ADD CONSTRAINT `gaybia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaybongchuyen`
--
ALTER TABLE `giaybongchuyen`
  ADD CONSTRAINT `fk_bongchuyen_id_giaybongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  ADD CONSTRAINT `giaybongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaybongda`
--
ALTER TABLE `giaybongda`
  ADD CONSTRAINT `fk_bongda_id_giaybongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  ADD CONSTRAINT `giaybongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaybongro`
--
ALTER TABLE `giaybongro`
  ADD CONSTRAINT `fk_bongro_id_giaybongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  ADD CONSTRAINT `giaybongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaycaulong`
--
ALTER TABLE `giaycaulong`
  ADD CONSTRAINT `fk_caulong_id_giaycaulong` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  ADD CONSTRAINT `giaycaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaychaybo`
--
ALTER TABLE `giaychaybo`
  ADD CONSTRAINT `fk_chaybo_id_giaychaybo` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  ADD CONSTRAINT `giaychaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaypickleball`
--
ALTER TABLE `giaypickleball`
  ADD CONSTRAINT `fk_pick_id_giaypick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  ADD CONSTRAINT `giaypickleball_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giaytapgym`
--
ALTER TABLE `giaytapgym`
  ADD CONSTRAINT `fk_tapgym_id_giaygym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  ADD CONSTRAINT `giaytapgym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `giohang`
--
ALTER TABLE `giohang`
  ADD CONSTRAINT `fk_user_id_giohang` FOREIGN KEY (`id_user`) REFERENCES `khachhang` (`id_user`);

--
-- Các ràng buộc cho bảng `messenger`
--
ALTER TABLE `messenger`
  ADD CONSTRAINT `messenger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `khachhang` (`id_user`) ON DELETE SET NULL;

--
-- Các ràng buộc cho bảng `messenger_products`
--
ALTER TABLE `messenger_products`
  ADD CONSTRAINT `messenger_products_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messenger` (`id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `news_images`
--
ALTER TABLE `news_images`
  ADD CONSTRAINT `news_images_ibfk_1` FOREIGN KEY (`news_id`) REFERENCES `tintuc` (`id`);

--
-- Các ràng buộc cho bảng `news_tags`
--
ALTER TABLE `news_tags`
  ADD CONSTRAINT `news_tags_ibfk_1` FOREIGN KEY (`news_id`) REFERENCES `tintuc` (`id`),
  ADD CONSTRAINT `news_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`);

--
-- Các ràng buộc cho bảng `phukienbia`
--
ALTER TABLE `phukienbia`
  ADD CONSTRAINT `fk_bia_id_phukienbia` FOREIGN KEY (`parent_id`) REFERENCES `bia` (`id`),
  ADD CONSTRAINT `phukienbia_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukienbongchuyen`
--
ALTER TABLE `phukienbongchuyen`
  ADD CONSTRAINT `fk_bongchuyen_id_phukienbc` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  ADD CONSTRAINT `phukienbongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukienbongda`
--
ALTER TABLE `phukienbongda`
  ADD CONSTRAINT `fk_bongda_id_phukienbongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  ADD CONSTRAINT `phukienbongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukienbongro`
--
ALTER TABLE `phukienbongro`
  ADD CONSTRAINT `fk_bongro_id_phukienbongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  ADD CONSTRAINT `phukienbongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukiencaulong`
--
ALTER TABLE `phukiencaulong`
  ADD CONSTRAINT `fk_caulong_id_phukiencl` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  ADD CONSTRAINT `phukiencaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukienchaybo`
--
ALTER TABLE `phukienchaybo`
  ADD CONSTRAINT `fk_chaybo_id_phukienchay` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  ADD CONSTRAINT `phukienchaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukiengym`
--
ALTER TABLE `phukiengym`
  ADD CONSTRAINT `fk_tapgym_id_phukiengym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  ADD CONSTRAINT `phukiengym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `phukienpick`
--
ALTER TABLE `phukienpick`
  ADD CONSTRAINT `fk_pick_id_phukienpick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  ADD CONSTRAINT `phukienpick_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `pickleball`
--
ALTER TABLE `pickleball`
  ADD CONSTRAINT `fk_sanpham_id_pick` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `quabongchuyen`
--
ALTER TABLE `quabongchuyen`
  ADD CONSTRAINT `fk_bongchuyen_id_quabongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  ADD CONSTRAINT `quabongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quabongda`
--
ALTER TABLE `quabongda`
  ADD CONSTRAINT `fk_bongda_id_quabongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  ADD CONSTRAINT `quabongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quabongro`
--
ALTER TABLE `quabongro`
  ADD CONSTRAINT `fk_bongro_id_quabongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  ADD CONSTRAINT `quabongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaobongchuyen`
--
ALTER TABLE `quanaobongchuyen`
  ADD CONSTRAINT `fk_bongchuyen_id_quanaobongchuyen` FOREIGN KEY (`parent_id`) REFERENCES `bongchuyen` (`id`),
  ADD CONSTRAINT `quanaobongchuyen_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaobongda`
--
ALTER TABLE `quanaobongda`
  ADD CONSTRAINT `fk_bongda_id_quanaobongda` FOREIGN KEY (`parent_id`) REFERENCES `bongda` (`id`),
  ADD CONSTRAINT `quanaobongda_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaobongro`
--
ALTER TABLE `quanaobongro`
  ADD CONSTRAINT `fk_bongro_id_quanaobongro` FOREIGN KEY (`parent_id`) REFERENCES `bongro` (`id`),
  ADD CONSTRAINT `quanaobongro_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaocaulong`
--
ALTER TABLE `quanaocaulong`
  ADD CONSTRAINT `fk_caulong_id_quanaocaulong` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  ADD CONSTRAINT `quanaocaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaochaybo`
--
ALTER TABLE `quanaochaybo`
  ADD CONSTRAINT `fk_chaybo_id_quanaochay` FOREIGN KEY (`parent_id`) REFERENCES `chaybo` (`id`),
  ADD CONSTRAINT `quanaochaybo_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `quanaogym`
--
ALTER TABLE `quanaogym`
  ADD CONSTRAINT `fk_tapgym_id_quanaogym` FOREIGN KEY (`parent_id`) REFERENCES `tapgym` (`id`),
  ADD CONSTRAINT `quanaogym_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `tapgym`
--
ALTER TABLE `tapgym`
  ADD CONSTRAINT `fk_sanpham_id_gym` FOREIGN KEY (`topic_id`) REFERENCES `sanpham` (`topic_id`);

--
-- Các ràng buộc cho bảng `votcaulong`
--
ALTER TABLE `votcaulong`
  ADD CONSTRAINT `fk_caulong_id_votcl` FOREIGN KEY (`parent_id`) REFERENCES `caulong` (`id`),
  ADD CONSTRAINT `votcaulong_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `votpickleball`
--
ALTER TABLE `votpickleball`
  ADD CONSTRAINT `fk_pick_id_votpick` FOREIGN KEY (`parent_id`) REFERENCES `pickleball` (`id`),
  ADD CONSTRAINT `votpickleball_ibfk_1` FOREIGN KEY (`description_id`) REFERENCES `motasanpham` (`id`);

--
-- Các ràng buộc cho bảng `voucher`
--
ALTER TABLE `voucher`
  ADD CONSTRAINT `fk_voucher_id_user_khachang` FOREIGN KEY (`id_user`) REFERENCES `khachhang` (`id_user`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
