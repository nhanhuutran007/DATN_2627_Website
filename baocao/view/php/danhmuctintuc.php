<?php
session_start();
// if (!isset($_SESSION['paginated_news'])) {
//     header("Location: ../../controller/UserController.php?action=list");
//     exit();
// }
// Lấy dữ liệu từ session
$featured_news = isset($_SESSION['featured_news']) ? $_SESSION['featured_news'] : [];
$news = isset($_SESSION['paginated_news']) ? $_SESSION['paginated_news'] : [];
$total_pages = isset($_SESSION['total_pages']) ? $_SESSION['total_pages'] : 1;
$current_page = isset($_SESSION['current_page']) ? $_SESSION['current_page'] : 1;
$categories = isset($_SESSION['categories']) ? $_SESSION['categories'] : [];
$sidebar_news = isset($_SESSION['sidebar_news']) ? $_SESSION['sidebar_news'] : [];
$tags = isset($_SESSION['tags']) ? $_SESSION['tags'] : [];

// Gán bài viết nổi bật chính (nếu có)
$main_featured = !empty($featured_news) ? $featured_news[0] : null;
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SportVN - Thông Tin Thể Thao & Sản Phẩm</title>
    <link rel="stylesheet" href="/baocao/view/css/danhmuctintuc.css">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="danh mục tin tức, thể thao, NHL Sports, thời trang thể thao">
</head>

<body>
    <header><?php include "header.php"; ?></header>
    <div class="container main-content">
        <div class="articles">
            <?php if (!empty($featured_news)): ?>
                <div class="featured-articles">
                    <?php if ($main_featured): ?>
                        <div class="featured-large">
                            <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($main_featured['id']) ?>">
                                <div class="featured-image">
                                    <?php if (!empty($main_featured['image_url'])): ?>
                                        <img src="<?= htmlspecialchars($main_featured['image_url']) ?>"
                                            alt="<?= htmlspecialchars($main_featured['title']) ?>">
                                    <?php else: ?>
                                        <img src="/baocao/view/img/bannerdt2.png"
                                            alt="<?= htmlspecialchars($main_featured['title']) ?>">
                                    <?php endif; ?>
                                </div>
                                <div class="featured-text">
                                    <h3><?= htmlspecialchars($main_featured['title']) ?></h3>
                                </div>
                            </a>
                        </div>
                    <?php endif; ?>

                    <div class="featured-small">
                        <?php for ($i = 1; $i < count($featured_news); $i++): ?>
                            <div class="featured-item">
                                <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($featured_news[$i]['id']) ?>">
                                    <div class="featured-image">
                                        <?php if (!empty($featured_news[$i]['image_url'])): ?>
                                            <img src="<?= htmlspecialchars($featured_news[$i]['image_url']) ?>"
                                                alt="<?= htmlspecialchars($featured_news[$i]['title']) ?>">
                                        <?php else: ?>
                                            <img src="/baocao/view/img/bannerdt2.png"
                                                alt="<?= htmlspecialchars($featured_news[$i]['title']) ?>">
                                        <?php endif; ?>
                                    </div>
                                    <div class="featured-text">
                                        <h3><?= htmlspecialchars($featured_news[$i]['title']) ?></h3>
                                    </div>
                                </a>
                            </div>
                        <?php endfor; ?>
                    </div>
                </div>
            <?php endif; ?>

            <div class="article-list">
                <?php if (empty($news)): ?>
                    <p>Không có tin tức nào được tìm thấy.</p>
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

            <!-- Phân trang -->
            <div class="pagination-container">
                <nav aria-label="Page navigation">
                    <ul class="pagination justify-content-center">
                        <!-- Previous Page -->
                        <?php if ($current_page > 1): ?>
                            <li class="page-item">
                                <a class="page-link" href="/baocao/user/submit?action=list&page=<?php echo ($current_page - 1); ?>" aria-label="Previous">
                                    <span aria-hidden="true">&laquo;</span>
                                </a>
                            </li>
                        <?php else: ?>
                            <li class="page-item disabled">
                                <span class="page-link" aria-hidden="true">&laquo;</span>
                            </li>
                        <?php endif; ?>

                        <?php
                        // Define how many page links to show
                        $max_links = 5;
                        $start_page = max(1, $current_page - floor($max_links / 2));
                        $end_page = min($total_pages, $start_page + $max_links - 1);

                        // Adjust start_page if we're near the end
                        $start_page = max(1, $end_page - $max_links + 1);

                        for ($i = $start_page; $i <= $end_page; $i++):
                        ?>
                            <li class="page-item <?php echo $i == $current_page ? 'active' : ''; ?>">
                                <a class="page-link" href="/baocao/user/submit?action=list&page=<?php echo $i; ?>"><?php echo $i; ?></a>
                            </li>
                        <?php endfor; ?>

                        <!-- Next Page -->
                        <?php if ($current_page < $total_pages): ?>
                            <li class="page-item">
                                <a class="page-link" href="/baocao/user/submit?action=list&page=<?php echo ($current_page + 1); ?>" aria-label="Next">
                                    <span aria-hidden="true">&raquo;</span>
                                </a>
                            </li>
                        <?php else: ?>
                            <li class="page-item disabled">
                                <span class="page-link" aria-hidden="true">&raquo;</span>
                            </li>
                        <?php endif; ?>
                    </ul>
                </nav>
            </div>
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

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
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
</body>

</html>