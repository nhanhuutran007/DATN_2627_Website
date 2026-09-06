<?php
session_start();
require_once "../../model/config/connect.php";
require_once "xacThucAdmin.php";
// Sanitize and validate input functions
function sanitizeInput($input)
{
    global $conn;
    return $conn->real_escape_string(trim($input));
}

function validateSessionId($session_id)
{
    return preg_match('/^[a-zA-Z0-9_-]+$/', $session_id);
}

// Handle session keep-alive
if (isset($_GET['action']) && $_GET['action'] === 'keep_session') {
    try {
        $_SESSION['last_activity'] = time();
        echo json_encode(['status' => 'success', 'message' => 'Session refreshed']);
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'Session refresh failed']);
    }
    exit;
}

// Handle AJAX request to end consultation
if (isset($_POST['action']) && $_POST['action'] === 'end_consultation' && isset($_POST['session_id'])) {
    $session_id = sanitizeInput($_POST['session_id']);
    if (!validateSessionId($session_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid session ID']);
        exit;
    }
    try {
        $stmt = $conn->prepare("UPDATE messenger SET status = 'active' WHERE session_id = ? AND status = 'waiting_for_admin'");
        $stmt->bind_param("s", $session_id);
        if ($stmt->execute()) {
            session_start(); // Đảm bảo session được khởi tạo
            unset($_SESSION['admin_notification_sent']);
            echo json_encode(['status' => 'success', 'message' => 'Phiên tư vấn đã kết thúc']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Lỗi khi kết thúc phiên tư vấn']);
        }
    } catch (Exception $e) {
        error_log("Error ending consultation: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Lỗi khi kết thúc phiên tư vấn']);
    }
    exit;
}

// Handle AJAX request to delete chat session
if (isset($_GET['action']) && $_GET['action'] === 'delete_session' && isset($_GET['session_id'])) {
    $session_id = sanitizeInput($_GET['session_id']);
    if (!validateSessionId($session_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid session ID']);
        exit;
    }
    try {
        $conn->begin_transaction();
        $sql_delete_products = "DELETE mp FROM messenger_products mp 
                               JOIN messenger m ON mp.message_id = m.id 
                               WHERE m.session_id = ? AND m.status = 'waiting_for_admin'";
        $stmt_products = $conn->prepare($sql_delete_products);
        $stmt_products->bind_param("s", $session_id);
        $stmt_products->execute();
        $sql_delete_messages = "DELETE FROM messenger WHERE session_id = ? AND status = 'waiting_for_admin'";
        $stmt_messages = $conn->prepare($sql_delete_messages);
        $stmt_messages->bind_param("s", $session_id);
        $stmt_messages->execute();
        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Đoạn chat đã được xóa']);
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Error deleting session: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Lỗi khi xóa đoạn chat']);
    }
    exit;
}

// Handle AJAX request for chat sessions
if (isset($_GET['action']) && $_GET['action'] === 'get_sessions') {
    try {
        $sql_sessions = "SELECT DISTINCT m.session_id, MAX(m.created_at) as last_message_time, 
                            k.fullname, k.avatar, m.status 
                         FROM messenger m
                         LEFT JOIN khachhang k ON m.user_id = k.id_user 
                         WHERE m.session_id IS NOT NULL 
                         AND m.status = 'waiting_for_admin'
                         GROUP BY m.session_id 
                         ORDER BY last_message_time DESC LIMIT 50";
        $result_sessions = $conn->query($sql_sessions);
        $output = '';
        if ($result_sessions->num_rows > 0) {
            while ($row = $result_sessions->fetch_assoc()) {
                $session_id = $conn->real_escape_string($row['session_id']);
                $sql_latest = "SELECT m.*, k.fullname, k.avatar 
                               FROM messenger m 
                               LEFT JOIN khachhang k ON m.user_id = k.id_user 
                               WHERE m.session_id = ? 
                               AND m.status = 'waiting_for_admin'
                               ORDER BY m.created_at DESC LIMIT 1";
                $stmt_latest = $conn->prepare($sql_latest);
                $stmt_latest->bind_param("s", $session_id);
                $stmt_latest->execute();
                $result_latest = $stmt_latest->get_result();
                if ($result_latest->num_rows > 0) {
                    $latest = $result_latest->fetch_assoc();
                    $time_diff = time() - strtotime($latest['created_at']);
                    $time = $time_diff < 60 ? 'vừa xong' : ($time_diff < 3600 ? floor($time_diff / 60) . ' phút trước' : ($time_diff < 86400 ? floor($time_diff / 3600) . ' giờ trước' :
                        date('d/m/Y H:i', strtotime($latest['created_at']))));
                    $sender_name = !empty($latest['fullname']) ? htmlspecialchars($latest['fullname']) : 'Khách hàng';
                    $avatar = !empty($latest['avatar']) ? "/baocao/view/img/upload/avatar/" . htmlspecialchars($latest['avatar']) : "/baocao/view/img/upload/avatar/loginicon.png";
                    $preview_message = mb_strlen($latest['message'], 'UTF-8') > 30
                        ? mb_substr($latest['message'], 0, 20, 'UTF-8') . '...'
                        : htmlspecialchars($latest['message'], ENT_QUOTES, 'UTF-8');
                    $output .= '<div class="chat-item" data-session="' . htmlspecialchars($session_id) . '">';
                    $output .= '<div class="chat-avatar"><img src="' . $avatar . '" alt="Avatar"></div>';
                    $output .= '<div class="chat-info">';
                    $output .= '<div class="chat-name"><span>' . $sender_name . '</span><span class="chat-time float-end">' . $time . '</span></div>';
                    $output .= '<div class="chat-message"><span>' . $preview_message . '</span>';
                    $output .= '<button class="delete-chat-btn btn btn-sm btn-danger float-end ms-2" data-session="' . htmlspecialchars($session_id) . '"><i class="fas fa-trash"></i></button>';
                    $output .= '</div></div></div>';
                }
                $stmt_latest->close();
            }
        } else {
            $output = '<div class="p-3 text-center">Không có phiên tư vấn nào</div>';
        }
        echo $output;
    } catch (Exception $e) {
        error_log("Error fetching sessions: " . $e->getMessage());
        echo '<div class="p-3 text-center">Lỗi tải danh sách phiên tư vấn</div>';
    }
    exit;
}

// Handle AJAX request for messages
if (isset($_GET['action']) && $_GET['action'] === 'get_messages' && isset($_GET['session_id'])) {
    $session_id = sanitizeInput($_GET['session_id']);
    if (!validateSessionId($session_id)) {
        echo json_encode(['error' => 'Invalid session ID']);
        exit;
    }

    // Thêm tham số last_id để chỉ lấy tin nhắn mới
    $last_id = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;

    try {
        $sql = "SELECT m.*, k.fullname, k.avatar 
                FROM messenger m 
                LEFT JOIN khachhang k ON m.user_id = k.id_user 
                WHERE m.session_id = ? 
                AND m.status = 'waiting_for_admin'";

        // Nếu có last_id, chỉ lấy tin nhắn mới hơn
        if ($last_id > 0) {
            $sql .= " AND m.id > ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("si", $session_id, $last_id);
        } else {
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $session_id);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $messages = [];

        while ($row = $result->fetch_assoc()) {
            $sender_name = !empty($row['fullname']) ? htmlspecialchars($row['fullname']) : 'Khách hàng';
            if ($row['sender'] === 'admin') {
                $sender_name = 'Admin';
            } elseif ($row['sender'] === 'bot') {
                $sender_name = 'Bot';
            }

            $avatar = !empty($row['avatar']) ? "/baocao/view/img/upload/avatar/" . htmlspecialchars($row['avatar']) : "/baocao/view/img/upload/avatar/loginicon.png";
            if ($row['sender'] === 'bot') {
                $avatar = '/baocao/view/img/upload/avatar/loginicon.png';
            }

            $message = [
                'sender' => $row['sender'],
                'message' => htmlspecialchars($row['message']),
                'created_at' => $row['created_at'],
                'sender_name' => $sender_name,
                'avatar' => $avatar,
                'message_id' => $row['id'],
                'products' => []
            ];

            if ($row['sender'] === 'bot') {
                $product_sql = "SELECT * FROM messenger_products WHERE message_id = ?";
                $product_stmt = $conn->prepare($product_sql);
                $product_stmt->bind_param("i", $row['id']);
                $product_stmt->execute();
                $product_result = $product_stmt->get_result();

                while ($product = $product_result->fetch_assoc()) {
                    $product_data = [
                        'product_name' => htmlspecialchars($product['product_name']),
                        'code' => htmlspecialchars($product['code']),
                        'brand' => $product['brand'] ? htmlspecialchars($product['brand']) : 'Không có',
                        'price' => $product['price'] ? number_format($product['price'], 0, ',', '.') . ' VND' : 'Không có',
                        'image' => htmlspecialchars($product['image']),
                        'quantity' => $product['quantity'],
                        'sizes' => null
                    ];

                    if (!empty($product['sizes'])) {
                        $sizes = json_decode($product['sizes'], true);
                        if (is_array($sizes) && json_last_error() === JSON_ERROR_NONE) {
                            $product_data['sizes'] = $sizes;
                        }
                    }

                    $message['products'][] = $product_data;
                }

                $product_stmt->close();
            }

            $messages[] = $message;
        }

        $stmt->close();
        echo json_encode(['messages' => $messages]);
    } catch (Exception $e) {
        error_log("Error fetching messages: " . $e->getMessage());
        echo json_encode(['error' => 'Lỗi tải tin nhắn: ' . $e->getMessage()]);
    }
    exit;
}

// Handle sending new messages
if (isset($_POST['send_message']) && isset($_POST['message']) && isset($_POST['session_id'])) {
    $message = sanitizeInput($_POST['message']);
    $session_id = sanitizeInput($_POST['session_id']);
    if (!validateSessionId($session_id)) {
        echo "Invalid session ID";
        exit;
    }
    if (!empty($message)) {
        try {
            $stmt = $conn->prepare("INSERT INTO messenger (sender, session_id, message, status) VALUES ('admin', ?, ?, 'waiting_for_admin')");
            $stmt->bind_param("ss", $session_id, $message);
            if ($stmt->execute()) {
                header("Location: /baocao/admin_chat?session=" . urlencode($session_id));
                exit;
            } else {
                echo "Lỗi: " . $stmt->error;
            }
        } catch (Exception $e) {
            error_log("Error sending message: " . $e->getMessage());
            echo "Lỗi khi gửi tin nhắn";
        }
    }
}

// Prepare sessions list
try {
    $sql_sessions = "SELECT DISTINCT m.session_id, MAX(m.created_at) as last_message_time 
                     FROM messenger m
                     WHERE m.session_id IS NOT NULL 
                     AND m.status = 'waiting_for_admin'
                     GROUP BY m.session_id 
                     ORDER BY last_message_time DESC LIMIT 50";
    $result_sessions = $conn->query($sql_sessions);
    $current_session = filter_input(INPUT_GET, 'session', FILTER_SANITIZE_STRING);
    $messages = [];
    if (!empty($current_session)) {
        $stmt = $conn->prepare("SELECT m.*, k.fullname, k.avatar 
                                FROM messenger m 
                                LEFT JOIN khachhang k ON m.user_id = k.id_user 
                                WHERE m.session_id = ? 
                                AND m.status = 'waiting_for_admin'
                                ORDER BY m.created_at ASC");
        $stmt->bind_param("s", $current_session);
        $stmt->execute();
        $result_messages = $stmt->get_result();
        while ($row = $result_messages->fetch_assoc()) {
            $messages[] = $row;
        }
        $stmt->close();
    }
} catch (Exception $e) {
    error_log("Error preparing sessions: " . $e->getMessage());
    $result_sessions = null;
    $current_session = null;
    $messages = [];
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản lý chat - Admin Panel</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="nhắn tin, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <link rel="stylesheet" href="/baocao/view/css/admin_chat.css">
</head>

<body>
    <?php include "sidebar.php"; ?>
    <div class="main-content">
        <div class="chat-container">
            <!-- Chat Sidebar -->
            <div class="chat-sidebar">
                <div class="chat-header">
                    <h2>Đoạn chat</h2>
                    <div class="header-icons">
                        <i class="fas fa-bars sidebar-togggle"></i> <!-- Thêm nút toggle này -->
                    </div>
                </div>
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Tìm kiếm phiên chat" autocomplete="off">
                </div>
                <div class="chat-list" id="chatList">
                    <?php
                    if ($result_sessions && $result_sessions->num_rows > 0) {
                        while ($row = $result_sessions->fetch_assoc()) {
                            $session_id = $conn->real_escape_string($row['session_id']);
                            $sql_customer = "SELECT k.fullname, k.avatar 
                                            FROM messenger m 
                                            JOIN khachhang k ON m.user_id = k.id_user 
                                            WHERE m.session_id = ? AND m.sender = 'user' 
                                            LIMIT 1";
                            $stmt_customer = $conn->prepare($sql_customer);
                            $stmt_customer->bind_param("s", $session_id);
                            $stmt_customer->execute();
                            $result_customer = $stmt_customer->get_result();
                            $customer = $result_customer->num_rows > 0 ? $result_customer->fetch_assoc() : null;
                            $stmt_customer->close();
                            $sql_latest = "SELECT * FROM messenger 
                                           WHERE session_id = ? 
                                           AND status = 'waiting_for_admin'
                                           ORDER BY created_at DESC LIMIT 1";
                            $stmt_latest = $conn->prepare($sql_latest);
                            $stmt_latest->bind_param("s", $session_id);
                            $stmt_latest->execute();
                            $result_latest = $stmt_latest->get_result();
                            $latest = $result_latest->num_rows > 0 ? $result_latest->fetch_assoc() : null;
                            $stmt_latest->close();
                            if ($latest) {
                                $time_diff = time() - strtotime($latest['created_at']);
                                $time = $time_diff < 60 ? 'vừa xong' : ($time_diff < 3600 ? floor($time_diff / 60) . ' phút trước' : ($time_diff < 86400 ? floor($time_diff / 3600) . ' giờ trước' :
                                    date('d/m/Y H:i', strtotime($latest['created_at']))));
                                $sender_name = $customer && !empty($customer['fullname'])
                                    ? htmlspecialchars($customer['fullname'])
                                    : 'Khách hàng';
                                $avatar = $customer && !empty($customer['avatar'])
                                    ? "/baocao/view/img/upload/avatar/" . htmlspecialchars($customer['avatar'])
                                    : "/baocao/view/img/upload/avatar/loginicon.png";
                                $preview_message = mb_strlen($latest['message'], 'UTF-8') > 30
                                    ? mb_substr($latest['message'], 0, 20, 'UTF-8') . '...'
                                    : htmlspecialchars($latest['message'], ENT_QUOTES, 'UTF-8');
                                $active_class = ($current_session == $session_id) ? 'active' : '';
                                echo '<div class="chat-item ' . $active_class . '" data-session="' . htmlspecialchars($session_id) . '">';
                                echo '<div class="chat-avatar"><img src="' . $avatar . '" alt="Avatar"></div>';
                                echo '<div class="chat-info">';
                                echo '<div class="chat-name"><span>' . $sender_name . '</span><span class="chat-time float-end">' . $time . '</span></div>';
                                echo '<div class="chat-message"><span>' . $preview_message . '</span>';
                                echo '<button class="delete-chat-btn btn btn-sm btn-danger float-end ms-2" data-session="' . htmlspecialchars($session_id) . '"><i class="fas fa-trash"></i></button>';
                                echo '</div></div></div>';
                            }
                        }
                    } else {
                        echo '<div class="p-3 text-center">Không có phiên tư vấn nào</div>';
                    }
                    ?>
                </div>
            </div>

            <!-- Main Chat Area -->
            <div class="chat-main">
                <?php if (!empty($current_session)): ?>
                    <?php
                    try {
                        $sql_sessions = "SELECT DISTINCT m.session_id, MAX(m.created_at) as last_message_time 
                    FROM messenger m
                    WHERE m.session_id IS NOT NULL 
                    AND m.status = 'waiting_for_admin'
                    GROUP BY m.session_id 
                    ORDER BY last_message_time DESC LIMIT 50";
                        $result_sessions = $conn->query($sql_sessions);
                        $current_session = filter_input(INPUT_GET, 'session', FILTER_SANITIZE_STRING);
                        $messages = [];
                        $user_info = null;

                        if (!empty($current_session)) {
                            // Lấy thông tin khách hàng
                            $stmt = $conn->prepare("SELECT k.fullname, k.avatar 
                               FROM messenger m 
                               LEFT JOIN khachhang k ON m.user_id = k.id_user 
                               WHERE m.session_id = ? AND m.sender = 'user' 
                               ORDER BY m.created_at ASC 
                               LIMIT 1");
                            $stmt->bind_param("s", $current_session);
                            $stmt->execute();
                            $result_user = $stmt->get_result();
                            if ($result_user->num_rows > 0) {
                                $user_info = $result_user->fetch_assoc();
                            }
                            $stmt->close();

                            // Lấy tin nhắn
                            $stmt = $conn->prepare("SELECT m.*, k.fullname, k.avatar 
                               FROM messenger m 
                               LEFT JOIN khachhang k ON m.user_id = k.id_user 
                               WHERE m.session_id = ? 
                               AND m.status = 'waiting_for_admin'
                               ORDER BY m.created_at ASC");
                            $stmt->bind_param("s", $current_session);
                            $stmt->execute();
                            $result_messages = $stmt->get_result();
                            while ($row = $result_messages->fetch_assoc()) {
                                $messages[] = $row;
                            }
                            $stmt->close();
                        }
                    } catch (Exception $e) {
                        error_log("Error preparing sessions: " . $e->getMessage());
                        $result_sessions = null;
                        $current_session = null;
                        $messages = [];
                        $user_info = null;
                    }
                    ?>
                    <div class="chat-main-header">
                        <i class="fas fa-arrow-left back-to-list"></i>
                        <div class="chat-avatar">
                            <img src="<?php echo (!empty($user_info['avatar'])) ? '/baocao/view/img/upload/avatar/' . htmlspecialchars($user_info['avatar']) : '/baocao/view/img/upload/avatar/loginicon.png'; ?>" alt="Avatar">
                        </div>
                        <div class="chat-main-info">
                            <div class="chat-main-name">
                                <?php echo $user_info ? htmlspecialchars($user_info['fullname']) : 'Khách hàng'; ?>
                            </div>
                        </div>
                        <button class="btn btn-success end-consultation-btn" data-session="<?php echo htmlspecialchars($current_session); ?>">Kết thúc tư vấn</button>
                    </div>

                    <div class="chat-messages" id="chatMessages">
                        <?php
                        $current_date = '';
                        $lastMessageId = 0;
                        foreach ($messages as $msg) {
                            $lastMessageId = max($lastMessageId, $msg['id']);
                            $msg_date = date('Y-m-d', strtotime($msg['created_at']));
                            $msg_time = date('H:i', strtotime($msg['created_at']));
                            if ($current_date != $msg_date) {
                                echo '<div class="time-separator"><span>' . date('d/m/Y', strtotime($msg['created_at'])) . '</span></div>';
                                $current_date = $msg_date;
                            }
                            $message_class = $msg['sender'] === 'user' ? 'message-received' : ($msg['sender'] === 'admin' ? 'message-admin' : 'message-bot');
                            $sender_name = $msg['sender'] === 'admin' ? 'Admin' : ($msg['sender'] === 'bot' ? 'Bot' : (!empty($msg['fullname']) ? htmlspecialchars($msg['fullname']) : 'Khách hàng'));
                            $avatar = $msg['sender'] === 'bot' ? '/baocao/view/img/upload/avatar/loginicon.png' : (!empty($msg['avatar']) ? '/baocao/view/img/upload/avatar/' . htmlspecialchars($msg['avatar']) : '/baocao/view/img/upload/avatar/loginicon.png');
                            echo '<div class="message ' . $message_class . '" data-message-id="' . $msg['id'] . '">';
                            echo '<div class="message-content">';
                            echo '<div class="message-header">';
                            if ($msg['sender'] !== 'admin') {
                                echo '<img src="' . $avatar . '" alt="Avatar" class="message-avatar">';
                            }
                            echo '<span class="message-sender">' . $sender_name . '</span>';
                            echo '</div>';
                            echo '<p>' . nl2br(htmlspecialchars($msg['message'])) . '</p>';
                            if ($msg['sender'] === 'bot') {
                                $message_id = $msg['id'];
                                $stmt_products = $conn->prepare("SELECT * FROM messenger_products WHERE message_id = ?");
                                $stmt_products->bind_param("i", $message_id);
                                $stmt_products->execute();
                                $result_products = $stmt_products->get_result();
                                while ($product = $result_products->fetch_assoc()) {
                                    echo '<div class="product-card">';
                                    echo '<img src="' . htmlspecialchars($product['image']) . '" alt="' . htmlspecialchars($product['product_name']) . '" >';
                                    echo '<div class="product-info">';
                                    echo '<h4>' . htmlspecialchars($product['product_name']) . '</h4>';
                                    echo '<p>Thương hiệu: ' . ($product['brand'] ? htmlspecialchars($product['brand']) : 'Không có') . '</p>';
                                    echo '<p>Giá: ' . ($product['price'] ? number_format($product['price'], 0, ',', '.') . ' VND' : 'Không có') . '</p>';
                                    if (!empty($product['sizes'])) {
                                        $sizes = json_decode($product['sizes'], true);
                                        if (is_array($sizes) && json_last_error() === JSON_ERROR_NONE) {
                                            echo '<p>Kích thước và số lượng:</p><ul>';
                                            foreach ($sizes as $size) {
                                                echo '<li>' . htmlspecialchars($size['size']) . ': ' . htmlspecialchars($size['quantity']) . '</li>';
                                            }
                                            echo '</ul>';
                                        } else {
                                            error_log("Lỗi decode JSON sizes cho product_id {$product['message_id']}");
                                        }
                                    } elseif ($product['quantity'] !== null) {
                                        echo '<p>Số lượng: ' . htmlspecialchars($product['quantity']) . '</p>';
                                    }
                                    echo '</div></div>';
                                }
                                $stmt_products->close();
                            }
                            echo '<small class="text-muted d-block text-end">' . $msg_time . '</small>';
                            echo '</div></div>';
                        }
                        ?>
                    </div>

                    <div class="chat-reply">
                        <form method="post" action="" id="chat-form">
                            <div class="reply-input">
                                <input type="hidden" name="session_id" value="<?php echo htmlspecialchars($current_session); ?>">
                                <input type="text" name="message" id="message-input" placeholder="Nhập tin nhắn..." autocomplete="off" required>
                                <button type="submit" name="send_message" class="send-button">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </form>
                    </div>
                <?php else: ?>
                    <div class="no-session-selected">
                        <div class="text-center">
                            <i class="fas fa-comments fa-3x mb-3"></i>
                            <p>Chọn một phiên chat để bắt đầu</p>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <div class="chat-reply">
            <form method="post" action="" id="chat-form">
                <div class="reply-input">
                    <input type="hidden" name="session_id" value="<?php echo htmlspecialchars($current_session); ?>">
                    <input type="text" name="message" id="message-input" placeholder="Nhập tin nhắn..." autocomplete="off" required>
                    <button type="submit" name="send_message" class="send-button">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            $('.sidebar-togggle').click(function() {
                if (window.innerWidth <= 767) {
                    $('.chat-sidebar').toggleClass('active');
                    $('body').toggleClass('sidebar-open');
                } else {
                    $('.chat-sidebar').toggleClass('collapsed');
                }
                const isCollapsed = $('.chat-sidebar').hasClass('collapsed');
                const isActive = $('.chat-sidebar').hasClass('active');
                localStorage.setItem('chatSidebarCollapsed', isCollapsed);
                localStorage.setItem('chatSidebarActive', isActive);
            });

            if (window.innerWidth <= 767 && localStorage.getItem('chatSidebarActive') === 'true') {
                $('.chat-sidebar').addClass('active');
                $('body').addClass('sidebar-open');
            } else if (window.innerWidth > 767 && localStorage.getItem('chatSidebarCollapsed') === 'true') {
                $('.chat-sidebar').addClass('collapsed');
            }

            let lastMessageId = <?php echo !empty($lastMessageId) ? $lastMessageId : 0; ?>;

            function scrollToBottom() {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
            scrollToBottom();

            document.addEventListener('touchstart', function(e) {
                if (e.target.closest('.chat-item') && !e.target.closest('.delete-chat-btn')) {
                    e.preventDefault();
                    const sessionId = e.target.closest('.chat-item').dataset.session;
                    handleChatItemClick(sessionId);
                }
            }, {
                passive: false
            });

            document.addEventListener('click', function(e) {
                if (e.target.closest('.chat-item') && !e.target.closest('.delete-chat-btn')) {
                    const sessionId = e.target.closest('.chat-item').dataset.session;
                    handleChatItemClick(sessionId);
                }
            });

            function handleChatItemClick(sessionId) {
                if (window.innerWidth <= 767) {
                    $('.chat-sidebar').removeClass('active').css('transform', 'translateX(-100%)');
                    $('.chat-main').addClass('active').css('transform', 'translateX(0)');
                    $('body').removeClass('sidebar-open');
                    history.pushState({}, '', '/baocao/admin_chat?session=' + encodeURIComponent(sessionId));

                    // Cập nhật ngay tiêu đề chat từ .chat-item
                    const $chatItem = $(`.chat-item[data-session="${sessionId}"]`);
                    if ($chatItem.length) {
                        const senderName = $chatItem.find('.chat-name span:first-child').text();
                        const avatar = $chatItem.find('.chat-avatar img').attr('src');
                        $('.chat-main-header .chat-main-name').text(senderName);
                        $('.chat-main-header .chat-avatar img').attr('src', avatar);
                        $('.end-consultation-btn').data('session', sessionId);
                    }

                    loadMessages(sessionId);
                    $('.chat-item').removeClass('active');
                    $(`.chat-item[data-session="${sessionId}"]`).addClass('active');
                } else {
                    window.location.href = '/baocao/admin_chat?session=' + encodeURIComponent(sessionId);
                }
            }

            $('#searchInput').on('input', function() {
                const searchTerm = $(this).val().toLowerCase();
                $('.chat-item').each(function() {
                    const chatName = $(this).find('.chat-name span:first-child').text().toLowerCase();
                    const chatMessage = $(this).find('.chat-message span').text().toLowerCase();
                    $(this).toggle(chatName.includes(searchTerm) || chatMessage.includes(searchTerm));
                });
            });

            $(document).on('click', '.delete-chat-btn', function(e) {
                e.stopPropagation();
                const sessionId = $(this).data('session');
                if (confirm('Bạn có chắc chắn muốn xóa phiên chat này?')) {
                    $.ajax({
                        url: '/baocao/admin_chat',
                        type: 'GET',
                        data: {
                            'action': 'delete_session',
                            'session_id': sessionId
                        },
                        dataType: 'json',
                        success: function(response) {
                            if (response.status === 'success') {
                                const currentSession = new URLSearchParams(window.location.search).get('session');
                                if (currentSession === sessionId) {
                                    window.location.href = '/baocao/admin_chat';
                                } else {
                                    $(`.chat-item[data-session="${sessionId}"]`).remove();
                                }
                                alert(response.message);
                            } else {
                                alert(response.message || 'Đã xảy ra lỗi khi xóa phiên chat');
                            }
                        },
                        error: function() {
                            alert('Đã xảy ra lỗi khi xóa phiên chat');
                        }
                    });
                }
            });

            function loadMessages(sessionId) {
                $.ajax({
                    url: '/baocao/admin_chat',
                    type: 'GET',
                    data: {
                        'action': 'get_messages',
                        'session_id': sessionId
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.error) {
                            $('#chatMessages').html('<div class="p-3 text-center">Lỗi tải tin nhắn</div>');
                            return;
                        }
                        let current_date = '';
                        let html = '';
                        if (response.messages && response.messages.length > 0) {
                            response.messages.forEach(function(msg) {
                                lastMessageId = Math.max(lastMessageId, msg.message_id);
                                const msg_date = new Date(msg.created_at).toISOString().split('T')[0];
                                const msg_time = new Date(msg.created_at).toTimeString().substr(0, 5);
                                if (current_date !== msg_date) {
                                    const formattedDate = new Date(msg.created_at).toLocaleDateString('vi-VN');
                                    html += `<div class="time-separator"><span>${formattedDate}</span></div>`;
                                    current_date = msg_date;
                                }
                                let messageClass = msg.sender === 'admin' ? 'message-admin' : (msg.sender === 'bot' ? 'message-bot' : 'message-received');
                                html += `
                                <div class="message ${messageClass}" data-message-id="${msg.message_id}">
                                    <div class="message-content">
                                        <div class="message-header">`;
                                if (msg.sender !== 'admin') {
                                    html += `<img src="${msg.avatar}" alt="Avatar" class="message-avatar">`;
                                }
                                html += `
                                        <span class="message-sender">${msg.sender_name}</span>
                                    </div>
                                    <p>${msg.message.replace(/\n/g, '<br>')}</p>`;
                                if (msg.sender === 'bot' && msg.products && msg.products.length > 0) {
                                    msg.products.forEach(function(product) {
                                        html += `<div class="product-card">
                                        <img src="${product.image}" alt="${product.product_name}" >
                                        <div class="product-info">
                                            <h4>${product.product_name}</h4>
                                            <p>Thương hiệu: ${product.brand}</p>
                                            <p>Giá: ${product.price}</p>`;
                                        if (product.sizes) {
                                            html += `<p>Kích thước và số lượng:</p><ul>`;
                                            product.sizes.forEach(function(size) {
                                                html += `<li>${size.size}: ${size.quantity}</li>`;
                                            });
                                            html += `</ul>`;
                                        } else if (product.quantity !== null) {
                                            html += `<p>Số lượng: ${product.quantity}</p>`;
                                        }
                                        html += `</div></div>`;
                                    });
                                }
                                html += `<small class="text-muted d-block text-end">${msg_time}</small>
                                    </div>
                                </div>`;
                            });
                        } else {
                            html = '<div class="p-3 text-center">Không có tin nhắn</div>';
                        }
                        $('#chatMessages').html(html);
                        scrollToBottom();
                    },
                    error: function() {
                        $('#chatMessages').html('<div class="p-3 text-center">Lỗi tải tin nhắn</div>');
                    }
                });
            }

            function refreshChatList() {
                $.ajax({
                    url: '/baocao/admin_chat',
                    type: 'GET',
                    data: {
                        'action': 'get_sessions'
                    },
                    success: function(html) {
                        const $newChatList = $(html);
                        const $currentChatList = $('#chatList');
                        const currentSession = new URLSearchParams(window.location.search).get('session');
                        const currentSessions = new Set();
                        $currentChatList.find('.chat-item').each(function() {
                            currentSessions.add($(this).data('session'));
                        });
                        $newChatList.each(function() {
                            const $newItem = $(this);
                            const sessionId = $newItem.data('session');
                            if (sessionId) {
                                if (currentSessions.has(sessionId)) {
                                    const $existingItem = $currentChatList.find(`.chat-item[data-session="${sessionId}"]`);
                                    $existingItem.find('.chat-time').text($newItem.find('.chat-time').text());
                                    $existingItem.find('.chat-message span').text($newItem.find('.chat-message span').text());
                                } else {
                                    $currentChatList.append($newItem);
                                }
                                currentSessions.delete(sessionId);
                            }
                        });
                        currentSessions.forEach(sessionId => {
                            $currentChatList.find(`.chat-item[data-session="${sessionId}"]`).remove();
                        });
                        if (currentSession) {
                            $currentChatList.find('.chat-item').removeClass('active');
                            $currentChatList.find(`.chat-item[data-session="${currentSession}"]`).addClass('active');
                        }
                        if (currentSession && $currentChatList.find(`.chat-item[data-session="${currentSession}"]`).length === 0) {
                            window.location.href = '/baocao/admin_chat';
                        }
                    },
                    error: function() {
                        console.error('Lỗi khi làm mới danh sách chat');
                    }
                });
            }

            function checkNewMessages() {
                const currentSession = new URLSearchParams(window.location.search).get('session');
                if (!currentSession) return;
                $.ajax({
                    url: '/baocao/admin_chat',
                    type: 'GET',
                    data: {
                        'action': 'get_messages',
                        'session_id': currentSession,
                        'last_id': lastMessageId
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.error) {
                            console.error(response.error);
                            return;
                        }
                        if (response.messages && response.messages.length > 0) {
                            let current_date = '';
                            const chatMessages = $('#chatMessages');
                            response.messages.forEach(function(msg) {
                                if (msg.message_id > lastMessageId) {
                                    lastMessageId = msg.message_id;
                                }
                                if (chatMessages.find(`.message[data-message-id="${msg.message_id}"]`).length) {
                                    return;
                                }
                                const msg_date = new Date(msg.created_at).toISOString().split('T')[0];
                                const msg_time = new Date(msg.created_at).toTimeString().substr(0, 5);
                                if (current_date !== msg_date) {
                                    const formattedDate = new Date(msg.created_at).toLocaleDateString('vi-VN');
                                    chatMessages.append(`<div class="time-separator"><span>${formattedDate}</span></div>`);
                                    current_date = msg_date;
                                }
                                let messageClass = 'message-received';
                                if (msg.sender === 'admin') {
                                    messageClass = 'message-admin';
                                } else if (msg.sender === 'bot') {
                                    messageClass = 'message-bot';
                                }
                                let messageHTML = `
                                <div class="message ${messageClass}" data-message-id="${msg.message_id}">
                                    <div class="message-content">
                                        <div class="message-header">`;
                                if (msg.sender !== 'admin') {
                                    messageHTML += `<img src="${msg.avatar}" alt="Avatar" class="message-avatar">`;
                                }
                                messageHTML += `<span class="message-sender">${msg.sender_name}</span>
                                        </div>
                                        <p>${msg.message.replace(/\n/g, '<br>')}</p>`;
                                if (msg.sender === 'bot' && msg.products && msg.products.length > 0) {
                                    msg.products.forEach(function(product) {
                                        messageHTML += `<div class="product-card">
                                        <img src="${product.image}" alt="${product.product_name}" >
                                        <div class="product-info">
                                            <h4>${product.product_name}</h4>
                                            <p>Thương hiệu: ${product.brand}</p>
                                            <p>Mã: ${product.code}</p>
                                            <p>Giá: ${product.price}</p>`;
                                        if (product.sizes) {
                                            messageHTML += `<p>Kích thước và số lượng:</p><ul>`;
                                            product.sizes.forEach(function(size) {
                                                messageHTML += `<li>${size.size}: ${size.quantity}</li>`;
                                            });
                                            messageHTML += `</ul>`;
                                        } else if (product.quantity !== null) {
                                            messageHTML += `<p>Số lượng: ${product.quantity}</p>`;
                                        }
                                        messageHTML += `</div></div>`;
                                    });
                                }
                                messageHTML += `<small class="text-muted d-block text-end">${msg_time}</small>
                                    </div>
                                </div>`;
                                chatMessages.append(messageHTML);
                            });
                            scrollToBottom();
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Error fetching new messages:', error);
                    }
                });
            }

            $('.end-consultation-btn').click(function() {
                if (confirm('Bạn có chắc chắn muốn kết thúc phiên tư vấn này?')) {
                    const sessionId = $(this).data('session');
                    $.ajax({
                        url: '/baocao/admin_chat',
                        type: 'POST',
                        data: {
                            'action': 'end_consultation',
                            'session_id': sessionId
                        },
                        dataType: 'json',
                        success: function(response) {
                            if (response.status === 'success') {
                                alert(response.message);
                                window.location.href = '/baocao/admin_chat';
                            } else {
                                alert(response.message || 'Đã xảy ra lỗi khi kết thúc phiên tư vấn');
                            }
                        },
                        error: function() {
                            alert('Đã xảy ra lỗi khi kết thúc phiên tư vấn');
                        }
                    });
                }
            });

            $('#chat-form').submit(function(e) {
                const messageInput = $('#message-input');
                if (!messageInput.val().trim()) {
                    e.preventDefault();
                    return false;
                }
            });

            function keepSessionAlive() {
                $.ajax({
                    url: '/baocao/admin_chat',
                    type: 'GET',
                    data: {
                        'action': 'keep_session'
                    },
                    dataType: 'json'
                });
            }

            const refreshIntervals = {
                chatList: setInterval(refreshChatList, 3000),
                newMessages: setInterval(checkNewMessages, 3000),
                sessionKeepAlive: setInterval(keepSessionAlive, 300000)
            };

            checkNewMessages();

            $(window).on('beforeunload', function() {
                for (const key in refreshIntervals) {
                    clearInterval(refreshIntervals[key]);
                }
            });

            function restoreInterface() {
                if (window.innerWidth > 767) {
                    $('.chat-sidebar').removeClass('active').css('transform', 'translateX(0)').show();
                    $('.chat-main').removeClass('active').css('transform', 'translateX(0)').show();
                    $('body').removeClass('sidebar-open');
                    refreshChatList();
                } else {
                    const currentSession = new URLSearchParams(window.location.search).get('session');
                    if (currentSession) {
                        $('.chat-sidebar').removeClass('active').css('transform', 'translateX(-100%)');
                        $('.chat-main').addClass('active').css('transform', 'translateX(0)');
                    } else {
                        $('.chat-sidebar').addClass('active').css('transform', 'translateX(0)');
                        $('.chat-main').removeClass('active').css('transform', 'translateX(100%)');
                    }
                }
            }

            $(window).on('resize', function() {
                restoreInterface();
            });

            restoreInterface();

            $(document).on('click', '.back-to-list', function(e) {
                e.preventDefault();
                $('.chat-main').removeClass('active').css('transform', 'translateX(100%)');
                $('.chat-sidebar').addClass('active').css('transform', 'translateX(0)');
                history.pushState({}, '', '/baocao/admin_chat');
                $('body').removeClass('sidebar-open');
            });

            const currentSession = new URLSearchParams(window.location.search).get('session');
            if (window.innerWidth <= 767 && currentSession) {
                $('.chat-sidebar').removeClass('active').css('transform', 'translateX(-100%)');
                $('.chat-main').addClass('active').css('transform', 'translateX(0)');
                $(`.chat-item[data-session="${currentSession}"]`).addClass('active');
                loadMessages(currentSession);
            }
        });
    </script>
</body>

</html>