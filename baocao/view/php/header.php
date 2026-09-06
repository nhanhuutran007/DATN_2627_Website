<?php
include "../../model/config/connect.php"; // Thêm dòng này
require_once "session.php";
$userLoggedIn = isset($_SESSION['mySession']) ? true : false;
$username = $userLoggedIn ? $_SESSION['mySession'] : '';
// Hàm lấy giỏ hàng từ database
require_once "getcartfromdatabase.php";

$user = $_SESSION['info'] ?? [];
$isLoggedIn = isset($user['id_user']);
if ($isLoggedIn) {
  $cartFromDatabase = getCartFromDatabase($conn, $user['id_user']);
} else {
  $cartFromDatabase = [];
}
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NHL SPORTS</title>
  <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
  <meta name="keywords" content="header, thể thao, NHL Sports, thời trang thể thao">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
  <link rel="stylesheet" href="/baocao/view/css/header.css">
</head>

<body>
  <header>
    <div class="header">
      <a href="/baocao/trangchu" class="backhome">
        <div class="logo">
          <img src="/baocao/view/img/logo3.webp" alt="Logo WebTheThaovn">
          <span class="logo-text">NHL SPORTS</span>
        </div>
      </a>
      <div class="search-bar">
        <div class="search-container">
          <input type="text" id="search-input" placeholder="Tìm sản phẩm...">
          <i class="bi bi-search search-icon"></i>
          <div class="search-suggestions" id="search-suggestions">
            <!-- Gợi ý sản phẩm sẽ được thêm bằng JavaScript -->
          </div>
          <form id="suggestionForm" action="/baocao/user/submit" method="POST" style="display: none;">
            <!-- Input ẩn sẽ được thêm động bằng JavaScript -->
          </form>
        </div>
      </div>
      <div class="contact-info">
        <i class="bi bi-telephone-fill"></i>
        <div class="contact-text">
          <div>Tư vấn mua hàng</div>
          <a href="tel:0777566324" class="tel">
            <div>0777 566 324</div>
          </a>
        </div>
      </div>

      <div class="header-icons">
        <a href="/baocao/trangchu"><i class="bi bi-house-fill"></i></a>
        <div class="cart-wrapper">
          <a href="/baocao/cart" class="cart-icon">
            <i class="bi bi-cart"></i>
            <span class="cart-count">0</span>
          </a>
          <?php if ($currentPage !== '/baocao/checkout'): ?>
            <div class="cart-popup">
              <form id="checkout-form1" action="/baocao/user/submit" method="POST" style="display: inline;" enctype="multipart/form-data">
                <input type="hidden" name="cart_data1" id="cart-data1">
                <input type="hidden" name="thanhtoan1" value="thanhtoan1">
                <div class="cart-popup-content">
                  <ul id="cart-popup-items"></ul>
                  <div class="cart-popup-total">
                    <span>Tổng tiền:</span>
                    <span id="cart-popup-total">0đ</span>
                  </div>
                  <button class="checkout-btn">THANH TOÁN</button>
                </div>
              </form>
            </div>
            <form id="productForm" action="/baocao/user/submit" method="POST" style="display: none;">
              <!-- Input sẽ được thêm động bởi JavaScript -->
            </form>
          <?php endif; ?>
        </div>
        <div class="user-menu">
          <a href="<?php echo $isLoggedIn ? '/baocao/taikhoan' : '/baocao/login'; ?>" id="header-avatar-link"><i class="bi bi-person"></i></a>
          <i class="bi bi-caret-down-fill dropdown-toggle"></i>
          <ul class="dropdown-menu" id="user-dropdown-menu">
            <!-- Nội dung sẽ được cập nhật bằng JavaScript -->
          </ul>
        </div>
      </div>
    </div>


    <div class="category-nav">
      <div class="big-menu">
        <button class="list">
          <i class="bi bi-list"></i>
          <span> Danh mục sản phẩm</span>
        </button>
      </div>
      <div class="search-bar mobile-search-bar">
        <div class="search-container">
          <input type="text" id="search-input-mobile" placeholder="Tìm sản phẩm...">
          <i class="bi bi-search search-icon"></i>
          <div class="search-suggestions" id="search-suggestions-mobile">
            <!-- Gợi ý sản phẩm sẽ được thêm bằng JavaScript -->
          </div>
        </div>
      </div>
      <?php
      $query = "SELECT * FROM category_nav_items ORDER BY position ASC LIMIT 5";
      $result = mysqli_query($conn, $query);
      while ($row = mysqli_fetch_assoc($result)) {
        echo '<a href="#" class="nav-item hidden" id="' . htmlspecialchars($row['category']) . '">' . htmlspecialchars($row['name']) . '</a>';
      }
      ?>
    </div>
    <div class="menu-overlay"></div>
    <div class="menu-dropdown">
      <div class="menu-dropdown-left">
        <div class="menu-dropdown-left-top">
          <button data-category="monthethao">
            <div class="menu-in-dropdown"> <img src="/baocao/view/img/ol.webp">Môn thể thao</div>
          </button>
          <button data-category="aothethaonam">
            <div class="menu-in-dropdown"> <img src="/baocao/view/img/5294741.png">Thể thao nam</div>
          </button>
          <button data-category="aothethaonu">
            <div class="menu-in-dropdown"> <img src="/baocao/view/img/ih.png">Thể thao nữ</div>
          </button>
          <button data-category="phukien">
            <div class="menu-in-dropdown"> <img src="/baocao/view/img/icon-balo-tui-xach.webp">Phụ kiện</div>
          </button>
          <button data-category="thuonghieu">
            <div class="menu-in-dropdown"> <img src="/baocao/view/img/icon-06.png">Thương hiệu</div>
          </button>
        </div>

        <form id="sportsForm" action="/baocao/user/submit" method="POST">
          <div class="menu-dropdown-left-bot">
            <!-- Giữ nguyên các menu-item từ file cũ -->
            <div class="menu-item" data-category="monthethao">
              <a href="" id="bongro" class="item">BÓNG RỔ</a>
              <a href="" id="quabongro" class="item">Bóng thi đấu</a>
              <a href="" id="giaybongro" class="item">Giày bóng rổ</a>
              <a href="" id="quanaobongro" class="item">Quần áo</a>
              <a href="" id="phukienbongro" class="item">Phụ kiện bóng rổ</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="bongchuyen" class="item">BÓNG CHUYỀN</a>
              <a href="" id="quabongchuyen" class="item">Bóng thi đấu</a>
              <a href="" id="giaybongchuyen" class="item">Giày bóng chuyền</a>
              <a href="" id="quanaobongchuyen" class="item">Quần áo</a>
              <a href="" id="phukienbongchuyen" class="item">Phụ kiện bóng chuyền</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="bongda" class="item">BÓNG ĐÁ & FUTSAL</a>
              <a href="" id="quabongda" class="item">Bóng thi đấu</a>
              <a href="" id="giaybongda" class="item">Giày bóng đá</a>
              <a href="" id="quanaobongda" class="item">Quần áo</a>
              <a href="" id="phukienbongda" class="item">Phụ kiện bóng đá</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="tapgym" class="item">TẬP GYM & WORKOUT</a>
              <a href="" id="giaytapgym" class="item">Giày tập Gym</a>
              <a href="" id="quanaogym" class="item">Quần áo</a>
              <a href="" id="phukiengym" class="item">Phụ kiện tập Fitness</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="chaybo" class="item">CHẠY BỘ & ĐI BỘ</a>
              <a href="" id="giaychaybo" class="item">Giày chạy bộ</a>
              <a href="" id="quanaochaybo" class="item">Quần áo</a>
              <a href="" id="phukienchaybo" class="item">Phụ kiện chạy bộ</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="caulong" class="item">CẦU LÔNG</a>
              <a href="" id="votcaulong" class="item">Vợt cầu lông</a>
              <a href="" id="cauthidau" class="item">Cầu thi đấu</a>
              <a href="" id="giaycaulong" class="item">Giày cầu lông</a>
              <a href="" id="quanaocaulong" class="item">Quần áo</a>
              <a href="" id="phukiencaulong" class="item">Phụ kiện cầu lông</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="bia" class="item">BIA</a>
              <a href="" id="gaybia" class="item">Gậy Bi-a</a>
              <a href="" id="aobia" class="item">Áo thi đấu</a>
              <a href="" id="phukienbia" class="item">Phụ kiện Bi-a</a>
            </div>
            <div class="menu-item" data-category="monthethao">
              <a href="" id="pickleball" class="item">PICKLEBALL</a>
              <a href="" id="votpickleball" class="item">Vợt Pickleball</a>
              <a href="" id="giaypickleball" class="item">Giày Pickleball</a>
              <a href="" id="phukienpick" class="item">Phụ kiện Pickleball</a>
            </div>


            <div class="menu-item" data-category="aothethaonam">
              <a href="" id="aothethaonam" class="item">ÁO THỂ THAO NAM</a>
              <a href="" id="aophongnam" class="item">Áo phông Nam</a>
              <a href="" id="aopolonam" class="item">Áo polo Nam</a>
              <a href="" id="aokhoacnam" class="item">Áo khoác Nam</a>
              <a href="" id="aohoodienam" class="item">Áo Hoodie Nam</a>
              <a href="" id="aobodynam" class="item">Áo body Nam</a>
            </div>
            <div class="menu-item" data-category="aothethaonam">
              <a href="" id="quanthethaonam" class="item">QUẦN THỂ THAO</a>
              <a href="" id="quanshortnam" class="item">Quần short Nam</a>
              <a href="" id="quandainam" class="item">Quần dài Nam</a>
              <a href="" id="quanbodynam" class="item">Quần body Nam</a>
            </div>
            <div class="menu-item" data-category="aothethaonam">
              <a href="" id="bothethaonam" class="item">BỘ THỂ THAO</a>
              <a href="" id="bobongdanam" class="item">Bộ bóng đá Nam</a>
              <a href="" id="bobongchuyennam" class="item">Bộ bóng chuyền Nam</a>
              <a href="" id="bocaulongnam" class="item">Bộ cầu lông Nam</a>
            </div>
            <div class="menu-item" data-category="aothethaonam">
              <a href="" id="giaythethaonam" class="item">GIÀY THỂ THAO NAM</a>
              <a href="" id="giaybongronam" class="item">Giày bóng rổ Nam</a>
              <a href="" id="giaybongchuyennam" class="item">Giày bóng chuyền Nam</a>
              <a href="" id="giaybongdanam" class="item">Giày bóng đá Nam</a>
              <a href="" id="giaychaybonam" class="item">Giày chạy bộ Nam</a>
              <a href="" id="giaycaulongnam" class="item">Giày cầu lông Nam</a>
            </div>

            <div class="menu-item" data-category="aothethaonu">
              <a href="" id="aothethaonu" class="item">ÁO THỂ THAO NỮ</a>
              <a href="" id="aophongnu" class="item">Áo phông Nữ</a>
              <a href="" id="aopolonu" class="item">Áo polo Nữ</a>
              <a href="" id="aohoodienu" class="item">Áo hoodie Nữ</a>
              <a href="" id="aokhoacnu" class="item">Áo khoác nữ</a>
            </div>
            <div class="menu-item" data-category="aothethaonu">
              <a href="" id="quanthethaonu" class="item">QUẦN THỂ THAO NỮ</a>
              <a href="" id="quanshortnu" class="item">Quần short Nữ</a>
              <a href="" id="quandainu" class="item">Quần dài Nữ</a>
              <a href="" id="quanleggingnu" class="item">Quần legging Nữ</a>
            </div>
            <div class="menu-item" data-category="aothethaonu">
              <a href="" id="bothethaonu" class="item">BỘ THỂ THAO NỮ</a>
              <a href="" id="bobongchuyennu" class="item">Bộ bóng chuyền Nữ</a>
              <a href="" id="bocaulongnu" class="item">Bộ cầu lông Nữ</a>
            </div>
            <div class="menu-item" data-category="aothethaonu">
              <a href="" id="giaythethaonu" class="item">GIÀY THỂ THAO NỮ</a>
              <a href="" id="giaybongronu" class="item">Giày bóng rổ Nữ</a>
              <a href="" id="giaybongchuyennu" class="item">Giày bóng chuyền Nữ</a>
              <a href="" id="giaychaybonu" class="item">Giày chạy bộ Nữ</a>
              <a href="" id="giaycaulongnu" class="item">Giày cầu lông Nữ</a>
            </div>

            <div class="menu-item" data-category="phukien">
              <a href="" id="balo&tui" class="item">BALO & TÚI</a>
              <a href="" id="balo" class="item">Balo</a>
              <a href="" id="balo_tuidung" class="item">Túi đựng</a>
            </div>
            <div class="menu-item" data-category="phukien">
              <a href="" id="pkkhac" class="item">PHỤ KIỆN KHÁC</a>
              <a href="" id="pkbongda" class="item">Phụ kiện bóng đá</a>
              <a href="" id="pkcaulong" class="item">Phụ kiện cầu lông</a>
              <a href="" id="pkbongro" class="item">Phụ kiện bóng rổ</a>
              <a href="" id="pkbongchuyen" class="item">Phụ kiện bóng chuyền</a>
              <a href="" id="pkbia" class="item">Phụ kiện bi-a</a>
            </div>

            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="dongluc" class="item">ĐỘNG LỰC</a>
              <a href="" id="quanaodongluc" class="item">Quần áo</a>
              <a href="" id="giaydepdongluc" class="item">Giày dép</a>
              <a href="" id="bongdongluc" class="item">Bóng thi đấu</a>
              <a href="" id="pkttdongluc" class="item">Phụ kiện thể thao</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="grandsport" class="item">GRAND SPORT</a>
              <a href="" id="quanaograndsport" class="item">Quần áo</a>
              <a href="" id="giaydepgrandsport" class="item">Giày dép</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="spalding" class="item">SPALDING</a>
              <a href="" id="bongspalding" class="item">Bóng thi đấu</a>
              <a href="" id="pkttspalding" class="item">Phụ kiện Bóng rổ</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="peak" class="item">PEAK</a>
              <a href="" id="giaybongropeak" class="item">Giày bóng rổ</a>
              <a href="" id="giaychaybopeak" class="item">Giày chạy bộ</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="bubadu" class="item">BUBADU</a>
              <a href="" id="quanaobubadu" class="item">Quần áo</a>
              <a href="" id="votbubadu" class="item">Vợt cầu lông</a>
              <a href="" id="pkttbubadu" class="item">Phụ kiện cầu lông</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="saovang" class="item">SAO VÀNG</a>
              <a href="" id="giaysaovang" class="item">Giày bóng chuyền</a>
              <a href="" id="quanaosaovang" class="item">Quần áo</a>
              <a href="" id="pkttsaovang" class="item">Phụ kiện thể thao</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="peri" class="item">PERI</a>
              <a href="" id="coperi" class="item">Gậy / Cơ Bi-a</a>
              <a href="" id="pkttperi" class="item">Phụ kiện khác</a>
            </div>
            <div class="menu-item" data-category="thuonghieu">
              <a href="" id="zocker" class="item">ZOCKER </a>
              <a href="" id="giaychaybozocker" class="item">Giày chạy bộ Zocker</a>
              <a href="" id="giaybongdazocker" class="item">Giày bóng đá Zocker</a>
              <a href="" id="pkttzocker" class="item">Phụ kiện Zocker</a>
              <a href="" id="pickzocker" class="item">Sản phẩm Pickleball Zocker</a>
            </div>
          </div>
        </form>
      </div>

      <div class="menu-dropdown-right">
        <form action="/baocao/user/submit" style="display: inline; " enctype="multipart/form-data" method="POST" id="all-product-form">
          <div class="menu-dropdown-right-top">
            <a class="top">
              <div class="menu-top-1">
                <img src="/baocao/view/img/cacmonthethao.webp">
              </div>
              <div class="menu-top-2">
                <h3>Môn thể thao</h3>
                <p>Xem thêm</p>
              </div>
            </a>
          </div>
          <input type="hidden" name="all-product" value="all-product">
        </form>
        <div class="menu-dropdown-right-bot">
          <?php
          // Truy vấn lấy dữ liệu từ bảng category_nav_items
          $query = "SELECT * FROM category_nav_items ORDER BY position ASC LIMIT 5";
          $result = mysqli_query($conn, $query);

          if (mysqli_num_rows($result) > 0) {
            while ($row = mysqli_fetch_assoc($result)) {
              $name = htmlspecialchars($row['name']);
              $category = htmlspecialchars($row['category']);
              echo '
                                <div class="menu-option">
                                    <a class="item" href="#" data-category="' . $category . '">' . $name . '</a>
                                    <i class="bi bi-arrow-right"></i>
                                </div>';
            }
          } else {
            echo '<div class="menu-option"><a class="item" href="#">Chưa có mục nào</a><i class="bi bi-arrow-right"></i></div>';
          }
          ?>
        </div>
      </div>
    </div>
  </header>
  <script>
    // Truyền dữ liệu từ PHP sang JavaScript
    window.userInfo = <?php echo json_encode(!empty($user) ? $user : null); ?>;
    window.isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;
    const isUserLoggedIn = <?php echo json_encode($userLoggedIn); ?>;
    window.cartFromDatabase = <?php echo json_encode($cartFromDatabase); ?>;
  </script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="/baocao/view/js/header.js"></script>
</body>

</html>