<?php
include "../../model/config/connect.php";
require_once "../../model/UserModel.php";

session_start();

$productsDetail = isset($_SESSION['productsDetail']) ? $_SESSION['productsDetail'] : [];
unset($_SESSION['productsDetail']);
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);
$clear_cart = $_SESSION['clear_cart'] ?? false;
unset($_SESSION['clear_cart']);

// Banner
function getBanners($conn, $table, $where = '', $orderBy = 'id DESC', $limit = 0)
{
    $banners = [];
    $query = "SELECT * FROM `$table`";
    if (!empty($where)) {
        $query .= " WHERE $where";
    }
    if (!empty($orderBy)) {
        $query .= " ORDER BY $orderBy";
    }
    if ($limit > 0) {
        $query .= " LIMIT $limit";
    }
    $result = mysqli_query($conn, $query);
    while ($row = mysqli_fetch_assoc($result)) {
        $banners[] = $row;
    }
    return $banners;
}

$head_banners = getBanners($conn, 'head_banner', 'is_active = 1', '`order` ASC');
$mid_banners = getBanners($conn, 'mid_banner', '', 'id DESC', 3);
$foot_banners = getBanners($conn, 'foot_banner', '', 'id DESC', 1);

// Lấy sản phẩm
function getFilteredProducts($conn, $tables, $includeKeywords = [], $limit, $excludeKeywords = [])
{
    $products = [];
    foreach ($tables as $table) {
        $query = "SELECT * FROM $table WHERE is_active = 1 AND quantity > 0";
        if (!empty($includeKeywords)) {
            $includeConditions = array_map(function ($keyword) {
                return "name LIKE '%" . $keyword . "%'";
            }, $includeKeywords);
            $query .= " AND (" . implode(' OR ', $includeConditions) . ")";
        }
        if (!empty($excludeKeywords)) {
            $excludeConditions = array_map(function ($keyword) {
                return "name NOT LIKE '%" . $keyword . "%'";
            }, $excludeKeywords);
            $query .= " AND (" . implode(' AND ', $excludeConditions) . ")";
        }
        $query .= " ORDER BY RAND() LIMIT $limit";
        $result = mysqli_query($conn, $query);
        while ($row = mysqli_fetch_assoc($result)) {
            $row['table_name'] = $table;
            $products[] = $row;
        }
    }
    shuffle($products);
    return $products;
}

$tables_arrival = [
    'giaybongro',
    'giaybongda',
    'giaybongchuyen',
    'giaycaulong',
    'giaychaybo',
    'giaypickleball',
    'giaytapgym'
];
$tables = [
    'phukienbia',
    'phukienbongchuyen',
    'phukienbongda',
    'phukienbongro',
    'phukiencaulong',
    'phukienchaybo',
    'phukiengym',
    'phukienpick'
];
$quanao = ['quanaobongro', 'quanaobongchuyen', 'quanaobongda', 'quanaogym', 'quanaochaybo', 'quanaocaulong', 'aobia'];

$pk1_products = getFilteredProducts($conn, $tables, ['balo', 'túi', 'mũ', 'mu'], 10);
$pk2_products = getFilteredProducts($conn, $tables, ['tất', 'vớ', 'Tất', 'tat'], 10);
$pk3_products = getFilteredProducts($conn, $tables, ['băng', 'đai', 'gối', 'gót'], 10);
$shoe_products = getFilteredProducts($conn, $tables_arrival, [], 2);
$quanaonam_products = getFilteredProducts($conn, $quanao, [''], 2, ['nữ']);
$quanaonu_products = getFilteredProducts($conn, $quanao, [''], 2, ['nam']);

// Lấy tin tức
$featured_news = getFeaturedNews(1);
$featured_ids = array_column($featured_news, 'id');
$side_news = getPaginatedNews($featured_ids, 1, 4)['news'];

$all_products = [
    ['category' => 'balo-tui-mu', 'items' => array_slice($pk1_products, 0, 10)],
    ['category' => 'tat-vo', 'items' => array_slice($pk2_products, 0, 10)],
    ['category' => 'bang-ho-massage', 'items' => array_slice($pk3_products, 0, 10)],
];
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cửa hàng Thể Thao NHL SPORTS</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="trang chủ, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/trangchu.css">
    <link rel="stylesheet" href="/baocao/view/css/danhmuctintuc.css">
</head>

<body>
    <header><?php include "header.php"; ?></header>
    <?php $user = isset($_SESSION['info']) ? $_SESSION['info'] : [];
    $isLoggedIn = !empty($user) && isset($user['id_user']); ?>

    <?php if (!empty($success_msg)): ?>
        <div id="success-alert" class="alert-success">
            <?= htmlspecialchars($success_msg) ?>
        </div>
    <?php endif; ?>

    <form class="sportsForm" action="/baocao/user/submit" method="POST">
        <div class="main-banner">
            <?php foreach ($head_banners as $index => $banner): ?>
                <div id="all-product" class="banner-slide <?php echo $index === 0 ? 'active' : ''; ?>">
                    <picture>
                        <?php if (!empty($banner['mb_image'])): ?>
                            <source media="(max-width: 480px)"
                                srcset="/baocao/view/img/<?php echo htmlspecialchars($banner['mb_image']); ?>">
                        <?php endif; ?>
                        <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image']); ?>"
                            alt="<?php echo !empty($banner['alt_text']) ? htmlspecialchars($banner['alt_text']) : 'Banner ' . ($index + 1); ?>"
                            class="banner-image">
                    </picture>
                </div>
            <?php endforeach; ?>
        </div>
    </form>

    <div class="container">
        <!-- Main Product Container -->
        <div class="main-product-container">
            <div class="banner">
                <h1>NEW ARRIVALS !</h1>
            </div>
            <div class="products-container" id="products-list">
                <?php foreach (array_slice($shoe_products, 0, 10) as $product): ?>
                    <div class="product-card" data-title="<?php echo htmlspecialchars($product['name']); ?>" data-table="<?php echo htmlspecialchars($product['table_name']); ?>">
                        <form class="productForm" action="/baocao/user/submit" method="POST" style="display: inline;">
                            <input type="hidden" name="product_name" id="productNameInput">
                            <div class="product-image">
                                <img src="/baocao/view/img/<?= htmlspecialchars($product['image']) ?>" alt="<?= htmlspecialchars($product['name']) ?>">
                            </div>
                            <div class="product-info">
                                <h3 class="product-name">
                                    <?php echo htmlspecialchars($product['name']); ?>
                                    <span class="full-title-tooltip"><?php echo htmlspecialchars($product['name']); ?></span>
                                </h3>
                                <p class="price"><?php echo number_format($product['price']); ?>đ</p>
                                <?php if (!empty($product['oprice'])): ?>
                                    <p class="old-price"><?= number_format($product['oprice']) ?>đ</p>
                                <?php endif; ?>
                            </div>
                            <button type="button" class="add-to-cart-btn" title="Thêm vào giỏ hàng"><i class="bi bi-cart-plus"></i></button>
                        </form>
                    </div>
                <?php endforeach; ?>
            </div>

            <?php if (empty($shoe_products)): ?>
                <div class="no-products">
                    <p>Hiện chưa có sản phẩm nào trong danh mục này</p>
                </div>
            <?php endif; ?>
            <div class="pagination" id="pagination"></div>
        </div>

        <!-- Features Section -->
        <div class="features">
            <div class="feature">
                <i class="bi bi-truck feature-icon"></i>
                <div class="feature-text">
                    <h3>Vận chuyển SIÊU TỐC</h3>
                    <p>Khu vực TOÀN QUỐC</p>
                </div>
            </div>
            <div class="feature">
                <i class="bi bi-check-circle feature-icon"></i>
                <div class="feature-text">
                    <h3>Cam kết CHÍNH HÃNG</h3>
                    <p>Sản phẩm TRỌN ĐỜI</p>
                </div>
            </div>
            <div class="feature">
                <i class="bi bi-credit-card feature-icon"></i>
                <div class="feature-text">
                    <h3>THANH TOÁN</h3>
                    <p>Nhiều PHƯƠNG THỨC</p>
                </div>
            </div>
            <div class="feature">
                <i class="bi bi-arrow-repeat feature-icon"></i>
                <div class="feature-text">
                    <h3>100% HOÀN TIỀN</h3>
                    <p>nếu sản phẩm lỗi</p>
                </div>
            </div>
        </div>
        <!-- Banner mới -->
        <div class="new-banner">
            <a class="banner-link">
                <?php $foot_banner = $foot_banners[0] ?>
                <img src="/baocao/view/img/<?php echo htmlspecialchars($foot_banner['image']); ?>" alt="Banner mới - Giá chỉ từ 299K" class="banner-image">
            </a>
        </div>

        <!-- Phụ kiện thể thao -->
        <div class="accessories-container">
            <div class="nav-bar">
                <a class="section-link nav-title"><span>Phụ kiện thể thao</span></a>
                <div class="nav-buttons">
                    <a href="" class="nav-button active" data-category="balo-tui-mu">Balo - Túi - Mũ</a>
                    <a href="" class="nav-button" data-category="tat-vo">Tất & Vớ</a>
                    <a href="" class="nav-button" data-category="bang-ho-massage">Băng Hỗ trợ & Dụng cụ Massage</a>
                    <a href="" id="pkkhac" class="nav-button">Xem Thêm</a>
                </div>
                <form class="sportsForm" action="/baocao/user/submit" method="POST" style="display: none;">
                    <input type="hidden" name="product_name" id="productNameInput">
                </form>
            </div>
            <div class="products-container" id="accessories-list">
                <?php foreach ($all_products as $group): ?>
                    <?php foreach ($group['items'] as $product): ?>
                        <div class="product-card" data-category="<?= htmlspecialchars($group['category']) ?>" data-table="<?php echo htmlspecialchars($product['table_name']); ?>">
                            <form class="productForm" method="POST" action="/baocao/user/submit" style="display: inline;">
                                <input type="hidden" name="product_name" value="<?= htmlspecialchars($product['name']) ?>">
                                <div class="product-image">
                                    <img src="/baocao/view/img/<?= htmlspecialchars($product['image']) ?>" alt="<?= htmlspecialchars($product['name']) ?>">
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">
                                        <?php echo htmlspecialchars($product['name']); ?>
                                        <span class="full-title-tooltip"><?php echo htmlspecialchars($product['name']); ?></span>
                                    </h3>
                                    <p class="price"><?= number_format($product['price']) ?>đ</p>
                                    <?php if (!empty($product['oprice'])): ?>
                                        <p class="old-price"><?= number_format($product['oprice']) ?>đ</p>
                                    <?php endif; ?>
                                </div>
                                <button type="button" class="add-to-cart-btn" title="Thêm vào giỏ hàng">
                                    <i class="bi bi-cart-plus"></i>
                                </button>
                            </form>
                        </div>
                    <?php endforeach; ?>
                <?php endforeach; ?>

                <?php if (empty($pk1_products) && empty($pk2_products) && empty($pk3_products)): ?>
                    <div class="no-products">
                        <p>Hiện chưa có sản phẩm nào trong danh mục này</p>
                    </div>
                <?php endif; ?>
            </div>
            <div class="pagination" id="accessories-pagination"></div>
        </div>

        <!-- Sports Banners -->
        <form class="sportsForm" action="/baocao/user/submit" method="POST">
            <div class="sports-banners">
                <?php if (!empty($mid_banners)): ?>
                    <?php $first_banner = $mid_banners[0]; ?>
                    <a href="" id="bongchuyen" class="sport-banner">
                        <img src="/baocao/view/img/<?php echo htmlspecialchars($first_banner['image1']); ?>" alt="Sports Banner 1">
                    </a>
                    <a href="" id="caulong" class="sport-banner">
                        <img src="/baocao/view/img/<?php echo htmlspecialchars($first_banner['image2']); ?>" alt="Sports Banner 2">
                    </a>
                    <a href="" id="bia" class="sport-banner">
                        <img src="/baocao/view/img/<?php echo htmlspecialchars($first_banner['image3']); ?>" alt="Sports Banner 3">
                    </a>
                <?php else: ?>
                    <a href="#" class="sport-banner">
                        <img src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/img_3banner_1.jpg?1741853780031" alt="VOLLEYBALL">
                    </a>
                    <a href="#" class="sport-banner">
                        <img src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/img_3banner_2.jpg?1741853780031" alt="BADMINTON">
                    </a>
                    <a href="#" class="sport-banner">
                        <img src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/img_3banner_3.jpg?1741853780031" alt="BILLIARD">
                    </a>
                <?php endif; ?>
            </div>
        </form>
        <!-- Thời trang nam -->
        <div class="mens-fashion-container">
            <div class="nav-bar">
                <a class="section-link nav-title"><span>Thời trang nam</span></a>
                <div class="nav-buttons">
                    <a href="" id="thoitrangnam" class="nav-button">Xem Thêm</a>
                </div>
                <form class="sportsForm" action="/baocao/user/submit" method="POST" style="display: none;">
                    <input type="hidden" name="product_name" id="productNameInput">
                </form>
            </div>
            <div class="mens-fashion-products">
                <div class="products-container" id="mens-fashion-list">
                    <?php foreach ($quanaonam_products as $product): ?>
                        <div class="product-card" data-title="<?php echo htmlspecialchars($product['name']); ?>" data-category="mens-fashion" data-table="<?php echo htmlspecialchars($product['table_name']); ?>">
                            <form class="productForm" action="/baocao/user/submit" method="POST" style="display: inline;">
                                <input type="hidden" name="product_name" id="productNameInput">
                                <div class="product-image">
                                    <img src="/baocao/view/img/<?= htmlspecialchars($product['image']) ?>" alt="<?= htmlspecialchars($product['name']) ?>">
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">
                                        <?php echo htmlspecialchars($product['name']); ?>
                                        <span class="full-title-tooltip"><?php echo htmlspecialchars($product['name']); ?></span>
                                    </h3>
                                    <p class="price"><?php echo number_format($product['price']); ?>đ</p>
                                    <?php if (!empty($product['oprice'])): ?>
                                        <p class="old-price"><?= number_format($product['oprice']) ?>đ</p>
                                    <?php endif; ?>
                                </div>
                                <button type="button" class="add-to-cart-btn" title="Thêm vào giỏ hàng"><i class="bi bi-cart-plus"></i></button>
                            </form>
                        </div>
                    <?php endforeach; ?>
                    <?php if (empty($quanaonam_products)): ?>
                        <div class="no-products">
                            <p>Hiện chưa có sản phẩm nào trong danh mục này</p>
                        </div>
                    <?php endif; ?>
                </div>
                <div class="pagination" id="mens-fashion-pagination"></div>
            </div>
        </div>
        <!-- Thời trang nữ -->
        <div class="womens-fashion-container">
            <div class="nav-bar">
                <a class="section-link nav-title"><span>Thời trang nữ</span></a>
                <div class="nav-buttons">
                    <a href="" id="thoitrangnu" class="nav-button">Xem Thêm</a>
                </div>
                <form class="sportsForm" action="/baocao/user/submit" method="POST" style="display: none;">
                    <input type="hidden" name="product_name" id="productNameInput">
                </form>
            </div>
            <div class="womens-fashion-products">
                <div class="products-container" id="womens-fashion-list">
                    <?php foreach ($quanaonu_products as $product): ?>
                        <div class="product-card" data-title="<?php echo htmlspecialchars($product['name']); ?>" data-category="womens-fashion" data-table="<?php echo htmlspecialchars($product['table_name']); ?>">
                            <form class="productForm" action="/baocao/user/submit" method="POST" style="display: inline;">
                                <input type="hidden" name="product_name" id="productNameInput">
                                <div class="product-image">
                                    <img src="/baocao/view/img/<?= htmlspecialchars($product['image']) ?>" alt="<?= htmlspecialchars($product['name']) ?>">
                                </div>
                                <div class="product-info">
                                    <h3 class="product-name">
                                        <?php echo htmlspecialchars($product['name']); ?>
                                        <span class="full-title-tooltip"><?php echo htmlspecialchars($product['name']); ?></span>
                                    </h3>
                                    <p class="price"><?php echo number_format($product['price']); ?>đ</p>
                                    <?php if (!empty($product['oprice'])): ?>
                                        <p class="old-price"><?= number_format($product['oprice']) ?>đ</p>
                                    <?php endif; ?>
                                </div>
                                <button type="button" class="add-to-cart-btn" title="Thêm vào giỏ hàng"><i class="bi bi-cart-plus"></i></button>
                            </form>
                        </div>
                    <?php endforeach; ?>
                    <?php if (empty($quanaonu_products)): ?>
                        <div class="no-products">
                            <p>Hiện chưa có sản phẩm nào trong danh mục này</p>
                        </div>
                    <?php endif; ?>
                </div>
                <div class="pagination" id="womens-fashion-pagination"></div>
            </div>
        </div>
        <!-- Banner mới -->
        <div class="new-banner">
            <a class="banner-link">
                <?php $foot_banner = $foot_banners[0] ?>
                <img src="/baocao/view/img/<?php echo htmlspecialchars($foot_banner['image']); ?>" alt="Banner mới - Giá chỉ từ 299K" class="banner-image">
            </a>
        </div>
        <!-- Tổng hợp - Tư vấn thể thao -->
        <div class="sports-news-container">
            <div class="nav-bar">
                <a class="section-link nav-title">
                    <span>Bản tin thể thao</span>
                </a>
                <form action="/baocao/user/submit" style="display:inline;" method="POST">
                    <input type="hidden" name="action" value="list">
                    <div class="nav-buttons">
                        <button type="submit" class="news-button">Xem Thêm</button>
                    </div>
                </form>
            </div>
            <div class="sports-news-layout">
                <!-- Cột chính: Bài viết chính -->
                <div class="main-news">
                    <?php if (!empty($featured_news)): ?>
                        <?php $main_news = $featured_news[0]; ?>
                        <div class="news-card main-news-card">
                            <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($main_news['id']) ?>" class="news-link">
                                <div class="news-image">
                                    <?php if (!empty($main_news['image_url'])): ?>
                                        <img src="<?= htmlspecialchars($main_news['image_url']) ?>" alt="<?= htmlspecialchars($main_news['title']) ?>">
                                    <?php else: ?>
                                        <img src="" alt="<?= htmlspecialchars($main_news['title']) ?>">
                                    <?php endif; ?>
                                </div>
                                <div class="news-content">
                                    <h3><?= htmlspecialchars($main_news['title']) ?></h3>
                                    <p><?= htmlspecialchars(substr(strip_tags($main_news['content']), 0, 150)) ?>...</p>
                                    <div class="news-meta">
                                        <span><?= date('d/m/Y', strtotime($main_news['created_at'])) ?></span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    <?php else: ?>
                        <p>Chưa có bài viết nổi bật.</p>
                    <?php endif; ?>
                </div>
                <!-- Cột phụ: Danh sách bài viết phụ -->
                <div class="side-news">
                    <?php foreach ($side_news as $news): ?>
                        <div class="news-card side-news-card">
                            <a href="/baocao/user/submit?action=detail&id=<?= htmlspecialchars($news['id']) ?>" class="news-link">
                                <div class="news-image">
                                    <?php if (!empty($news['image_url'])): ?>
                                        <img src="<?= htmlspecialchars($news['image_url']) ?>" alt="<?= htmlspecialchars($news['title']) ?>">
                                    <?php else: ?>
                                        <img src="/baocao/view/img/bannerdt2.png" alt="<?= htmlspecialchars($news['title']) ?>">
                                    <?php endif; ?>
                                </div>
                                <div class="news-content">
                                    <h4><?= htmlspecialchars($news['title']) ?></h4>
                                    <div class="news-meta">
                                        <span><?= date('d/m/Y', strtotime($news['created_at'])) ?></span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    <?php endforeach; ?>
                    <?php if (empty($side_news)): ?>
                        <p>Chưa có bài viết phụ.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <?php include "sizeform.php"; ?>
    <?php include "zalo_icon.php"; ?>
    <?php include "chatbot.php"; ?>
    <footer>
        <?php include "footer.php"; ?>
    </footer>

    <script>
        window.isLoggedIn = <?php echo json_encode(!empty($_SESSION['info']) && isset($_SESSION['info']['id_user'])); ?>;
        window.userId = <?php echo json_encode(!empty($_SESSION['info']) ? $_SESSION['info']['id_user'] : null); ?>;
    </script>
    <script>
        if (<?php echo json_encode($clear_cart); ?>) {
            console.log('/baocao/trangchu: Clearing cart');
            if (window.isLoggedIn) {
                $.ajax({
                    url: "/baocao/user/submit",
                    type: "POST",
                    dataType: "json",
                    data: {
                        clear_cart: true,
                        id_user: window.userId
                    },
                    success: function(response) {
                        if (response.success) {
                            window.cartFromDatabase = [];
                        } else {
                            console.warn('/baocao/trangchu: Failed to clear cart in database:', response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('/baocao/trangchu: AJAX error when clearing cart:', {
                            status,
                            error,
                            responseText: xhr.responseText
                        });
                    },
                    complete: function() {
                        window.appliedVoucher = null;
                        if (typeof window.updateCart === 'function') {
                            window.updateCart();
                        }
                        if (typeof window.renderCart === 'function') {
                            window.renderCart();
                        }
                    }
                });
            } else {
                localStorage.removeItem('cart');
                window.appliedVoucher = null;
                if (typeof window.updateCart === 'function') {
                    window.updateCart();
                }
                if (typeof window.renderCart === 'function') {
                    window.renderCart();
                }
            }
        }
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/trangchu.js"></script>

</body>

</html>