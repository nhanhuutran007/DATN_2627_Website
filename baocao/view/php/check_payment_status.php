<?php
ob_start();
require_once "session.php";
require "../../model/vendor/autoload.php";

use PayOS\PayOS;

header('Content-Type: application/json; charset=UTF-8');

$client_id = '29f26f84-da2a-412a-b798-8bc19b38b31c';
$api_key = '52032189-1430-4bd9-a4b6-ba62c564ff33';
$checksum_key = '4f7e171e2e569ad80d7ab63a75d3a9b274ca8ef9cde18c7940e1c3335e5f3916';
$payos = new PayOS($client_id, $api_key, $checksum_key);

$paymentLinkId = $_SESSION['paymentLinkId'] ?? '';
if (empty($paymentLinkId)) {
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy paymentLinkId']);
    exit;
}

try {
    $paymentInfo = $payos->getPaymentLinkInformation($paymentLinkId);
    ob_end_clean();
    echo json_encode([
        'status' => 'success',
        'paymentStatus' => $paymentInfo['status']
    ]);
    exit;
} catch (Exception $e) {
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Lỗi khi kiểm tra trạng thái: ' . $e->getMessage()]);
    exit;
}
