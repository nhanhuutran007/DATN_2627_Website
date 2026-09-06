<?php
ob_start();
require_once "session.php";
require "../../model/UserModel.php";
require '../../model/vendor/autoload.php';

use PayOS\PayOS;

header('Content-Type: application/json; charset=UTF-8');


// Kiểm tra nội dung bộ đệm
if (ob_get_length()) {
    file_put_contents('payos_log.txt', date('Y-m-d H:i:s') . ': Unexpected output in buffer: ' . ob_get_contents() . PHP_EOL, FILE_APPEND);
    ob_end_clean();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Yêu cầu không hợp lệ']);
    exit;
}

// Thông tin PayOS
$client_id = '29f26f84-da2a-412a-b798-8bc19b38b31c';
$api_key = '52032189-1430-4bd9-a4b6-ba62c564ff33';
$checksum_key = '4f7e171e2e569ad80d7ab63a75d3a9b274ca8ef9cde18c7940e1c3335e5f3916';
$log_file = 'payos_log.txt';

// Khởi tạo PayOS
$payos = new PayOS($client_id, $api_key, $checksum_key);

// Lấy dữ liệu từ form
$order_id = $_POST['order_id'] ?? '';
$payment_method = $_POST['payment-method'] ?? '';
$grand_total = (int)$_POST['grandtotal'] ?? 0;
$username = $_POST['username'] ?? '';
$fullname = $_POST['fullname'] ?? '';
$phone = $_POST['phone'] ?? '';
$address = $_POST['address'] ?? '';
$email = $_POST['email'] ?? '';
$total_all = (int)$_POST['totalAll'] ?? 0;
$sale = (int)$_POST['sale'] ?? 0;
$tienship = (int)$_POST['tienship'] ?? 0;
$freeship = $_POST['freeship'] ?? 'no';
$note = $_POST['note'] ?? '';
$csrf_token = $_POST['csrf_token'] ?? '';

if ($csrf_token !== $_SESSION['csrf_token']) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': CSRF token không hợp lệ' . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Mã CSRF không hợp lệ']);
    exit;
}

if (empty($order_id) || empty($payment_method) || empty($email) || empty($fullname) || empty($phone) || empty($address)) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': Dữ liệu form không hợp lệ. Missing: ' .
        (empty($order_id) ? 'order_id ' : '') .
        (empty($payment_method) ? 'payment_method ' : '') .
        (empty($email) ? 'email ' : '') .
        (empty($fullname) ? 'fullname ' : '') .
        (empty($phone) ? 'phone ' : '') .
        (empty($address) ? 'address ' : '') . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Dữ liệu không hợp lệ']);
    exit;
}

$phoneRegex = '/^0\d{9}$/';
if (!preg_match($phoneRegex, $phone)) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': Số điện thoại không hợp lệ: ' . $phone . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)']);
    exit;
}

$formatted_phone = $phone;
if (substr($phone, 0, 1) === '0') {
    $formatted_phone = '+84' . substr($phone, 1);
}
file_put_contents($log_file, date('Y-m-d H:i:s') . ': Formatted phone: ' . $formatted_phone . PHP_EOL, FILE_APPEND);

if (!preg_match('/^webtt[0-9]+$/', $order_id)) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': Order ID không hợp lệ: ' . $order_id . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Mã đơn hàng không hợp lệ']);
    exit;
}

file_put_contents($log_file, date('Y-m-d H:i:s') . ': POST order_id: ' . $order_id . PHP_EOL, FILE_APPEND);

$order_code = (int)str_replace('webtt', '', $order_id);
if ($order_code <= 0) {
    $order_code = mt_rand(100000, 999999);
    $order_id = 'webtt' . $order_code;
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': Order code không hợp lệ, tạo mới: ' . $order_code . PHP_EOL, FILE_APPEND);
}

$subject = "Đặt hàng thành công!";
$message = "Xin chào " . $username . " ! Cảm ơn bạn đã lựa chọn chúng tôi, đơn hàng của bạn đã được đặt thành công tại NHL SPORTS. Chúc bạn 1 ngày vui vẻ!";

try {
    $pdo = new PDO("mysql:host=localhost;dbname=nhlsports", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($payment_method === 'bank-transfer') {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM pending_orders WHERE order_id = :order_id");
        $stmt->execute(['order_id' => $order_id]);
        if ($stmt->fetchColumn() > 0) {
            file_put_contents($log_file, date('Y-m-d H:i:s') . ': Order ID trùng lặp: ' . $order_id . PHP_EOL, FILE_APPEND);
            ob_end_clean();
            echo json_encode(['status' => 'error', 'message' => 'Mã đơn hàng đã tồn tại']);
            exit;
        }

        $data = [
            'orderCode' => $order_code,
            'amount' => $grand_total,
            'description' => "VQR$order_code",
            'buyerName' => $fullname,
            'buyerEmail' => $email,
            'buyerPhone' => $formatted_phone,
            'buyerAddress' => $address,
            'items' => [],
            'cancelUrl' => 'https://www.facebook.com/nam.huynhnhat.710/',
            'returnUrl' => 'https://www.facebook.com/nam.huynhnhat.710/',
            'expiredAt' => time() + 3600
        ];

        $items_total = 0;
        foreach ($_POST['nameProduct'] as $index => $name) {
            if (!isset($_POST['quantity'][$index]) || !isset($_POST['priceDetail'][$index])) {
                file_put_contents($log_file, date('Y-m-d H:i:s') . ': Thiếu số lượng hoặc giá sản phẩm tại index ' . $index . PHP_EOL, FILE_APPEND);
                ob_end_clean();
                echo json_encode(['status' => 'error', 'message' => 'Thiếu thông tin số lượng hoặc giá sản phẩm']);
                exit;
            }

            $name = mb_substr($name, 0, 30, 'UTF-8');
            $quantity = (int)$_POST['quantity'][$index];
            $price = (int)str_replace(',', '', $_POST['priceDetail'][$index]);

            if ($quantity <= 0 || $price <= 0) {
                file_put_contents($log_file, date('Y-m-d H:i:s') . ': Số lượng hoặc giá sản phẩm không hợp lệ: quantity=' . $quantity . ', price=' . $price . PHP_EOL, FILE_APPEND);
                ob_end_clean();
                echo json_encode(['status' => 'error', 'message' => 'Số lượng hoặc giá sản phẩm không hợp lệ']);
                exit;
            }

            $data['items'][] = [
                'name' => $name,
                'quantity' => $quantity,
                'price' => $price
            ];
            $items_total += $quantity * $price;
        }

        file_put_contents($log_file, date('Y-m-d H:i:s') . ': Giá trị tính toán: items_total=' . $items_total . ', tienship=' . $tienship . ', sale=' . $sale . ', grand_total=' . $grand_total . PHP_EOL, FILE_APPEND);

        if ($items_total + $tienship - $sale !== $grand_total) {
            file_put_contents($log_file, date('Y-m-d H:i:s') . ': Tổng items không khớp với grand_total: items_total=' . $items_total . ', grand_total=' . $grand_total . PHP_EOL, FILE_APPEND);
            ob_end_clean();
            echo json_encode(['status' => 'error', 'message' => 'Tổng tiền items không khớp với tổng đơn hàng']);
            exit;
        }

        file_put_contents($log_file, date('Y-m-d H:i:s') . ': PayOS Request Data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);

        $response = $payos->createPaymentLink($data);
        file_put_contents($log_file, date('Y-m-d H:i:s') . ': PayOS Response: ' . json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);

        if (isset($response['checkoutUrl']) && isset($response['paymentLinkId']) && $response['status'] === 'PENDING') {
            $_SESSION['paymentLinkId'] = $response['paymentLinkId']; // Lưu paymentLinkId vào session
            $stmt = $pdo->prepare("
                INSERT INTO pending_orders (order_id)
                VALUES (:order_id)
            ");
            $stmt->execute([
                'order_id' => $order_id,
            ]);


            // sendMail($email, $subject, $message);
            ob_end_clean();
            echo json_encode([
                'status' => 'success',
                'checkoutUrl' => $response['checkoutUrl']
            ]);
            exit;
        } else {
            $error_message = isset($response['desc']) ? $response['desc'] : 'Lỗi không xác định từ PayOS';
            file_put_contents($log_file, date('Y-m-d H:i:s') . ': PayOS Error: ' . $error_message . PHP_EOL, FILE_APPEND);
            ob_end_clean();
            echo json_encode(['status' => 'error', 'message' => 'Không thể tạo mã QR: ' . $error_message]);
            exit;
        }
    }
} catch (PDOException $e) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': Database Error: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Lỗi khi lưu đơn hàng: ' . $e->getMessage()]);
    exit;
} catch (Exception $e) {
    file_put_contents($log_file, date('Y-m-d H:i:s') . ': General Error: ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
    exit;
}
