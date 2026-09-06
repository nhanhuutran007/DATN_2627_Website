<?php
date_default_timezone_set('Asia/Ho_Chi_Minh');
session_start();
header('Content-Type: application/json');
$timeout = 7200;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY']) <= $timeout) {
    echo json_encode(['status' => 'active']);
} else {
    session_unset();
    session_destroy();
    // session_regenerate_id();
    echo json_encode(['status' => 'expired']);
}
