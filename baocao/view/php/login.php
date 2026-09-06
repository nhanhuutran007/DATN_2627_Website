<?php
session_start();
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);
$error_msg = $_SESSION['error_msg'] ?? '';
unset($_SESSION['error_msg']);
$form_data = $_SESSION['form_data'] ?? []; // Lấy dữ liệu form từ session
unset($_SESSION['form_data']); // Xóa dữ liệu form sau khi sử dụng
?>

<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đăng Nhập / Đăng Ký</title>
  <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
  <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
  <meta name="keywords" content="đăng nhập, thể thao, NHL Sports, thời trang thể thao">
  <link rel="stylesheet" href="/baocao/view/css/login.css" />
</head>

<body>
  <header> <?php include "header.php"; ?> </header>
  <?php if (!empty($success_msg)): ?>
    <div id="success-alert" class="alert-success">
      <?= htmlspecialchars($success_msg) ?>
    </div>
  <?php endif; ?>
  <?php if (!empty($error_msg)): ?>
    <div id="error-alert" class="alert-error">
      <?= htmlspecialchars($error_msg) ?>
    </div>
  <?php endif; ?>
  <div class="container">
    <!-- Login Form -->
    <form action="/baocao/user/submit" method="POST">
      <div id="login-form" class="<?= !isset($_GET['show']) || $_GET['show'] !== 'register' ? 'active1' : '' ?>">
        <h1 class="title">ĐĂNG NHẬP</h1>

        <div class="progress-bar">
          <div class="progress-bar-gray"></div>
          <div class="progress-bar-red"></div>
          <div class="progress-bar-gray"></div>
        </div>

        <input type="text" name="username" class="input-field" placeholder="Tài khoản" value="<?= htmlspecialchars($form_data['username'] ?? '') ?>" required />
        <div class="password-container">
          <input type="password" name="password" class="input-field" placeholder="Mật khẩu" id="login-password" required />
          <i class="bi bi-eye toggle-password" data-target="login-password" aria-label="Hiển thị mật khẩu"></i>
        </div>

        <button class="button" type="submit" name="dangnhap">ĐĂNG NHẬP</button>

        <div class="login-links">
          <a id="forgot-password-link">Quên mật khẩu?</a>
          <a id="register-link">Đăng ký tại đây</a>
        </div>

        <!-- <div class="alt-login-text">hoặc đăng nhập qua</div> -->

        <!-- <div class="social-buttons">
          <a
            href="https://www.facebook.com/hao23nhat/"
            class="social-button facebook-button">
            <i>f</i> Facebook
          </a>
          <a
            href="https://www.google.com.vn/"
            class="social-button google-button">
            <i>G+</i> Google
          </a>
        </div> -->
      </div>
    </form>


    <form action="/baocao/user/submit" method="POST">
      <div id="register-form" class="<?= isset($_GET['show']) && $_GET['show'] === 'register' ? 'active1' : '' ?>">
        <h1 class="title">ĐĂNG KÝ</h1>
        <p class="description">
          Đã có tài khoản, <a id="login-link">đăng nhập tại đây</a>
        </p>
        <input type="text" name="fullname" class="input-field" placeholder="Họ và tên" value="<?= htmlspecialchars($form_data['fullname'] ?? '') ?>" required />
        <input type="text" name="username" class="input-field" placeholder="Tài khoản" value="<?= htmlspecialchars($form_data['username'] ?? '') ?>" required />
        <div class="password-container">
          <input type="password" name="password" class="input-field" placeholder="Mật khẩu (tối thiểu 8 ký tự)" id="register-password" required />
          <i class="bi bi-eye toggle-password" data-target="register-password" aria-label="Hiển thị mật khẩu"></i>
        </div>
        <input type="email" name="email" class="input-field" placeholder="Email" value="<?= htmlspecialchars($form_data['email'] ?? '') ?>" required />
        <input type="tel" name="phone" class="input-field" placeholder="Số điện thoại" value="<?= htmlspecialchars($form_data['phone'] ?? '') ?>" required />
        <input type="text" name="address" class="input-field" placeholder="Địa chỉ" value="<?= htmlspecialchars($form_data['address'] ?? '') ?>" required />
        <button class="button" type="submit" name="dangky">ĐĂNG KÝ</button>

        <!-- <div class="alt-login-text">Hoặc đăng nhập bằng</div>

        <div class="social-buttons">
          <a
            href="https://www.facebook.com/hao23nhat/"
            class="social-button facebook-button">
            <i>f</i> Facebook
          </a>
          <a
            href="https://www.google.com.vn/"
            class="social-button google-button">
            <i>G+</i> Google
          </a>
        </div> -->
      </div>
    </form>

    <form action="/baocao/user/submit" method="POST">
      <div id="forgot-password-form" class="<?= isset($_GET['show']) && $_GET['show'] === 'forgot' ? 'active1' : '' ?>">
        <h1 class="title">QUÊN MẬT KHẨU</h1>
        <p class="description">Nhập email của bạn để lấy lại mật khẩu</p>

        <input type="email" class="input-field" placeholder="Email" name="email" required />

        <button class="button" type="submit" name="forgot">LẤY LẠI MẬT KHẨU</button>

        <p class="description">
          <a id="back-to-login-link">Quay lại đăng nhập</a>
        </p>
      </div>
    </form>

    <form action="/baocao/user/submit" method="POST">
      <div id="authenticate-form" class="<?= isset($_GET['show']) && $_GET['show'] === 'authen' ? 'active1' : '' ?>">
        <h1 class="title">XÁC THỰC ĐĂNG NHẬP</h1>

        <div class="progress-bar">
          <div class="progress-bar-gray"></div>
          <div class="progress-bar-red"></div>
          <div class="progress-bar-gray"></div>
        </div>
        <div class="password-container">
          <input type="password" name="otp" id="confirm-password" class="input-field" placeholder="Nhập mã OTP" required />
          <i class="bi bi-eye toggle-password" data-target="confirm-password" aria-label="Hiển thị mật khẩu"></i>
        </div>

        <button class="button" type="submit" name="authen">XÁC NHẬN</button>
      </div>
    </form>

    <form action="/baocao/user/submit" method="POST">
      <div id="authenticate-register" class="<?= isset($_GET['show']) && $_GET['show'] === 'authen-register' ? 'active1' : '' ?>">
        <h1 class="title">XÁC THỰC ĐĂNG KÝ</h1>

        <div class="progress-bar">
          <div class="progress-bar-gray"></div>
          <div class="progress-bar-red"></div>
          <div class="progress-bar-gray"></div>
        </div>
        <div class="password-container">
          <input type="password" name="otp" id="authen-register-password" class="input-field" placeholder="Nhập mã OTP" required />
          <i class="bi bi-eye toggle-password" data-target="authen-register-password" aria-label="Hiển thị mật khẩu"></i>
        </div>

        <button class="button" type="submit" name="authen_register">XÁC NHẬN</button>
      </div>
    </form>
  </div>
  <?php include "zalo_icon.php"; ?>
  <?php include "chatbot.php"; ?>
  <footer> <?php include "footer.php"; ?></footer>
  <script src="/baocao/view/js/login.js"></script>
</body>

</html>