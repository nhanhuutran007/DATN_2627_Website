<?php
// Kiểm tra nếu session chưa được khởi tạo thì mới gọi session_start()
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$category = isset($_GET['category']) ? trim($_GET['category']) : '';
// Lấy sản phẩm từ session nếu có
$products = isset($_SESSION['products']) ? $_SESSION['products'] : [];
// Xóa session sau khi sử dụng để tránh hiển thị lại
// unset($_SESSION['products']);
$user = isset($_SESSION['info']) ? $_SESSION['info'] : [];
$isLoggedIn = !empty($user) && isset($user['id_user']);
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trang Chủ Đề</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="trang chủ đề, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/trangchude.css" />
</head>

<body>
    <header><?php include "header.php"; ?></header>

    <div class="container">

        <!-- Thanh lọc -->
        <div class="filter-bar">
            <div class="filter-item">
                <select id="price-filter">
                    <option value="">Chọn mức giá</option>
                    <option value="500000">Dưới 500,000đ</option>
                    <option value="1000000">Từ 500,000đ - 1 triệu</option>
                    <option value="1500000">Từ 1 triệu - 1,500,000đ</option>
                    <option value="2500000">Từ 1,500,000đ - 2,500,000đ</option>
                    <option value="2500000+">Trên 2,500,000đ</option>
                </select>
            </div>
            <div class="filter-item">
                <select id="type-filter">
                    <option value="">Loại sản phẩm</option>
                    <option value="quan_ao_the_thao">Quần áo thể thao</option>
                    <option value="giay_the_thao">Giày thể thao</option>
                    <option value="phu_kien_the_thao">Phụ kiện thể thao</option>
                    <option value="bong_thi_dau">Bóng thi đấu</option>
                    <option value="vot_cau_long">Vợt cầu lông - pickleball</option>
                </select>
            </div>
            <div class="filter-item">
                <select id="brand-filter">
                    <option value="">Thương hiệu</option>
                    <option value="dongluc">Động Lực</option>
                    <option value="grandsport">Grand Sport</option>
                    <option value="spalding">Spalding</option>
                    <option value="peak">Peak</option>
                    <option value="bubadu">Bubadu</option>
                    <option value="saovang">Sao Vàng</option>
                    <option value="peri">Peri</option>
                    <option value="zocker">Zocker</option>
                </select>
            </div>
            <div class="filter-item">
                <select id="sort-select">
                    <option value="default" selected>Sắp xếp</option>
                    <option value="price-asc">Giá tăng dần</option>
                    <option value="price-desc">Giá giảm dần</option>
                </select>
            </div>
        </div>


        <!-- Hiển thị sản phẩm -->
        <div class="products" id="productContainer">
            <?php if (!empty($products)): ?>
                <?php foreach ($products as $product): ?>
                    <div class="product-card"
                        data-title="<?php echo htmlspecialchars($product['name']); ?>"
                        data-brand="<?php echo isset($product['brand']) ? htmlspecialchars($product['brand']) : ''; ?>"
                        data-table="<?php echo isset($product['table_name']) ? htmlspecialchars($product['table_name']) : ''; ?>">
                        <form class="productForm" action="/baocao/user/submit" method="POST" style="display: inline;">
                            <input type="hidden" name="product_name" id="productNameInput">
                            <img src="/baocao/view/img/<?php echo htmlspecialchars($product['image']); ?>" alt="Sản phẩm">
                            <div class="product-title"><?php echo htmlspecialchars($product['name']); ?></div>
                            <div class="product-footer">
                                <div class="price-container">
                                    <div class="product-price"><?php echo number_format($product['price']); ?>đ</div>
                                    <?php if (!empty($product['oprice']) && (float)str_replace('.', '', $product['oprice']) > (float)str_replace('.', '', $product['price'])): ?>
                                        <span class="old-price"><?php echo number_format($product['oprice']); ?>đ</span>
                                    <?php endif; ?>
                                </div>
                                <button class="add-to-cart-btn" title="Thêm vào giỏ hàng" data-product-name="<?php echo htmlspecialchars($product['name']); ?>">
                                    <i class="bi bi-cart-plus"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                <?php endforeach; ?>
            <?php elseif ($query): ?>
                <p>Không có sản phẩm nào phù hợp với từ khóa "<?php echo htmlspecialchars($query); ?>".</p>
            <?php elseif ($category): ?>
                <p>Không có sản phẩm nào trong danh mục "<?php echo htmlspecialchars($category); ?>".</p>
            <?php else: ?>
                <p>Không có nội dung để hiển thị.</p>
            <?php endif; ?>
        </div>
    </div>
    <?php include "zalo_icon.php"; ?>
    <?php include "sizeform.php"; ?>
    <?php include "chatbot.php"; ?>

    <footer><?php include "footer.php"; ?></footer>
    <script>
        window.isLoggedIn = <?php echo json_encode(!empty($_SESSION['info']) && isset($_SESSION['info']['id_user'])); ?>;
        window.userId = <?php echo json_encode(!empty($_SESSION['info']) ? $_SESSION['info']['id_user'] : null); ?>;
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/trangchude.js"></script>
</body>

</html>