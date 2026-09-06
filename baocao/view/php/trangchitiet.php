<?php
session_start();
include "../../model/config/connect.php";
function getAvailableSizes($conn, $table, $product_name)
{
  // Xác định bảng kích thước
  $size_table = in_array($table, [
    'giaybongro',
    'giaybongchuyen',
    'giaybongda',
    'giaytapgym',
    'giaychaybo',
    'giaycaulong',
    'giaypickleball'
  ]) ? 'sizegiay' : 'sizequanao';

  // Truy vấn kích thước khả dụng
  $query = "SELECT DISTINCT size FROM `$size_table` 
              WHERE table_name = ? AND name_product = ? AND quantity > 0";
  $stmt = mysqli_prepare($conn, $query);
  mysqli_stmt_bind_param($stmt, 'ss', $table, $product_name);
  mysqli_stmt_execute($stmt);
  $result = mysqli_stmt_get_result($stmt);

  $sizes = [];
  while ($row = mysqli_fetch_assoc($result)) {
    $sizes[] = $row['size'];
  }

  mysqli_stmt_close($stmt);
  return $sizes;
}

$topViewedProducts = $_SESSION['topViewedProducts'];
$productsDetail = isset($_SESSION['productsDetail']) ? $_SESSION['productsDetail'] : [];
$_SESSION['topViewedProducts'] = isset($_SESSION['topViewedProducts']) ? $_SESSION['topViewedProducts'] : [];
$topViewedProducts = $_SESSION['topViewedProducts'];



if (!empty($productsDetail['id'])) {
  $table = $productsDetail['table'];
  $product_id = $productsDetail['id'];
}


$description_id = $productsDetail['description_id'] ?? 0;
$description = [];
if ($description_id > 0) {
  global $conn;
  $desc_query = "SELECT * FROM motasanpham WHERE id = ?";
  $stmt = $conn->prepare($desc_query);
  $stmt->bind_param("i", $description_id);
  $stmt->execute();
  $description = $stmt->get_result()->fetch_assoc();
  $stmt->close();
}


$clothingTables = [
  'quanaobongro',
  'quanaobongchuyen',
  'quanaobongda',
  'quanaogym',
  'quanaochaybo',
  'quanaocaulong',
  'aobia'
];
$shoeTables = [
  'giaybongro',
  'giaybongchuyen',
  'giaybongda',
  'giaytapgym',
  'giaychaybo',
  'giaycaulong',
  'giaypickleball'
];

// Kiểm tra nếu table thuộc danh sách quần áo hoặc giày
$table = isset($productsDetail['table']) ? $productsDetail['table'] : '';
$product_name = isset($productsDetail['name']) ? $productsDetail['name'] : '';
$showSizeSelector = in_array($table, $clothingTables) || in_array($table, $shoeTables);

// Xác định danh sách kích thước dựa trên loại sản phẩm
$sizes = [];
if ($showSizeSelector && !empty($product_name)) {
  $sizes = getAvailableSizes($conn, $table, $product_name);
}
$user = isset($_SESSION['info']) ? $_SESSION['info'] : [];
$isLoggedIn = !empty($user) && isset($user['id_user']);
?>

<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chi Tiết Sản Phẩm</title>
  <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
  <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
  <meta name="keywords" content="trang chi tiết, thể thao, NHL Sports, thời trang thể thao">
  <link rel="stylesheet" href="/baocao/view/css/trangchitiet.css" />
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
</head>

<body>
  <header> <?php include "header.php"; ?> </header>
  <div class="container">
    <div class="product-header" data-table="<?php echo htmlspecialchars($productsDetail['table'] ?? ''); ?>"
      data-product-id="<?php echo htmlspecialchars($productsDetail['id'] ?? ''); ?>">
      <h1 class="product-title">
        <?php echo $productsDetail['name']; ?>
      </h1>
    </div>

    <div class="product-content">
      <!-- Đây là phần HTML cần đảm bảo đúng cấu trúc cho phần gallery và zoom -->
      <div class="product-gallery">
        <div class="main-image-container">
          <img src="/baocao/view/img/<?php echo $productsDetail['image']; ?>" alt="<?php echo $productsDetail['name']; ?>" class="main-image" id="mainImage" />
          <div class="zoom-lens"></div>
          <div class="zoom-result"></div>
          <div class="nav-arrow prev"><i class="fas fa-chevron-left"></i></div>
          <div class="nav-arrow next"><i class="fas fa-chevron-right"></i></div>
        </div>
        <div class="thumbnail-container">
          <img src="/baocao/view/img/<?php echo $productsDetail['image']; ?>" alt="Thumbnail 1" class="thumbnail active" onclick="changeImage(this)" />
          <?php if (!empty($productsDetail['image2'])): ?>
            <img src="/baocao/view/img/<?php echo $productsDetail['image2']; ?>" alt="Thumbnail 2" class="thumbnail" onclick="changeImage(this)" />
          <?php endif; ?>
          <?php if (!empty($productsDetail['image3'])): ?>
            <img src="/baocao/view/img/<?php echo $productsDetail['image3']; ?>" alt="Thumbnail 3" class="thumbnail" onclick="changeImage(this)" />
          <?php endif; ?>
          <?php if (!empty($productsDetail['image4'])): ?>
            <img src="/baocao/view/img/<?php echo $productsDetail['image4']; ?>" alt="Thumbnail 4" class="thumbnail" onclick="changeImage(this)" />
          <?php endif; ?>
        </div>
      </div>

      <div class="product-details">
        <div class="brand-section">
          <div class="brand">
            <span class="brand-label">Thương hiệu: </span>
            <span class="brand-name"><?php echo $productsDetail['brand']; ?></span>
          </div>
        </div>

        <?php if (!empty($description)): ?>
          <div class="specs">
            <div class="spec-header">
              <span class="spec-label">Thông số kỹ thuật</span>
            </div>

            <div class="spec-item">
              <span class="spec-label">- Kiểu dáng:</span>
              <span class="spec-value"> Regular fit</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Logo:</span>
              <span class="spec-value"> in silicon</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Màu sắc:</span>
              <span class="spec-value"><?php echo $description['mausac']; ?></span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Kích thước:</span>
              <span class="spec-value"> <?php echo $description['kichthuoc']; ?></span>
            </div>
          </div>
        <?php endif; ?>

        <div class="price-container">
          <div class="price"><?php echo number_format($productsDetail['price']); ?>đ</div>
          <div class="oprice"><?php echo ($productsDetail['oprice'] > 0) ? number_format($productsDetail['oprice']) . "đ" : ""; ?></div>
        </div>

        <?php if ($showSizeSelector): ?>
          <div class="size-selector">
            <div class="size-label">
              Kích thước: <span id="selectedSize"></span>
            </div>
            <div class="size-grid">
              <?php foreach ($sizes as $size): ?>
                <div class="size-btn" onclick="selectSize(this, '<?= htmlspecialchars($size); ?>')">
                  <?= htmlspecialchars($size); ?>
                </div>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>

        <div class="action-row">
          <div class="quantity-wrapper">
            <div class="quantity-btn minus" onclick="decreaseQuantity()">-</div>
            <input type="number" value="1" min="1" class="quantity-input" id="quantity" />
            <div class="quantity-btn plus" onclick="increaseQuantity()">+</div>
          </div>
          <button class="add-to-cart">THÊM VÀO GIỎ HÀNG</button>
        </div>

        <div class="customer-benefits">
          <div class="benefit-item">
            <img
              src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/policy_image_1.png?1741014141129"
              alt="Shipping icon"
              class="benefit-icon" />
            <span class="benefit-text">Vận chuyển hỏa tốc TOÀN QUỐC</span>
          </div>
          <div class="benefit-item">
            <img
              src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/policy_image_2.png?1741014141129"
              alt="Support icon"
              class="benefit-icon" />
            <span class="benefit-text">Hỗ trợ đổi trong 5 ngày</span>
          </div>
          <div class="benefit-item">
            <img
              src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/policy_image_3.png?1741014141129"
              alt="Gift icon"
              class="benefit-icon" />
            <span class="benefit-text">Quà tặng hấp dẫn cho đơn hàng</span>
          </div>
          <div class="benefit-item">
            <img
              src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/policy_image_4.png?1741014141129"
              alt="Security icon"
              class="benefit-icon" />
            <span class="benefit-text">Bảo mật thông tin khách hàng</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="banner-section">
    <div class="banner-container">
      <img
        src="https://bizweb.dktcdn.net/100/485/982/themes/918620/assets/banner_pro.jpg?1742531174900"
        alt="Động Lực - Hàng Chính Hãng"
        class="banner-image" />
    </div>
  </div>

  <!-- Product description section -->
  <div class="product-description">
    <div class="description-container">
      <h2 class="description-title">Mô tả sản phẩm</h2>

      <div class="description-content">
        <h3><?php echo $productsDetail['name']; ?></h3>
        <p>Đúng với tinh thần và nội lực của đội tuyển quốc gia mạnh mẽ tư doanh của Việt Nam! Sự kết hợp hoàn hảo giữa thiết kế đẳng cấp, chất liệu cao cấp và hoa văn đặc đáo.</p>

        <?php if (!empty($description)): ?>
          <div class="feature-section">
            <h4>1. Chất liệu</h4>
            <p><?php echo $description['chatlieu']; ?></p>
          </div>
          <div class="feature-section">
            <h4>2. Thiết kế tối ưu chuyển động</h4>
            <p><?php echo $description['thietke']; ?></p>
          </div>
          <div class="specs">
            <h4>3. Thông số kỹ thuật</h4>
            <br>
            <div class="spec-item">
              <span class="spec-label">- Kiểu dáng:</span>
              <span class="spec-value">Regular fit</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Logo:</span>
              <span class="spec-value">in silicon</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Màu sắc:</span>
              <span class="spec-value"><?php echo $description['mausac']; ?></span>
            </div>
            <div class="spec-item">
              <span class="spec-label">- Kích thước:</span>
              <span class="spec-value"><?php echo $description['kichthuoc']; ?></span>
            </div>
          </div>
        <?php endif; ?>

        <br>
        <p>***</p>
        <div class="conclusion">
          <p><strong>SẮM ĐỒ CHẤT - GIÁ HỜI NHẤT</strong></p>
          <p>NHLSport là cửa hàng trực tuyến uy tín chuyên cung cấp các sản phẩm thể thao chất lượng cao với giá tốt nhất. Hãy liên hệ với chúng tôi qua hotline/zalo <strong>0342.443.803</strong>.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="related-section">
    <div class="related-container">
      <h2 class="related-title">Được quan tâm nhiều nhất:</h2>
      <div class="related-items">
        <?php foreach ($topViewedProducts as $product): ?>
          <div class="product-card" data-title="<?= htmlspecialchars($product['name']) ?>">
            <form class="product-form" action="/baocao/user/submit" method="POST">
              <input type="hidden" name="product_name" value="<?= htmlspecialchars($product['name']) ?>">
              <a href="#" class="product-link">
                <img src="/baocao/view/img/<?= htmlspecialchars($product['image']) ?>"
                  alt="<?= htmlspecialchars($product['name']) ?>"
                  class="related-img">
                <div class="related-name"><?= htmlspecialchars($product['name']) ?></div>
                <div class="related-price-container">
                  <div class="related-price"><?= number_format($product['price']) ?>đ</div>
                  <div class="related-oprice"><?= ($product['oprice'] > 0) ? number_format($product['oprice']) . "đ" : "" ?></div>
                </div>
              </a>
            </form>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
  <?php include "zalo_icon.php"; ?>
  <?php include "chatbot.php"; ?>
  <footer> <?php include "footer.php"; ?></footer>
  <script>
    window.isLoggedIn = <?php echo json_encode(!empty($_SESSION['info']) && isset($_SESSION['info']['id_user'])); ?>;
    window.userId = <?php echo json_encode(!empty($_SESSION['info']) ? $_SESSION['info']['id_user'] : null); ?>;
  </script>
  <script src="/baocao/view/js/trangchitiet.js"></script>
</body>

</html>