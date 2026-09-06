<?php
session_start();

// Lấy dữ liệu từ session
$news_item = isset($_SESSION['news_item']) ? $_SESSION['news_item'] : null;
$news_images = isset($_SESSION['news_images']) ? $_SESSION['news_images'] : [];
$primary_image = isset($_SESSION['primary_image']) ? $_SESSION['primary_image'] : null;
$related_news = isset($_SESSION['related_news']) ? $_SESSION['related_news'] : [];
$categories = isset($_SESSION['categories']) ? $_SESSION['categories'] : [];
$sidebar_news = isset($_SESSION['sidebar_news']) ? $_SESSION['sidebar_news'] : [];
$tags = isset($_SESSION['tags']) ? $_SESSION['tags'] : [];

// Nếu không có dữ liệu, chuyển hướng đến controller
if (!$news_item && isset($_GET['id'])) {
    header("Location: /baocao/user/submit?action=detail&id=" . $_GET['id']);
    exit();
}
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($news_item['title']) ?> | SportVN</title>
    <link rel="stylesheet" href="/baocao/view/css/danhmuctintuc.css">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="chi tiết tin tức, thể thao, NHL Sports, thời trang thể thao">
    <style>
        .news-detail {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .news-title {
            font-size: 28px;
            margin-bottom: 15px;
            color: #333;
        }

        .news-meta {
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .news-content {
            line-height: 1.6;
            font-size: 16px;
        }

        .news-content img {
            max-width: 100%;
            height: auto;
            margin: 15px 0;
        }

        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #0066cc;
            text-decoration: none;
        }

        .news-primary-image {
            width: 100%;
            margin-bottom: 20px;
            position: relative;
        }

        .news-primary-image img {
            width: 100%;
            height: auto;
            display: block;
        }

        .news-primary-image .caption {
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            padding: 8px 12px;
            font-size: 14px;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
        }

        .news-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
        }

        .news-gallery-item {
            flex: 1 0 calc(33.333% - 10px);
            min-width: 200px;
            position: relative;
        }

        .news-gallery-item img {
            width: 100%;
            height: auto;
            display: block;
        }

        .news-gallery-item .caption {
            display: none;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 5px 8px;
            font-size: 12px;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
        }

        .news-gallery-item:hover .caption {
            display: block;
        }
    </style>
</head>

<body>
    <header><?php include "header.php"; ?></header>
    <div class="container main-content">
        <div class="news-detail">
            <h1 class="news-title"><?= htmlspecialchars($news_item['title']) ?></h1>
            <div class="news-meta">
                <?php if (!empty($news_item['author'])): ?>
                    <span>Tác giả: <?= htmlspecialchars($news_item['author']) ?></span> |
                <?php endif; ?>
                <span>Ngày đăng: <?= date('d/m/Y H:i', strtotime($news_item['created_at'])) ?></span> |
                <span>Lượt xem: <?= $news_item['view_count'] ?></span>
            </div>



            <div class="news-content">
                <?= $news_item['content'] ?>
            </div>

            <?php if (count($news_images) > 1): ?>
                <div class="news-gallery">
                    <?php foreach ($news_images as $img): ?>
                        <?php if ($img['is_primary'] != 1): ?>
                            <div class="news-gallery-item">
                                <img src="<?= htmlspecialchars($img['image_url']) ?>"
                                    alt="<?= htmlspecialchars($news_item['title']) ?>">
                                <?php if (!empty($img['caption'])): ?>
                                    <div class="caption"><?= htmlspecialchars($img['caption']) ?></div>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <a href="/baocao/user/submit?action=list" class="back-link">← Quay lại danh sách tin tức</a>
        </div>

        <div class="sidebar">
            <div class="sidebar-section">
                <h3 class="sidebar-title">DANH MỤC</h3>
                <?php if (!empty($categories)): ?>
                    <?php foreach ($categories as $row): ?>
                        <div class="sale-item">
                            <a class="item" href="#" data-category="<?= htmlspecialchars($row['category']) ?>">
                                <?= htmlspecialchars($row['name']) ?>
                            </a>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="sale-item">Chưa có danh mục nào</div>
                <?php endif; ?>
            </div>

            <div class="sidebar-section">
                <h3 class="sidebar-title">TƯ VẤN THỂ THAO</h3>
                <div class="sidebar-list">
                    <?php foreach ($sidebar_news as $item): ?>
                        <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($item['id']) ?>">
                            <?php if (!empty($item['image_url'])): ?>
                                <img src="<?= htmlspecialchars($item['image_url']) ?>"
                                    alt="<?= htmlspecialchars($item['title']) ?>">
                            <?php else: ?>
                                <img src="/baocao/view/img/bannerdt2.png"
                                    alt="<?= htmlspecialchars($item['title']) ?>">
                            <?php endif; ?>
                            <div>
                                <h4><?= htmlspecialchars($item['title']) ?></h4>
                                <div class="date"><?= date('d/m/Y', strtotime($item['created_at'])) ?></div>
                            </div>
                        </a>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="sidebar-section">
                <h3 class="sidebar-title">TAGS</h3>
                <form id="tagForm" action="/baocao/user/submit" method="POST">
                    <input type="hidden" name="action" value="tag">
                    <input type="hidden" name="tag_id" id="tagIdInput">
                    <div class="tags-container">
                        <?php foreach ($tags as $tag): ?>
                            <a class="tag" data-tag-id="<?= htmlspecialchars($tag['id']) ?>">
                                <?= htmlspecialchars($tag['name']) ?>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <?php include "zalo_icon.php"; ?>
    <?php include "chatbot.php"; ?>
    <footer>
        <?php include "footer.php"; ?>
    </footer>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        function addHyphen(string) {
            // Từ điển ánh xạ các danh mục
            const categoryMap = {
                // Môn thể thao
                'bongro': 'bong-ro',
                'bongchuyen': 'bong-chuyen',
                'bongda': 'bong-da',
                'tapgym': 'tap-gym',
                'chaybo': 'chay-bo',
                'caulong': 'cau-long',
                'pickleball': 'pickle-ball',
                'bia': 'bia',
                'saleoutlet40': 'sale-outlet'
            };

            // Chuyển thành chữ thường
            string = string.toLowerCase();

            // Kiểm tra nếu chuỗi tồn tại trong từ điển
            if (categoryMap[string]) {
                return categoryMap[string];
            }

            // Nếu không có trong từ điển, tách bằng biểu thức chính quy
            // Thêm dấu gạch ngang trước chữ cái in hoa và chuyển thành chữ thường
            const result = string
                .replace(/([a-z])([A-Z])/g, '$1-$2') // Thêm dấu gạch ngang giữa chữ thường và chữ hoa
                .toLowerCase();

            return result;
        }
        $(document).ready(function() {
            $(".sidebar-section .sale-item .item").on("click", function(event) {
                event.preventDefault();
                const category = $(this).data("category");
                const categorySlug = addHyphen(category);
                fetch("/baocao/user/submit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `selected_sport1=${encodeURIComponent(category)}&from_category_nav=true`
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.location.href = `/baocao/trangchude/${encodeURIComponent(categorySlug)}`;
                        } else {
                            console.error("Error fetching products:", data.message);
                        }
                    })
                    .catch(error => console.error("Lỗi fetch:", error));
            });
        });
    </script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const tags = document.querySelectorAll('.tag');
            const form = document.getElementById('tagForm');
            const tagIdInput = document.getElementById('tagIdInput');

            tags.forEach(tag => {
                tag.addEventListener('click', function(event) {
                    event.preventDefault(); // Ngăn hành động mặc định của thẻ <a>
                    tagIdInput.value = this.getAttribute('data-tag-id'); // Cập nhật tag_id
                    form.submit(); // Gửi form
                });
            });
        });
    </script>
</body>

</html>