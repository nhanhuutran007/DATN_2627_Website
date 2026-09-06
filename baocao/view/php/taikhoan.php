<?php require_once "session.php";
require_once "../../model/config/connect.php";
$user = isset($_SESSION['info']) ? $_SESSION['info'] : [];
if (empty($user)) {
    $_SESSION['error_msg'] = "Đăng nhập để truy cập tài khoản!";
    header("Location: /baocao/login");
    exit;
}
function thongTinDonHang($user_id)
{
    global $conn;
    $sql = "SELECT id, ngaydat, grandtotal, trangthai 
                FROM donhang 
                WHERE username = (SELECT username FROM khachhang WHERE id_user = ?)
                ORDER BY ngaydat DESC";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = [
            'iddonhang' => $row['id'],
            'ngaydat' => $row['ngaydat'],
            'grandtotal' => $row['grandtotal'],
            'trangthai' => $row['trangthai'] ?? 'Đang xử lý'
        ];
    }
    mysqli_stmt_close($stmt);
    return $orders;
}

?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông Tin Cá Nhân - NHL SPORTS</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="tài khoản, thể thao, NHL Sports, thời trang thể thao">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="/baocao/view/css/taiKhoan.css">
</head>

<body>
    <?php include "header.php";
    if (!empty($user) || isset($user['id_user'])) {
        $thongTinDonHang =  thongTinDonHang($user['id_user']);
    }
    ?>
    <div class="profile-container">
        <div class="sidebar">
            <h2>Thông Tin Cá Nhân</h2>
            <ul>
                <li class="active" data-section="account-info"><i class="bi bi-person"></i> Thông tin tài khoản</li>
                <li data-section="orders"><i class="bi bi-box-seam"></i> Đơn hàng của bạn</li>
                <!-- <li data-section="addresses"><i class="bi bi-geo-alt"></i> Số địa chỉ</li> -->
                <li data-section="change-password"><i class="bi bi-lock"></i> Đổi mật khẩu</li>
            </ul>
            <div class="toggle-2fa-container">
                <input type="checkbox" id="toggle-2fa" class="toggle-2fa"
                    data-2fa-enabled="<?= isset($user['active_2fa']) && $user['active_2fa'] === 1 ? 'true' : 'false'; ?>"
                    <?= isset($user['active_2fa']) && $user['active_2fa'] === 1 ? 'checked' : ''; ?>>
                <label for="toggle-2fa" class="toggle-2fa-slider"></label>
                <label for="toggle-2fa" class="toggle-2fa-label">Xác thực hai yếu tố</label>
            </div>
        </div>

        <div class="main-content">
            <div id="account-info" class="content-section active">
                <h3>Thông tin tài khoản</h3>
                <div class="info-item avatar-section">
                    <label>Ảnh đại diện:</label>
                    <div class="avatar-container">
                        <img id="user-avatar" src="/baocao/view/img/upload/avatar/<?= !empty($user['avatar']) ? htmlspecialchars($user['avatar']) : 'loginicon.png'; ?>" alt="Avatar">
                        <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                        <button id="change-avatar-btn" class="change-avatar-btn">
                            <i class="bi bi-camera-fill"></i> Thay đổi ảnh
                        </button>
                    </div>
                </div>
                <div class="info-item">
                    <label>Họ và tên:</label>
                    <span id="user-name"><?= !empty($user['fullname']) ? htmlspecialchars($user['fullname']) : '' ?></span>
                </div>
                <div class="info-item">
                    <label>Email:</label>
                    <span id="user-email"><?= !empty($user['email']) ? htmlspecialchars($user['email']) : '' ?></span>
                </div>
                <div class="info-item">
                    <label>Số điện thoại:</label>
                    <span id="user-phone"><?= !empty($user['phone']) ? htmlspecialchars($user['phone']) : '' ?></span>
                </div>
                <div class="info-item">
                    <label>Địa chỉ:</label>
                    <span id="user-address"><?= !empty($user['address']) ? htmlspecialchars($user['address']) : '' ?></span>
                </div>
                <div class="info-item" id="password-section" style="display: none;">
                    <label>Mật khẩu xác nhận:</label>
                    <div class="password-container">
                        <input type="password" id="edit-password" autocomplete="current-password">
                        <i class="bi bi-eye toggle-password" data-target="edit-password" aria-label="Hiển thị mật khẩu xác nhận"></i>
                    </div>
                </div>
                <button class="edit-btn">Chỉnh sửa</button>
                <form id="logout-form" method="POST" action="/baocao/user/submit" enctype="multipart/form-data" style="display: inline;">
                    <button type="submit" class="logout-btn" name="logout">Đăng xuất</button>
                </form>
            </div>
            <div id="orders" class="content-section">
                <h3>Đơn hàng của bạn</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Mã đơn hàng</th>
                            <th>Ngày đặt</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody id="order-list">
                        <?php if (!empty($thongTinDonHang)): ?>
                            <?php foreach ($thongTinDonHang as $order): ?>
                                <tr>
                                    <td>#<?= htmlspecialchars($order['iddonhang']) ?></td>
                                    <td><?= htmlspecialchars($order['ngaydat']) ?></td>
                                    <td><?= number_format($order['grandtotal']) ?>đ</td>
                                    <td><?= htmlspecialchars($order['trangthai']) ?></td>
                                    <td>
                                        <i class="bi bi-eye order-details-icon" data-order-id="<?= htmlspecialchars($order['iddonhang']) ?>" style="cursor: pointer;"></i>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="5">Bạn chưa có đơn hàng nào.</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <div id="change-password" class="content-section">
                <h3>Đổi mật khẩu</h3>
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="old-password">Mật khẩu cũ:</label>
                        <div class="password-container">
                            <input type="password" id="old-password" required autocomplete="current-password">
                            <i class="bi bi-eye toggle-password" data-target="old-password" aria-label="Hiển thị mật khẩu cũ"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="new-password">Mật khẩu mới:</label>
                        <div class="password-container">
                            <input type="password" id="new-password" required autocomplete="new-password">
                            <i class="bi bi-eye toggle-password" data-target="new-password" aria-label="Hiển thị mật khẩu mới"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="confirm-password">Xác nhận mật khẩu mới:</label>
                        <div class="password-container">
                            <input type="password" id="confirm-password" required autocomplete="new-password">
                            <i class="bi bi-eye toggle-password" data-target="confirm-password" aria-label="Hiển thị xác nhận mật khẩu"></i>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">Đổi mật khẩu</button>
                </form>
            </div>

            <!-- Modal chi tiết đơn hàng -->
            <div id="order-details-modal" class="modal">
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h3>Chi tiết đơn hàng</h3>
                    <div class="order-details-table-container">
                        <table id="order-details-table">
                            <thead>
                                <tr>
                                    <th>Ảnh</th>
                                    <th>Tên sản phẩm</th>
                                    <th>Kích thước</th>
                                    <th>Số lượng</th>
                                    <th>Giá</th>
                                </tr>
                            </thead>
                            <tbody id="order-details-list">
                                <!-- Dữ liệu sẽ được điền động bằng JavaScript -->
                            </tbody>
                        </table>
                    </div>
                    <div id="order-details-money" style="text-align: right; margin-top: 10px; padding: 10px; border-top: 1px solid #ccc;">
                        <!-- Nội dung sẽ được thêm bằng JS -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <?php include "zalo_icon.php"; ?>
    <?php include "chatbot.php"; ?>
    <?php include "footer.php"; ?>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        window.userInfo = <?php echo json_encode(!empty($user) ? $user : null); ?>;
    </script>
    <script src="/baocao/view/js/taikhoan.js"></script>
</body>

</html>