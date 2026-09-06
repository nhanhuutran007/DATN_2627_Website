<?php
header('Content-Type: application/json');
// require_once "../../../view/php/session.php";
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['order_id'], $_POST['amount'], $_POST['description'], $_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    echo json_encode(['status' => 'error', 'message' => 'Yêu cầu không hợp lệ hoặc CSRF token không khớp']);
    exit;
}

$order_id = $_POST['order_id'];
$amount = (int)$_POST['amount'];
$description = $_POST['description'];

function generateVietQR($order_id, $amount, $description)
{
    $client_id = '173b69d7-7752-417d-af36-a4fdd554156f';
    $api_key = 'ae6805c2-6ed2-4429-a62b-499f55f71f09';
    $url = 'https://api.vietqr.io/v2/generate';

    $data = [
        'accountNo' => '0777566324',
        'accountName' => 'HUYNH NHAT NAM',
        'acqId' => '970422',
        'amount' => $amount,
        'addInfo' => $description,
        'format' => 'text',
        'template' => 'compact2'
    ];

    $headers = [
        'x-client-id: ' . $client_id,
        'x-api-key: ' . $api_key,
        'Content-Type: application/json'
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        error_log('cURL Error: ' . curl_error($ch));
        curl_close($ch);
        return '';
    }

    curl_close($ch);
    $result = json_decode($response, true);
    return $result['data']['qrDataURL'] ?? '';
}

$qr_code_url = generateVietQR($order_id, $amount, $description);
if ($qr_code_url) {
    echo json_encode(['status' => 'success', 'qrCodeUrl' => $qr_code_url]);
} else {
    error_log('VietQR API Error: Không thể tạo mã QR cho order_id ' . $order_id);
    echo json_encode(['status' => 'error', 'message' => 'Không thể tạo mã QR']);
}
