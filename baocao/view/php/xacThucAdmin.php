<?php
$user = isset($_SESSION['info']) ? $_SESSION['info'] : [];
if (empty($user)) {
    $_SESSION['error_msg'] = "Đăng nhập để truy cập quyền admin!";
    header("Location: /baocao/login");
    exit;
}
