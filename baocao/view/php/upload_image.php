<?php
// Đường dẫn thư mục lưu trữ hình ảnh
// $upload_dir = '/baocao/view/img/upload/news/';
// $base_url = '/baocao/view/img/upload/news/'; 
$upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/baocao/view/img/upload/news/';
$base_url = '/baocao/view/img/upload/news/';


// Kiểm tra file được gửi lên
if (isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $filename = $file['name'];
    $ext = pathinfo($filename, PATHINFO_EXTENSION);

    // Tạo tên file duy nhất để tránh trùng lặp
    $new_filename = uniqid() . '.' . $ext;
    $destination = $upload_dir . $new_filename;

    // Di chuyển file đến thư mục đích
    if (move_uploaded_file($file['tmp_name'], $destination)) {
        // Trả về URL hình ảnh cho TinyMCE
        echo json_encode(['location' => $base_url . $new_filename]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Không thể lưu file.']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Không có file được gửi lên.']);
}
