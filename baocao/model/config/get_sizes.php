<?php
include "connect.php";

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $table_name = $_POST['table_name'] ?? '';
    $product_name = $_POST['product_name'] ?? '';

    if (empty($table_name) || empty($product_name)) {
        echo json_encode(['success' => false, 'message' => 'Thiếu thông tin sản phẩm hoặc bảng']);
        exit;
    }

    // Xác định bảng size tương ứng
    $size_table = in_array($table_name, [
        'giaybongro',
        'giaybongda',
        'giaybongchuyen',
        'giaycaulong',
        'giaychaybo',
        'giaypickleball',
        'giaytapgym'
    ]) ? 'sizegiay' : 'sizequanao';

    // Truy vấn kích thước từ bảng sizegiay hoặc sizequanao
    $query = "SELECT DISTINCT size FROM `$size_table` 
              WHERE table_name = ? AND name_product = ? AND quantity > 0 ";

    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, 'ss', $table_name, $product_name);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $sizes = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $sizes[] = $row['size'];
    }

    if (empty($sizes)) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy kích thước khả dụng']);
    } else {
        echo json_encode(['success' => true, 'sizes' => $sizes]);
    }

    mysqli_stmt_close($stmt);
    mysqli_close($conn);
} else {
    echo json_encode(['success' => false, 'message' => 'Phương thức không được hỗ trợ']);
}
