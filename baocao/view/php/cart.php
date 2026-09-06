<?php
require_once "session.php";
include "../../model/config/connect.php";
$id_user_voucher = $_SESSION['getvoucher'] ?? ''; ///////////thực tế là id của người dùng
function getVoucher($conn, $id_user_voucher)
{
    $voucher = []; // Khởi tạo mảng tránh lỗi undefined
    $sql = "SELECT title, content, name, price, active FROM voucher WHERE active = 1 AND id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);

    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "i", $id_user_voucher);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            $voucher[] = [
                'title' => $row['title'],
                'content' => $row['content'],
                'name' => $row['name'],
                'price' => $row['price'],
            ];
        }

        mysqli_stmt_close($stmt);
    } else {
        error_log("Lỗi chuẩn bị truy vấn getVoucher: " . mysqli_error($conn));
    }

    return $voucher;
}
// Hàm lấy giỏ hàng từ database
require_once "getcartfromdatabase.php";

$voucherList = getVoucher($conn, $id_user_voucher);
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giỏ Hàng - NHL SPORTS</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="giỏ hàng, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/cart.css">
</head>

<body>
    <?php include "header.php"; ?>

    <?php
    $user = $_SESSION['info'] ?? [];
    $isLoggedIn = isset($user['id_user']);
    $cartFromDatabase = $isLoggedIn ? getCartFromDatabase($conn, $user['id_user']) : [];
    ?>

    <div class="container">
        <h1>Giỏ Hàng Của Bạn</h1>
        <div class="cart-container">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Giá</th>
                        <th>Số lượng</th>
                        <th>Tổng</th>
                        <th>Xóa</th>
                    </tr>
                </thead>
                <tbody id="cart-items">
                    <!-- Các sản phẩm sẽ được thêm bằng JavaScript -->
                </tbody>
            </table>
            <form id="productForm" action="/baocao/user/submit" method="POST" style="display: none;">
                <!-- Input sẽ được thêm động bởi JavaScript -->
            </form>
            <div class="cart-summary">
                <h3>Tổng cộng: <span id="cart-total">0đ</span></h3>
                <form id="checkout-form" action="/baocao/user/submit" method="POST" style="display: inline;">
                    <!-- Thêm input ẩn để chứa dữ liệu giỏ hàng -->
                    <input type="hidden" name="cart_data" id="cart-data">
                    <input type="hidden" name="thanhtoan" value="thanhtoan">
                    <div class="summary-actions">
                        <div class="voucher-section">
                            <button type="button" class="voucher-btn">Chọn mã giảm giá</button>
                            <span id="applied-voucher" style="color: #ff0000; margin-left: 10px;"></span>
                        </div>
                        <button type="submit" class="checkout-btn">Thanh toán</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Popup mã giảm giá -->
        <div class="voucher-popup" id="voucher-popup">
            <div class="voucher-content">
                <h2>Các mã giảm giá có thể áp dụng:</h2>
                <div class="voucher-list">
                    <?php if (empty($voucherList)): ?>
                        <p class="no-voucher">Không có voucher nào</p>
                    <?php else: ?>
                        <!-- Danh sách voucher -->
                    <?php endif; ?>
                    <?php foreach ($voucherList as $voucher): ?>
                        <div class="voucher-item"
                            data-code="<?php echo htmlspecialchars($voucher['name']) ?>"
                            data-discount="<?php echo is_numeric($voucher['price']) ? $voucher['price'] : 0 ?>"
                            <?php if (strtoupper($voucher['name']) === 'FREESHIP') echo 'data-freeship="true"'; ?>>
                            <span><?php echo htmlspecialchars($voucher['title']) ?></span>
                            <p><?php echo nl2br(htmlspecialchars($voucher['content'])) ?></p>
                            <button class="apply-btn">Áp dụng</button>
                        </div>
                    <?php endforeach; ?>
                </div>
                <button class="close-btn">Đóng</button>
            </div>
        </div>
    </div>
    <?php include "zalo_icon.php"; ?>
    <?php include "chatbot.php"; ?>
    <?php include "footer.php"; ?>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        // Truyền dữ liệu từ PHP sang JavaScript
        window.isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;
        window.cartFromDatabase = <?php echo json_encode($cartFromDatabase); ?>;
    </script>
    <script src="/baocao/view/js/cart.js"></script>
</body>

</html>