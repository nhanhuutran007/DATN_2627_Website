<?php
session_start();
require '../../model/UserModel.php';
if (isset($_GET['token'])) {
    $token = $_GET['token'];
    $user = getUserByToken($token);

    if ($user && strtotime($user['reset_expires']) > time()) {
        $_SESSION['reset_token'] = $token;
    } else {
        die("Token không hợp lệ hoặc đã hết hạn.");
    }
}
$error_msg = $_SESSION['error_msg'] ?? '';
unset($_SESSION['error_msg']);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại mật khẩu</title>
    <link rel="stylesheet" href="/baocao/view/css/login.css">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="voucher, thể thao, NHL Sports, thời trang thể thao">
</head>

<body>
    <?php include "header.php"; ?>
    <?php if (!empty($error_msg)): ?>
        <div id="error-alert" class="alert-error">
            <?= htmlspecialchars($error_msg) ?>
        </div>
    <?php endif; ?>
    <div class="container">
        <!-- Login Form -->
        <form action="/baocao/user/submit" method="POST">
            <div id="login-form" class="<?= !isset($_GET['show']) || $_GET['show'] !== 'register' ? 'active1' : '' ?>">
                <h1 class="title">ĐẶT LẠI MẬT KHẨU</h1>

                <div class="progress-bar">
                    <div class="progress-bar-gray"></div>
                    <div class="progress-bar-red"></div>
                    <div class="progress-bar-gray"></div>
                </div>
                <div class="password-container">
                    <input type="password" name="newpass" id="new-password" class="input-field" placeholder="Mật khẩu mới" required />
                    <i class="bi bi-eye toggle-password" data-target="new-password" aria-label="Hiển thị mật khẩu"></i>
                </div>
                <div class="password-container">
                    <input type="password" name="reconfirm" id="confirm-password" class="input-field" placeholder="Xác nhận mật khẩu" required />
                    <i class="bi bi-eye toggle-password" data-target="confirm-password" aria-label="Hiển thị mật khẩu"></i>
                </div>

                <button class="button" type="submit" name="resetpass">GỬI</button>
            </div>
        </form>
    </div>

    <?php include "footer.php"; ?>
    <script>
        document.querySelectorAll(".toggle-password").forEach(icon => {
            let timeoutId = null;
            icon.addEventListener("click", function() {
                const targetId = this.getAttribute("data-target");
                const input = document.getElementById(targetId);
                console.log("login.js: Toggle password visibility for", targetId);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    console.log("login.js: Cleared previous timeout for", targetId);
                }
                if (input.type === "password") {
                    input.type = "text";
                    this.classList.remove("bi-eye");
                    this.classList.add("bi-eye-slash");
                    this.setAttribute("aria-label", `Ẩn mật khẩu`);
                    console.log("login.js: Password shown for", targetId);
                    timeoutId = setTimeout(() => {
                        input.type = "password";
                        this.classList.remove("bi-eye-slash");
                        this.classList.add("bi-eye");
                        this.setAttribute("aria-label", `Hiển thị mật khẩu`);
                        console.log("login.js: Password hidden automatically after 3 seconds for", targetId);
                        timeoutId = null;
                    }, 1500);
                } else {
                    input.type = "password";
                    this.classList.remove("bi-eye-slash");
                    this.classList.add("bi-eye");
                    this.setAttribute("aria-label", `Hiển thị mật khẩu`);
                    console.log("login.js: Password hidden manually for", targetId);
                    timeoutId = null;
                }
            });
        });
    </script>
</body>

</html>