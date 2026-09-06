<?php
// Ngăn đầu ra lỗi làm hỏng JSON
ob_start();
include "../../model/config/connect.php";

// Kiểm tra nếu session chưa được khởi tạo thì mới gọi session_start()
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$user = isset($_SESSION['info']) && is_array($_SESSION['info']) ? $_SESSION['info'] : [];
$isLoggedIn = !empty($user) && isset($user['id_user']);
$user_id = $isLoggedIn ? $user['id_user'] : null;
$session_id = session_id();

// Kiểm tra xem có tin nhắn nào cho session_id hoặc user_id hiện tại không
$hasMessages = false;
if ($session_id || $user_id) {
    $checkQuery = "SELECT COUNT(*) as count FROM messenger WHERE session_id = ? OR user_id = ?";
    $checkStmt = mysqli_prepare($conn, $checkQuery);
    if ($checkStmt) {
        $user_id_param = $user_id ?: null;
        mysqli_stmt_bind_param($checkStmt, "si", $session_id, $user_id_param);
        mysqli_stmt_execute($checkStmt);
        $checkResult = mysqli_stmt_get_result($checkStmt);
        $row = mysqli_fetch_assoc($checkResult);
        $hasMessages = $row['count'] > 0;
        mysqli_stmt_close($checkStmt);
    } else {
        error_log("Lỗi chuẩn bị truy vấn kiểm tra tin nhắn: " . mysqli_error($conn));
    }
}

function getChatHistory($conn, $session_id, $user_id = null, $last_id = 0)
{
    $history = [];
    $query = "SELECT id, sender, message, created_at, status FROM messenger WHERE (session_id = ? OR user_id = ?) AND id > ? ORDER BY created_at ASC";
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Không thể chuẩn bị truy vấn lịch sử tin nhắn: " . mysqli_error($conn));
        return $history;
    }

    $user_id_param = $user_id ?: null;
    mysqli_stmt_bind_param($stmt, "sii", $session_id, $user_id_param, $last_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    while ($row = mysqli_fetch_assoc($result)) {
        $message = [
            'id' => $row['id'],
            'sender' => $row['sender'],
            'message' => $row['message'],
            'created_at' => $row['created_at'],
            'status' => $row['status']
        ];

        // Lấy sản phẩm từ messenger_products
        $product_query = "SELECT product_name, code, brand, price, image, quantity, sizes FROM messenger_products WHERE message_id = ?";
        $product_stmt = mysqli_prepare($conn, $product_query);
        if ($product_stmt) {
            mysqli_stmt_bind_param($product_stmt, "i", $row['id']);
            mysqli_stmt_execute($product_stmt);
            $product_result = mysqli_stmt_get_result($product_stmt);

            $products = [];
            while ($product_row = mysqli_fetch_assoc($product_result)) {
                $product = [
                    'name' => $product_row['product_name'],
                    'brand' => $product_row['brand'],
                    'code' => $product_row['code'],
                    'price' => $product_row['price'] ? number_format($product_row['price']) . 'đ' : null,
                    'image' => $product_row['image'],
                    'quantity' => $product_row['quantity']
                ];
                if ($product_row['sizes']) {
                    $product['sizes'] = json_decode($product_row['sizes'], true);
                }
                $products[] = $product;
            }
            if (!empty($products)) {
                $message['products'] = $products;
            }
            mysqli_stmt_close($product_stmt);
        } else {
            error_log("Không thể chuẩn bị truy vấn sản phẩm: " . mysqli_error($conn));
        }

        $history[] = $message;
    }
    mysqli_stmt_close($stmt);
    return $history;
}

function saveMessage($conn, $sender, $user_id, $session_id, $message, $products = null, $vouchers = null, $pending_order = null, $status = 'active')
{
    $query = "INSERT INTO messenger (sender, user_id, session_id, message, status) VALUES (?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Không thể chuẩn bị truy vấn lưu tin nhắn: " . mysqli_error($conn));
        return false;
    }

    $user_id_param = $user_id ?: null;
    mysqli_stmt_bind_param($stmt, "sisss", $sender, $user_id_param, $session_id, $message, $status);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Lỗi thực thi truy vấn lưu tin nhắn: " . mysqli_error($conn));
        mysqli_stmt_close($stmt);
        return false;
    }
    $message_id = mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);

    // Lưu sản phẩm nếu có
    if (!empty($products) && is_array($products)) {
        $product_query = "INSERT INTO messenger_products (message_id, product_name, code, brand, price, image, quantity, sizes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $product_stmt = mysqli_prepare($conn, $product_query);
        if (!$product_stmt) {
            error_log("Không thể chuẩn bị truy vấn lưu sản phẩm: " . mysqli_error($conn));
            return false;
        }

        foreach ($products as $product) {
            $product_name = $product['name'] ?? '';
            $code = $product['table'] . "-" . $product['id'] ?? '';
            $brand = $product['brand'] ?? null;
            $price = $product['price'] ? floatval(str_replace(['đ', ','], '', $product['price'])) : null;
            $image = $product['image'] ?? null;
            $quantity = !empty($product['sizes']) ? $product['quantity'] : ($product['quantity'] ?? null);
            $sizes = !empty($product['sizes']) ? json_encode($product['sizes']) : null;

            mysqli_stmt_bind_param($product_stmt, "isssssss", $message_id, $product_name, $code, $brand, $price, $image, $quantity, $sizes);
            if (!mysqli_stmt_execute($product_stmt)) {
                error_log("Lỗi lưu sản phẩm cho message_id $message_id: " . mysqli_error($conn));
            }
        }
        mysqli_stmt_close($product_stmt);
    }

    return $message_id;
}

function isWaitingForAdmin($conn, $session_id, $user_id = null)
{
    $query = "SELECT status FROM messenger WHERE session_id = ? OR user_id = ? ORDER BY created_at DESC LIMIT 1";
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Không thể chuẩn bị truy vấn kiểm tra trạng thái: " . mysqli_error($conn));
        return false;
    }

    $user_id_param = $user_id ?: null;
    mysqli_stmt_bind_param($stmt, "si", $session_id, $user_id_param);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    return $row && $row['status'] === 'waiting_for_admin';
}

function getOrderInfo($conn, $keyword)
{
    if (!$conn) {
        error_log("Kết nối cơ sở dữ liệu thất bại");
        return [];
    }

    $orders = [];
    $keyword = trim($keyword);

    $orderId = preg_replace('/[^0-9]/', '', $keyword);
    $isPhone = preg_match('/^[0-9]{10}$/', $keyword);
    $isOrderId = is_numeric($orderId) && !$isPhone;

    if ($isPhone) {
        $query = "SELECT id, phone, grandtotal, ngaydat, trangthai FROM donhang WHERE phone = ? ORDER BY ngaydat DESC";
        $stmt = mysqli_prepare($conn, $query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $keyword);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            while ($row = mysqli_fetch_assoc($result)) {
                $orders[] = [
                    'id' => $row['id'],
                    'phone' => $row['phone'],
                    'grandtotal' => number_format($row['grandtotal']) . 'đ',
                    'ngaydat' => date('d/m/Y H:i', strtotime($row['ngaydat'])),
                    'trangthai' => $row['trangthai']
                ];
            }
            mysqli_stmt_close($stmt);
        } else {
            error_log("Không thể chuẩn bị truy vấn đơn hàng: " . mysqli_error($conn));
        }
    } elseif ($isOrderId) {
        $query = "SELECT id, phone, grandtotal, ngaydat, trangthai FROM donhang WHERE id = ?";
        $stmt = mysqli_prepare($conn, $query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "i", $orderId);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            while ($row = mysqli_fetch_assoc($result)) {
                $orders[] = [
                    'id' => $row['id'],
                    'phone' => $row['phone'],
                    'grandtotal' => number_format($row['grandtotal']) . 'đ',
                    'ngaydat' => date('d/m/Y H:i', strtotime($row['ngaydat'])),
                    'trangthai' => $row['trangthai']
                ];
            }
            mysqli_stmt_close($stmt);
        } else {
            error_log("Không thể chuẩn bị truy vấn đơn hàng: " . mysqli_error($conn));
        }
    }

    return $orders;
}

function getProductTables()
{
    return [
        "giaybongro" => "sizegiay",
        "giaybongchuyen" => "sizegiay",
        "giaybongda" => "sizegiay",
        "giaytapgym" => "sizegiay",
        "giaychaybo" => "sizegiay",
        "giaycaulong" => "sizegiay",
        "giaypickleball" => "sizegiay",
        "quanaobongro" => "sizequanao",
        "quanaobongchuyen" => "sizequanao",
        "quanaobongda" => "sizequanao",
        "quanaogym" => "sizequanao",
        "quanaochaybo" => "sizequanao",
        "quanaocaulong" => "sizequanao",
        "aobia" => "sizequanao",
        "quabongro" => null,
        "quabongchuyen" => null,
        "quabongda" => null,
        "phukienbongro" => null,
        "phukienbongchuyen" => null,
        "phukienbongda" => null,
        "phukiengym" => null,
        "phukienchaybo" => null,
        "phukiencaulong" => null,
        "phukienbia" => null,
        "phukienpick" => null,
        "votcaulong" => null,
        "cauthidau" => null,
        "gaybia" => null,
        "votpickleball" => null
    ];
}

function getProductInfo($conn, $keyword, $isSizeQuery = false, $category = null)
{
    if (!$conn) {
        error_log("Kết nối cơ sở dữ liệu thất bại");
        return [];
    }

    $tables = getProductTables();

    if ($category) {
        $tables = array_filter($tables, function ($key) use ($category) {
            return strpos($key, $category) !== false;
        }, ARRAY_FILTER_USE_KEY);
        if (empty($tables)) {
            error_log("Không tìm thấy bảng nào phù hợp với danh mục: $category");
            return [];
        }
    }

    $products = [];
    $productIds = [];
    $additionalCondition = "quantity > 0 AND is_active = 1";

    foreach ($tables as $table => $sizeTable) {
        error_log("Kiểm tra bảng: $table với từ khóa: " . ($keyword ?: 'tất cả sản phẩm'));

        // Xây dựng truy vấn dựa trên việc có $keyword hay không
        $query = "SELECT parent_id, id, name, brand, price, image, quantity FROM `$table` WHERE $additionalCondition";
        $params = [];
        $paramTypes = "";

        if (!empty(trim($keyword))) {
            $query .= " AND name LIKE ?";
            $params[] = "%" . $keyword . "%";
            $paramTypes .= "s";
        }

        $query .= " LIMIT 10";
        $stmt = mysqli_prepare($conn, $query);
        if (!$stmt) {
            error_log("Không thể chuẩn bị truy vấn cho bảng $table: " . mysqli_error($conn));
            continue;
        }

        if (!empty($params)) {
            mysqli_stmt_bind_param($stmt, $paramTypes, ...$params);
        }

        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            if (in_array($row['id'] . '-' . $table, $productIds)) {
                continue;
            }
            $productIds[] = $row['id'] . '-' . $table;

            $product = [
                'parent_id' => $row['parent_id'],
                'id' => $row['id'],
                'name' => $row['name'],
                'brand' => $row['brand'],
                'price' => number_format($row['price']) . 'đ',
                'image' => $row['image'],
                'table' => $table
            ];

            if ($isSizeQuery && $sizeTable) {
                error_log("Kiểm tra kích thước cho bảng: $sizeTable, parent_id: {$row['id']}");
                $sizeQuery = "SELECT size, quantity FROM `$sizeTable` WHERE table_name = ? AND parent_id = ?";
                $sizeStmt = mysqli_prepare($conn, $sizeQuery);
                if ($sizeStmt) {
                    mysqli_stmt_bind_param($sizeStmt, "si", $table, $row['id']);
                    mysqli_stmt_execute($sizeStmt);
                    $sizeResult = mysqli_stmt_get_result($sizeStmt);

                    $sizes = [];
                    while ($sizeRow = mysqli_fetch_assoc($sizeResult)) {
                        $sizes[] = [
                            'size' => $sizeRow['size'],
                            'quantity' => $sizeRow['quantity']
                        ];
                    }
                    $product['sizes'] = $sizes;
                    mysqli_stmt_close($sizeStmt);
                } else {
                    error_log("Không thể chuẩn bị truy vấn kích thước cho bảng $sizeTable: " . mysqli_error($conn));
                }
            } else {
                $product['quantity'] = $row['quantity'];
            }

            $products[] = $product;
        }

        mysqli_stmt_close($stmt);
    }

    shuffle($products);
    return array_slice($products, 0, 5);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    if (!$conn) {
        ob_clean();
        echo json_encode(['response' => 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau!']);
        ob_end_flush();
        exit;
    }

    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = trim($input['action'] ?? '');
        $message = trim($input['message'] ?? '');
        $last_id = isset($input['last_id']) ? intval($input['last_id']) : 0;

        if ($action === 'load_history') {
            $history = getChatHistory($conn, $session_id, $user_id, $last_id);
            ob_clean();
            echo json_encode([
                'type' => 'history',
                'history' => $history
            ]);
            ob_end_flush();
            exit;
        }

        if ($action === 'clear_notification_flag') {
            unset($_SESSION['admin_notification_sent']);
            ob_clean();
            echo json_encode(['status' => 'success']);
            ob_end_flush();
            exit;
        }

        if ($action === 'end_consultation') {
            try {
                $session_id = isset($input['session_id']) ? $input['session_id'] : session_id();
                $user_id_param = isset($input['user_id']) ? intval($input['user_id']) : $user_id;
                error_log("end_consultation: session_id = $session_id, user_id = " . ($user_id_param ?? 'NULL'));

                $stmt = $conn->prepare("UPDATE messenger SET status = 'active' WHERE (session_id = ? OR user_id = ?) AND status = 'waiting_for_admin'");
                $stmt->bind_param("si", $session_id, $user_id_param);
                if ($stmt->execute()) {
                    $affected_rows = $stmt->affected_rows;
                    error_log("end_consultation: affected_rows = $affected_rows");
                    if ($affected_rows > 0) {
                        unset($_SESSION['admin_notification_sent']);
                        ob_clean();
                        echo json_encode(['status' => 'success', 'message' => 'Phiên tư vấn đã kết thúc', 'affected_rows' => $affected_rows]);
                    } else {
                        ob_clean();
                        echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy phiên tư vấn để kết thúc']);
                    }
                } else {
                    error_log("Lỗi thực thi truy vấn end_consultation: " . $stmt->error);
                    ob_clean();
                    echo json_encode(['status' => 'error', 'message' => 'Lỗi khi kết thúc phiên tư vấn']);
                }
                $stmt->close();
            } catch (Exception $e) {
                error_log("Error ending consultation: " . $e->getMessage());
                ob_clean();
                echo json_encode(['status' => 'error', 'message' => 'Lỗi khi kết thúc phiên tư vấn']);
            }
            ob_end_flush();
            exit;
        }

        if ($action === 'start_consultation') {
            try {
                if (!isWaitingForAdmin($conn, $session_id, $user_id)) {
                    $notification = 'Yêu cầu tư vấn của bạn đã được ghi nhận. Admin sẽ hỗ trợ bạn ngay!';
                    saveMessage($conn, 'bot', $user_id, $session_id, $notification, null, null, null, 'waiting_for_admin');
                    $_SESSION['admin_notification_sent'] = true;
                    ob_clean();
                    echo json_encode(['status' => 'success', 'message' => 'Yêu cầu tư vấn đã được gửi']);
                } else {
                    ob_clean();
                    echo json_encode(['status' => 'success', 'message' => 'Phiên tư vấn đang hoạt động']);
                }
                ob_end_flush();
            } catch (Exception $e) {
                error_log("Error starting consultation: " . $e->getMessage());
                ob_clean();
                echo json_encode(['status' => 'error', 'message' => 'Lỗi khi bắt đầu phiên tư vấn']);
                ob_end_flush();
            }
            exit;
        }

        if ($action === 'start') {
            // Đặt lại biến thông báo khi bắt đầu phiên mới
            unset($_SESSION['admin_notification_sent']);
            $welcomeMessage = "Chào bạn! Tôi có thể giúp gì? (Tìm sản phẩm, tra cứu đơn hàng, tư vấn)";
            if (saveMessage($conn, 'bot', $user_id, $session_id, $welcomeMessage)) {
                ob_clean();
                echo json_encode([
                    'type' => 'text',
                    'message' => $welcomeMessage
                ]);
                ob_end_flush();
            } else {
                ob_clean();
                echo json_encode([
                    'type' => 'text',
                    'message' => 'Lỗi khi lưu tin nhắn. Vui lòng thử lại!'
                ]);
                ob_end_flush();
            }
            exit;
        }

        if (empty($message)) {
            ob_clean();
            echo json_encode(['response' => 'Vui lòng nhập câu hỏi hoặc yêu cầu!']);
            ob_end_flush();
            exit;
        }

        // Kiểm tra trạng thái phiên chat
        if (isWaitingForAdmin($conn, $session_id, $user_id)) {
            saveMessage($conn, 'user', $user_id, $session_id, $message, null, null, null, 'waiting_for_admin');
            ob_clean();
            echo json_encode([
                'type' => 'text',
                'message' => ''
            ]);
            // }
            ob_end_flush();
            exit;
        }

        saveMessage($conn, 'user', $user_id, $session_id, $message);

        $message = strtolower($message);
        $response = [];

        $categories = [
            'bóng đá' => 'bongda',
            'bóng rổ' => 'bongro',
            'bóng chuyền' => 'bongchuyen',
            'cầu lông' => 'caulong',
            'pickleball' => 'pick',
            'gym' => 'gym',
            'chạy bộ' => 'chaybo',
            'bia' => 'bia',
        ];

        // Kiểm tra trạng thái đơn hàng tạm thời
        if (!isset($_SESSION['pending_order'])) {
            $_SESSION['pending_order'] = [];
        }

        if (strpos($message, 'tìm sản phẩm') !== false) {
            $response = [
                'type' => 'text',
                'message' => 'Shop có rất nhiều sản phẩm như giày, quần áo, bóng, phụ kiện. Bạn muốn tìm sản phẩm cụ thể nào? Hãy thử nhập "tìm sản phẩm [tên sản phẩm]", "size [tên sản phẩm]", "số lượng [tên sản phẩm]" hoặc nhập tên danh mục sản phẩm bạn muốn tìm như bóng đá, bóng rổ, bi-a...'
            ];
            saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
        } elseif (strpos($message, 'size') !== false || strpos($message, 'số lượng') !== false) {
            $isSizeQuery = strpos($message, 'size') !== false;
            $keyword = str_replace(['size', 'số lượng'], '', $message);
            $keyword = trim($keyword);

            $matchedCategory = null;
            $categoryKeyword = null;
            foreach ($categories as $catKeyword => $catValue) {
                if (strpos($message, $catKeyword) !== false) {
                    $matchedCategory = $catValue;
                    $categoryKeyword = $catKeyword;
                    break;
                }
            }

            if (empty($keyword)) {
                $response = [
                    'type' => 'text',
                    'message' => 'Vui lòng nhập tên sản phẩm! Ví dụ: "size áo bi-a WPC-03" hoặc "số lượng giày cầu lông".'
                ];
                saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
            } else {
                $products = getProductInfo($conn, $keyword, $isSizeQuery, $matchedCategory);
                if (!empty($products)) {
                    $botMessage = "Kết quả tìm được: ";
                    $response = [
                        'type' => 'products',
                        'message' => $botMessage,
                        'products' => $products
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $botMessage, $products);
                } else {
                    $response = [
                        'type' => 'text',
                        'message' => 'Xin lỗi, không tìm thấy sản phẩm phù hợp. Vui lòng thử từ khóa khác hoặc nhập một phần tên sản phẩm như "WPC-03", "trắng xanh"!'
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
                }
            }
        } elseif (strpos($message, 'tìm đơn hàng') !== false || strpos($message, 'tra cứu đơn hàng') !== false) {
            $keyword = trim(str_replace(['tìm đơn hàng', 'tra cứu đơn hàng'], '', $message));
            if (empty($keyword)) {
                $response = [
                    'type' => 'text',
                    'message' => 'Vui lòng nhập số điện thoại hoặc mã đơn hàng (ví dụ: tìm đơn hàng #49 hoặc tìm đơn hàng 0777....) để tra cứu!'
                ];
                saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
            } else {
                $orders = getOrderInfo($conn, $keyword);
                if (!empty($orders)) {
                    $orderList = array_map(function ($order) {
                        return "Mã đơn: {$order['id']} - SĐT: {$order['phone']} - Tổng tiền: {$order['grandtotal']} - Ngày đặt: {$order['ngaydat']} - Trạng thái: {$order['trangthai']}";
                    }, $orders);
                    $response = [
                        'type' => 'text',
                        'message' => implode("\n", $orderList)
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
                } else {
                    $response = [
                        'type' => 'text',
                        'message' => 'Không tìm thấy đơn hàng phù hợp với số điện thoại hoặc mã đơn hàng đã nhập!'
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
                }
            }
        } else {
            $matchedCategory = null;
            $categoryKeyword = null;
            foreach ($categories as $catKeyword => $catValue) {
                if (strpos($message, $catKeyword) !== false) {
                    $matchedCategory = $catValue;
                    $categoryKeyword = $catKeyword;
                    break;
                }
            }

            if ($matchedCategory) {
                $keyword = str_replace($categoryKeyword, '', $message);
                $keyword = trim($keyword);
                $products = getProductInfo($conn, $keyword, false, $matchedCategory);
                if (!empty($products)) {
                    $botMessage = "Kết quả tìm được: ";
                    $response = [
                        'type' => 'products',
                        'message' => $botMessage,
                        'products' => $products
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $botMessage, $products);
                } else {
                    $response = [
                        'type' => 'text',
                        'message' => "Xin lỗi, không tìm thấy sản phẩm $categoryKeyword phù hợp. Vui lòng thử từ khóa khác hoặc nhập một phần tên sản phẩm như 'WPC-03', 'trắng xanh'!"
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
                }
            } else {
                if (isWaitingForAdmin($conn, $session_id, $user_id)) {
                    $response = [
                        'type' => 'text',
                        'message' => ''
                    ];
                } else {
                    $response = [
                        'type' => 'text',
                        'message' => 'Hãy thử nhập "tên sản phẩm", "size [tên sản phẩm]", "số lượng [tên sản phẩm]" hoặc nhập tên danh mục như "bóng đá", "bóng rổ", "bi-a" để tìm thông tin!'
                    ];
                    saveMessage($conn, 'bot', $user_id, $session_id, $response['message']);
                }
            }
        }
        // }

        ob_clean();
        echo json_encode($response);
        ob_end_flush();
    } catch (Exception $e) {
        error_log("Lỗi trong /baocao/chatbot: " . $e->getMessage());
        ob_clean();
        echo json_encode([
            'type' => 'text',
            'message' => 'Đã xảy ra lỗi server.'
        ]);
        ob_end_flush();
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot NHL Sports</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="chatbot, thể thao, NHL Sports, thời trang thể thao">
    <link rel="stylesheet" href="/baocao/view/css/chatbot.css">
</head>

<body>

    <div class="chatbot">
        <div class="chatbot-wrapper">
            <div class="chatbot-toggle" onclick="toggleChatbot()">
                <i class="bi bi-chat-dots"></i>
            </div>
            <div class="chatbot-container" id="chatbotContainer" style="display: none;">
                <div class="chatbot-header">
                    <div class="header-logo">
                        <img src="/baocao/view/img/logo3.webp" alt="NHL Sports Logo" class="header-img">
                        <span>NHL Sports</span>
                    </div>
                    <button class="btn btn-primary btn-sm consult-btn" id="consultBtn" style="display: none;">Tư vấn</button>
                    <button class="btn btn-success btn-sm end-consultation-btn" id="endConsultationBtn" style="display: <?php echo isWaitingForAdmin($conn, $session_id, $user_id) ? 'inline-block' : 'none'; ?>;">Ngừng tư vấn</button>
                    <span onclick="toggleChatbot()" style="cursor: pointer;">✖</span>
                </div>
                <div class="chatbot-body" id="chatbotBody">
                    <?php if (!$hasMessages): ?>
                        <button class="start-button" onclick="startChat()">Bắt đầu</button>
                    <?php endif; ?>
                </div>
                <div class="chatbot-input" id="chatbotInputContainer" style="display: <?php echo $hasMessages ? 'block' : 'none'; ?>;">
                    <input type="text" id="chatbotInput" placeholder="Nhập câu hỏi..." onkeypress="if(event.key === 'Enter') sendMessage()">
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        let isChatStarted = <?php echo $hasMessages ? 'true' : 'false'; ?>;
        let lastMessageId = 0;
        let isProcessing = false; // Biến theo dõi trạng thái yêu cầu AJAX

        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) {
                return map[m];
            });
        }

        function number_format(number) {
            return Number(number).toLocaleString('en-US');
        }

        function toggleChatbot() {
            const container = document.getElementById('chatbotContainer');
            const isVisible = window.getComputedStyle(container).display !== 'none';
            container.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible && isChatStarted) {
                loadChatHistory();
            }
        }

        function loadChatHistory() {
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'load_history',
                    last_id: 0
                }),
                success: function(response) {
                    const chatbotBody = document.getElementById('chatbotBody');
                    chatbotBody.innerHTML = '';
                    if (response.type === 'history' && response.history && response.history.length > 0) {
                        response.history.forEach(msg => {
                            lastMessageId = Math.max(lastMessageId, msg.id);
                            const timestamp = new Date(msg.created_at);
                            const formattedTime = timestamp.toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            if (msg.sender === 'user') {
                                chatbotBody.innerHTML += `<div class="chatbot-message user-message" data-id="${msg.id}"><strong>Bạn:</strong> ${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                            } else if (msg.sender === 'admin') {
                                chatbotBody.innerHTML += `<div class="chatbot-message bot-message" data-id="${msg.id}"><strong>Admin:</strong> ${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                            } else {
                                const senderClass = msg.sender === 'admin' ? 'admin-message' : 'bot-message';
                                const senderName = msg.sender === 'admin' ? 'Admin' : 'Bot';
                                chatbotBody.innerHTML += `<div class="chatbot-message ${senderClass}" data-id="${msg.id}"><strong>Bot:</strong>${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                                if (msg.products && Array.isArray(msg.products)) {
                                    msg.products.forEach(product => {
                                        let sizeInfo = '';
                                        if (product.sizes && product.sizes.length > 0) {
                                            sizeInfo = '<p>Kích thước và số lượng:</p><ul>';
                                            product.sizes.forEach(size => {
                                                sizeInfo += `<li>${escapeHtml(size.size.toUpperCase())}: ${size.quantity}</li>`;
                                            });
                                            sizeInfo += '</ul>';
                                        } else if (product.quantity !== undefined && product.quantity !== null) {
                                            sizeInfo = `<p>Số lượng: ${product.quantity}</p>`;
                                        }
                                        const card = `
                                        <div class="product-card">
                                            <img src="/baocao/view/img/${product.image}" alt="${escapeHtml(product.name)}" title="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/80'">
                                            <div class="product-info">
                                                <h4>${escapeHtml(product.name)}</h4>
                                                <p>Thương hiệu: ${product.brand || 'Không có'}</p>
                                                <p>Giá: ${product.price || 'Không có'}</p>
                                                ${sizeInfo}
                                            </div>
                                        </div>`;
                                        chatbotBody.innerHTML += card;
                                    });
                                }
                            }
                        });
                        chatbotBody.scrollTop = chatbotBody.scrollHeight;
                    } else {
                        chatbotBody.innerHTML = `<div class="chatbot-message bot-message">Không có lịch sử trò chuyện để hiển thị.</div>`;
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Lỗi tải lịch sử:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                    const chatbotBody = document.getElementById('chatbotBody');
                    chatbotBody.innerHTML = `<div class="chatbot-message bot-message">Lỗi khi tải lịch sử trò chuyện: ${error}. Vui lòng thử lại!</div>`;
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                }
            });
        }

        function checkConsultationStatus() {
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'load_history',
                    last_id: 0
                }),
                success: function(response) {
                    const endConsultationBtn = document.getElementById('endConsultationBtn');
                    const consultBtn = document.getElementById('consultBtn');
                    if (response.type === 'history' && response.history && response.history.length > 0) {
                        const isWaitingForAdmin = response.history.some(msg => msg.status === 'waiting_for_admin');
                        endConsultationBtn.style.display = isWaitingForAdmin ? 'inline-block' : 'none';
                        consultBtn.style.display = isWaitingForAdmin ? 'none' : 'inline-block';
                    } else {
                        endConsultationBtn.style.display = 'none';
                        consultBtn.style.display = 'inline-block';
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Lỗi kiểm tra trạng thái tư vấn:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                }
            });
        }

        function endConsultation() {
            if (isProcessing) return; // Ngăn gửi nhiều yêu cầu cùng lúc
            if (!confirm('Bạn có chắc chắn muốn ngừng phiên tư vấn này?')) return;

            isProcessing = true;
            const endConsultationBtn = document.getElementById('endConsultationBtn');
            endConsultationBtn.disabled = true; // Vô hiệu hóa nút ngay lập tức

            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'end_consultation'
                }),
                dataType: 'json',
                success: function(response) {
                    if (response.status === 'success') {
                        alert(response.message);
                        endConsultationBtn.style.display = 'none';
                        document.getElementById('consultBtn').style.display = 'inline-block';
                        loadChatHistory();
                        $.ajax({
                            url: '/baocao/chatbot',
                            type: 'POST',
                            contentType: 'application/json; charset=utf-8',
                            data: JSON.stringify({
                                action: 'clear_notification_flag'
                            }),
                            success: function() {
                                console.log('Đã xóa admin_notification_sent');
                            }
                        });
                        setTimeout(checkConsultationStatus, 500);
                    } else {
                        alert(response.message || 'Đã xảy ra lỗi khi ngừng phiên tư vấn');
                    }
                },
                error: function(xhr, status, error) {
                    alert('Đã xảy ra lỗi khi ngừng phiên tư vấn');
                    console.error('Lỗi AJAX:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                },
                complete: function() {
                    isProcessing = false;
                    endConsultationBtn.disabled = false; // Kích hoạt lại nút sau khi hoàn thành
                }
            });
        }

        function checkNewMessages() {
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'load_history',
                    last_id: lastMessageId
                }),
                success: function(response) {
                    const chatbotBody = document.getElementById('chatbotBody');
                    if (response.type === 'history' && response.history && response.history.length > 0) {
                        response.history.forEach(msg => {
                            const existingMessage = document.querySelector(`.chatbot-message[data-id="${msg.id}"]`);
                            if (existingMessage) return;
                            lastMessageId = Math.max(lastMessageId, msg.id);
                            const timestamp = new Date(msg.created_at);
                            const formattedTime = timestamp.toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            if (msg.sender === 'user') {
                                chatbotBody.innerHTML += `<div class="chatbot-message user-message" data-id="${msg.id}"><strong>Bạn:</strong>${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                            } else if (msg.sender === 'admin') {
                                chatbotBody.innerHTML += `<div class="chatbot-message bot-message" data-id="${msg.id}"><strong>Admin:</strong>${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                            } else {
                                const senderClass = msg.sender === 'admin' ? 'admin-message' : 'bot-message';
                                const senderName = msg.sender === 'admin' ? 'Admin' : 'Bot';
                                chatbotBody.innerHTML += `<div class="chatbot-message ${senderClass}" data-id="${msg.id}"><strong>Bot:</strong>${escapeHtml(msg.message)}
                            <span class="message-timestamp">${formattedTime}</span></div>`;
                                if (msg.products && Array.isArray(msg.products)) {
                                    msg.products.forEach(product => {
                                        let sizeInfo = '';
                                        if (product.sizes && product.sizes.length > 0) {
                                            sizeInfo = '<p>Kích thước và số lượng:</p><ul>';
                                            product.sizes.forEach(size => {
                                                sizeInfo += `<li>${escapeHtml(size.size.toUpperCase())}: ${size.quantity}</li>`;
                                            });
                                            sizeInfo += '</ul>';
                                        } else if (product.quantity !== undefined && product.quantity !== null) {
                                            sizeInfo = `<p>Số lượng: ${product.quantity}</p>`;
                                        }
                                        const card = `
                                        <div class="product-card">
                                            <img src="/baocao/view/img/${product.image}" alt="${escapeHtml(product.name)}" title="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/80'">
                                            <div class="product-info">
                                                <h4>${escapeHtml(product.name)}</h4>
                                                <p>Thương hiệu: ${product.brand || 'Không có'}</p>
                                                <p>Giá: ${product.price || 'Không có'}</p>
                                                ${sizeInfo}
                                            </div>
                                        </div>`;
                                        chatbotBody.innerHTML += card;
                                    });
                                }
                            }
                        });
                        chatbotBody.scrollTop = chatbotBody.scrollHeight;
                        if (!isChatStarted) {
                            isChatStarted = true;
                            document.getElementById('chatbotInputContainer').style.display = 'block';
                            const startButton = document.querySelector('.start-button');
                            if (startButton) {
                                startButton.style.display = 'none';
                            }
                        }
                    }
                    checkConsultationStatus();
                },
                error: function(xhr, status, error) {
                    console.error('Lỗi kiểm tra tin nhắn mới:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                }
            });
        }

        function startChat() {
            if (isChatStarted) return;
            isChatStarted = true;
            const chatbotBody = document.getElementById('chatbotBody');
            const startButton = chatbotBody.querySelector('.start-button');
            if (startButton) {
                startButton.style.display = 'none';
            }
            document.getElementById('chatbotInputContainer').style.display = 'block';
            const botTimestamp = new Date().toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            chatbotBody.innerHTML = `<div class="chatbot-message bot-message">Chào bạn! Tôi có thể giúp gì? (Tìm sản phẩm, tra cứu đơn hàng, tư vấn)
        <span class="message-timestamp">${botTimestamp}</span></div>`;
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'start'
                }),
                success: function(response) {
                    const botTimestamp = new Date().toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    if (response.type === 'text' && response.message) {
                        chatbotBody.innerHTML = `
                        <div class="chatbot-message bot-message">
                            ${escapeHtml(response.message)}
                            <span class="message-timestamp">${botTimestamp}</span>
                        </div>`;
                        loadChatHistory();
                    }
                    checkConsultationStatus();
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                },
                error: function(xhr, status, error) {
                    console.error('Lỗi AJAX:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                    const botTimestamp = new Date().toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    chatbotBody.innerHTML += `
                    <div class="chatbot-message bot-message">
                        Lỗi kết nối: ${error}. Vui lòng thử lại!
                        <span class="message-timestamp">${botTimestamp}</span>
                    </div>`;
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                }
            });
        }

        function startConsultation() {
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    action: 'start_consultation'
                }),
                dataType: 'json',
                success: function(response) {
                    if (response.status === 'success') {
                        document.getElementById('consultBtn').style.display = 'none';
                        document.getElementById('endConsultationBtn').style.display = 'inline-block';
                        checkNewMessages();
                        alert(response.message);
                    } else {
                        alert(response.message || 'Đã xảy ra lỗi khi bắt đầu tư vấn');
                    }
                },
                error: function(xhr, status, error) {
                    alert('Đã xảy ra lỗi khi bắt đầu tư vấn');
                    console.error('Lỗi AJAX:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                }
            });
        }

        function sendMessage() {
            if (!isChatStarted) {
                alert('Vui lòng nhấn "Bắt đầu" để trò chuyện!');
                return;
            }
            const input = document.getElementById('chatbotInput');
            const message = input.value.trim();
            if (!message) return;
            input.value = '';
            $.ajax({
                url: '/baocao/chatbot',
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    message
                }),
                success: function(response) {
                    checkNewMessages();
                    setTimeout(checkConsultationStatus, 500);
                    const chatbotBody = document.getElementById('chatbotBody');
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                },
                error: function(xhr, status, error) {
                    console.error('Lỗi AJAX:', {
                        status,
                        error,
                        responseText: xhr.responseText
                    });
                    const botTimestamp = new Date().toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const chatbotBody = document.getElementById('chatbotBody');
                    chatbotBody.innerHTML += `<div class="chatbot-message bot-message">Lỗi kết nối: ${error}. Vui lòng thử lại!
                <span class="message-timestamp">${botTimestamp}</span></div>`;
                    chatbotBody.scrollTop = chatbotBody.scrollHeight;
                }
            });
        }

        $(document).ready(function() {
            // Chỉ gắn sự kiện click một lần
            $('#endConsultationBtn').off('click').on('click', endConsultation);
            $('#consultBtn').off('click').on('click', startConsultation);
            setInterval(checkNewMessages, 3000);
            if (isChatStarted) {
                loadChatHistory();
            }
        });
    </script>
</body>

</html>