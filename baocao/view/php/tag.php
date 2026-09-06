<?php
session_start();

// Check if tag data exists in session
if (isset($_SESSION['tag']) && isset($_SESSION['tag_news']) && isset($_SESSION['tags'])) {
    $tag = $_SESSION['tag'];
    $news = $_SESSION['tag_news'];
    $tags = $_SESSION['tags'];
    $categories = $_SESSION['categories'] ?? [];
    $sidebar_news = $_SESSION['sidebar_news'] ?? [];
} else {
    // If no session data is found, redirect to the controller
    $tag_id = isset($_GET['tag_id']) ? intval($_GET['tag_id']) : 0;
    header("Location: /baocao/user/submit?action=tag&tag_id=" . $tag_id);
    exit();
}

// Clear the session data after use to prevent stale data on refresh
// Comment out this section if you want to keep the data in session
// unset($_SESSION['tag']);
// unset($_SESSION['tag_news']);
// We don't unset tags, categories, and sidebar_news as they might be used by other pages
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tin tức theo tag: <?= htmlspecialchars($tag['name'] ?? '') ?> | SportVN</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="tag, thể thao, NHL Sports, thời trang thể thao">
    <link rel="stylesheet" href="/baocao/view/css/tag.css">
</head>

<body>
    <header><?php include "header.php"; ?></header>

    <div class="container main-content">
        <div class="row">
            <div class="col-md-8">
                <a href="/baocao/user/submit?action=list" class="back-link">← Quay lại danh sách tin tức</a>
                <?php if (isset($tag['name'])): ?>

                    <div class="tag-header">
                        <h1>Tin tức với tag: <?= htmlspecialchars($tag['name']) ?></h1>
                    </div>

                    <div class="article-list">
                        <?php if (empty($news)): ?>
                            <p>Không có tin tức nào với tag này.</p>
                        <?php else: ?>
                            <?php foreach ($news as $item): ?>
                                <div class="article-item">
                                    <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($item['id']) ?>">
                                        <div class="article-image">
                                            <?php if (!empty($item['image_url'])): ?>
                                                <img src="<?= htmlspecialchars($item['image_url']) ?>"
                                                    alt="<?= htmlspecialchars($item['title']) ?>">
                                                <?php if (!empty($item['caption'])): ?>
                                                    <div class="image-caption"><?= htmlspecialchars($item['caption']) ?></div>
                                                <?php endif; ?>
                                            <?php else: ?>
                                                <img src="/baocao/view/img/bannerdt2.png"
                                                    alt="<?= htmlspecialchars($item['title']) ?>">
                                            <?php endif; ?>
                                        </div>
                                    </a>
                                    <div class="article-content">
                                        <h3><a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($item['id']) ?>"><?= htmlspecialchars($item['title']) ?></a></h3>
                                        <div class="article-meta">
                                            <span><?= date('l, d/m/Y', strtotime($item['created_at'])) ?></span>
                                        </div>
                                        <div class="article-desc">
                                            <?= htmlspecialchars(substr(strip_tags($item['content']), 0, 150)) ?>...
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                <?php else: ?>
                    <p>Tag không tồn tại hoặc không được chỉ định.</p>
                <?php endif; ?>

            </div>

            <div class="sidebar-section">
                <h3 class="sidebar-title">TAGS</h3>
                <form id="tagForm" action="/baocao/user/submit" method="POST">
                    <input type="hidden" name="action" value="tag">
                    <input type="hidden" name="tag_id" id="tagIdInput">
                    <div class="tags-container">
                        <?php foreach ($tags as $tag): ?>
                            <a href="#" class="tag" data-tag-id="<?= htmlspecialchars($tag['id']) ?>">
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