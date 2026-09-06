<?php
require_once "session.php";
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);
$error_msg = $_SESSION['error_msg'] ?? '';
unset($_SESSION['error_msg']);
$form_data = $_SESSION['form_data'] ?? [];
unset($_SESSION['form_data']);

// Tạo ID đơn hàng duy nhất
$order_id = 'webtt' . mt_rand(100000, 999999);
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thanh Toán - NHL SPORTS</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="thanh toán, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/checkout.css">
</head>

<body>
    <?php include "header.php"; ?>
    <?php
    $user = isset($_SESSION['user']) ? $_SESSION['user'] : [];
    $cart = isset($_SESSION['cart']) ? $_SESSION['cart'] : ['items' => [], 'appliedVoucher' => null];
    $voucher = $_SESSION['appliedVoucher'] ?? null;
    $cartItems = $cart;
    $total = 0;
    foreach ($cartItems as $item) {
        $price = (int)str_replace(',', '', $item['price']);
        $total += $price * $item['quantity'];
    }
    $tienship = 1900;
    $discount = !empty($voucher['discount']) ? $voucher['discount'] : 0;
    $freeship = !empty($voucher['freeship']) ? true : false;
    if ($freeship) {
        $tienship = 0;
    }
    $grandTotal = $total + $tienship - $discount;
    if ($grandTotal < 0) {
        $grandTotal = 0;
    }
    $user = $_SESSION['info'] ?? [];
    $isLoggedIn = isset($user['id_user']);
    ?>
    <?php if (!empty($error_msg)): ?>
        <div id="alert-error" class="alert-error">
            <?= $error_msg ?>
        </div>
    <?php endif; ?>

    <form id="checkout-form" action="/baocao/submit" method="POST">
        <div class="container">
            <div class="checkout-wrapper">
                <div class="checkout-info">
                    <h2>THÔNG TIN MUA HÀNG</h2>
                    <input type="hidden" name="order_id" value="<?= htmlspecialchars($order_id) ?>">
                    <input type="hidden" name="id_user" value="<?= !empty($user['id_user']) ? $user['id_user'] : '' ?>">
                    <input type="hidden" name="namevoucher" value="<?= !empty($voucher['code']) ? htmlspecialchars($voucher['code']) : '' ?>">
                    <input type="hidden" name="username" value="<?= !empty($user['username']) ? htmlspecialchars($user['username']) : '' ?>">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] = bin2hex(random_bytes(32)) ?>">
                    <div class="form-group">
                        <input type="email" name="email" id="email" placeholder="Email" value="<?= !empty($user['email']) ? htmlspecialchars($user['email']) : '' ?>" required>
                    </div>
                    <div class="form-group">
                        <input type="text" name="fullname" id="full-name" placeholder="Họ và tên" value="<?= !empty($user['fullname']) ? htmlspecialchars($user['fullname']) : '' ?>" required>
                    </div>
                    <div class="form-group">
                        <input type="tel" id="phone" name="phone" placeholder="Số điện thoại" value="<?= !empty($user['phone']) ? htmlspecialchars($user['phone']) : '' ?>" required>
                    </div>
                    <div class="form-group">
                        <textarea name="address" id="street" placeholder="Địa chỉ" required><?= !empty($user['address']) ? htmlspecialchars($user['address']) : '' ?></textarea>
                    </div>
                    <div class="form-group">
                        <label>GHI CHÚ (TÙY CHỌN)</label>
                        <textarea id="note" name="note" placeholder="Ghi chú đơn hàng (tùy chọn)"></textarea>
                    </div>
                </div>
                <div class="order-summary">
                    <h2>ĐƠN HÀNG</h2>
                    <div class="order-items">
                        <?php if (empty($cartItems)): ?>
                            <p>Giỏ hàng trống!</p>
                        <?php else: ?>
                            <?php foreach ($cartItems as $item): ?>
                                <div class="order-item">
                                    <?php
                                    $imageSrc = htmlspecialchars('/baocao/view/img/' . basename($item['image']));
                                    $itemPrice = (int)str_replace(',', '', $item['price']);
                                    ?>
                                    <img name="imageProduct" src="<?= $imageSrc ?>" alt="<?= htmlspecialchars($item['name']) ?>">
                                    <div class="order-item-info">
                                        <h4 name="nameProduct"><?= htmlspecialchars($item['name']) ?></h4>
                                        <p name="size">Size: <?= htmlspecialchars($item['size'] ?? 'N/A') ?></p>
                                        <p name="quantity">Số lượng: <?= htmlspecialchars($item['quantity']) ?></p>
                                    </div>
                                    <span name="totalDetail" class="order-item-price"><?= number_format($itemPrice * $item['quantity']) ?>đ</span>
                                    <input type="hidden" name="imageProduct[]" value="<?= basename($item['image']) ?>">
                                    <input type="hidden" name="nameProduct[]" value="<?= htmlspecialchars($item['name'], ENT_QUOTES) ?>">
                                    <input type="hidden" name="size[]" value="<?= $item['size'] ?>">
                                    <input type="hidden" name="quantity[]" value="<?= $item['quantity'] ?>">
                                    <input type="hidden" name="priceDetail[]" value="<?= $item['price'] ?>">
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                    <div class="order-details">
                        <div class="order-detail-row">
                            <span>Thành tiền</span>
                            <span name="totalAll"><?= number_format($total) ?>đ</span>
                            <input type="hidden" name="totalAll" value="<?= $total ?>">
                        </div>
                        <div class="order-detail-row">
                            <span>Phí vận chuyển</span>
                            <span name="tienship"><?= number_format($tienship) ?>đ</span>
                            <input type="hidden" name="tienship" value="<?= $tienship ?>">
                        </div>
                        <div class="order-detail-row">
                            <span>Mã giảm giá</span>
                            <span name="sale">
                                <?php
                                if ($freeship && $discount == 0) {
                                    echo 'FREESHIP';
                                } elseif ($discount > 0) {
                                    echo '- ' . number_format($discount) . 'đ';
                                } else {
                                    echo 'Không áp dụng';
                                }
                                ?>
                            </span>
                            <input type="hidden" name="sale" value="<?= ($freeship && $discount == 0) ? 0 : $discount ?>">
                            <input type="hidden" name="freeship" value="<?= !empty($voucher['freeship']) ? 'yes' : 'no' ?>">
                        </div>
                        <div class="order-detail-row total">
                            <span>Tổng cộng</span>
                            <span name="grandtotal"><?= number_format($grandTotal) ?>đ</span>
                            <input type="hidden" name="grandtotal" value="<?= $grandTotal ?>">
                        </div>
                    </div>
                    <div class="order-actions">
                        <a href="/baocao/cart" class="back-to-cart">
                            <i class="bi bi-arrow-left"></i> Quay về giỏ hàng
                        </a>
                        <input type="hidden" name="tieptheo" value="1">
                        <button type="button" class="initial-place-order-btn">TIẾP THEO</button>
                    </div>
                </div>
            </div>
        </div>
    </form>
    <div class="modal" id="payment-modal">
        <div class="modal-content">
            <span class="close-modal">×</span>
            <h2>PHƯƠNG THỨC THANH TOÁN</h2>
            <div class="form-group">
                <div class="payment-methods">
                    <label class="payment-method">
                        <input type="radio" name="payment-method" value="bank-transfer" <?= $grandTotal == 0 ? 'disabled' : '' ?>>
                        Chuyển khoản ngân hàng (PayOS)
                    </label>
                    <label class="payment-method">
                        <input type="radio" name="payment-method" value="cod" <?= $grandTotal == 0 ? 'checked' : '' ?>>
                        Thanh toán khi giao hàng (COD)
                    </label>
                </div>
                <div class="bank-info" style="display: none;">
                    <div class="bank-info-wrapper">
                        <div id="payos-checkout"></div>
                        <p>Quét mã QR để thanh toán qua PayOS. Đơn hàng sẽ được xác nhận tự động sau khi thanh toán thành công.Nếu có thay đổi vui lòng quét lại mã mới!</p>
                    </div>
                </div>
                <input type="hidden" name="dathang" value="1">
                <button type="button" class="place-order-btn" name="dathang">XÁC NHẬN ĐẶT HÀNG</button>
            </div>
        </div>
    </div>
    <form id="hidden-submit-form" action="/baocao/submit" method="POST" style="display: none;"></form>
    <?php include "zalo_icon.php"; ?>
    <?php include "chatbot.php"; ?>
    <?php include "footer.php"; ?>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js"></script>
    <script src="/baocao/view/js/checkout.js"></script>
    <script>
        // Truyền grandTotal từ PHP sang JavaScript
        window.grandTotal = <?= $grandTotal ?>;
    </script>
</body>

</html>