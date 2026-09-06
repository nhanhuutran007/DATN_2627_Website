<?php
include "../../model/config/connect.php";
// Initialize variables
session_start();
require_once "xacThucAdmin.php";

$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);
$error_msg = '';
$parent_tables = [];
$child_tables = [];

// Get list of parent tables (main categories)
$parent_query = "SELECT topic_id, topic FROM sanpham";
$parent_result = mysqli_query($conn, $parent_query);
while ($row = mysqli_fetch_assoc($parent_result)) {
    $parent_tables[$row['topic_id']] = $row['topic'];
}

// Handle AJAX request to get child categories
if (isset($_GET['parent_id'])) {
    $parent_id = intval($_GET['parent_id']);

    // Map between parent_id and corresponding child tables
    $table_mapping = [
        1 => ['quanaobongro', 'giaybongro', 'phukienbongro', 'quabongro'], // Basketball
        2 => ['quanaobongchuyen', 'giaybongchuyen', 'phukienbongchuyen', 'quabongchuyen'], // Volleyball
        3 => ['quanaobongda', 'giaybongda', 'phukienbongda', 'quabongda'], // Soccer
        4 => ['quanaogym', 'giaytapgym', 'phukiengym'], // Gym
        5 => ['quanaochaybo', 'giaychaybo', 'phukienchaybo'], // Running
        6 => ['quanaocaulong', 'giaycaulong', 'phukiencaulong', 'votcaulong', 'cauthidau'], // Badminton
        7 => ['aobia', 'gaybia', 'phukienbia'], // Billiards
        8 => ['votpickleball', 'giaypickleball', 'phukienpick'] // Pickleball
    ];

    $child_tables = $table_mapping[$parent_id] ?? [];

    header('Content-Type: application/json');
    echo json_encode($child_tables);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chỉnh Sửa Sản Phẩm</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="thêm sản phẩm, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/add_product.css">
    <!-- Thêm TinyMCE CDN -->
    <script src="https://cdn.tiny.cloud/1/74ye4k5vaazwaxu37ena5dnjquo46ifrutydgjwlm5dr3mco/tinymce/7/tinymce.min.js" referrerpolicy="origin"></script>
    <script>
        tinymce.init({
            selector: '.tinymce', // Áp dụng cho các textarea có class tinymce
            plugins: [
                'autolink', 'charmap', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                'formatpainter', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable',
                'editimage', 'typography', 'inlinecss', 'markdown', 'preview'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | link image media table | spellcheckdialog a11ycheck | numlist bullist indent outdent | emoticons charmap | removeformat | preview',
            images_upload_url: '/baocao/upload_image',
            image_caption: true,
            file_picker_types: 'image',
            automatic_uploads: true,
            valid_elements: '*[*]',
            extended_valid_elements: 'img[src|alt|width|height],figure,figcaption',
            entity_encoding: 'raw',
            convert_urls: false,
            height: 300, // Chiều cao phù hợp cho mô tả sản phẩm
            ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
        });
    </script>
</head>

<body>
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Thông báo khi ấn nút -->
        <?php if (!empty($success_msg)): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <?php echo $success_msg; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <?php if (!empty($error_msg)): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                <?php echo $error_msg; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <!-- Add product form -->
        <div class="row justify-content-center">
            <div class="col-lg-8 col-md-10">
                <div class="card">
                    <div class="card-body">
                        <h3 class="section-title">Thêm Sản Phẩm Mới</h3>
                        <form action="/baocao/user/submit" method="POST" enctype="multipart/form-data">
                            <!-- Sport type dropdown -->
                            <div class="mb-3">
                                <label class="form-label">Loại thể thao <span class="text-danger">*</span></label>
                                <select name="parent_id" id="parentSelect" class="form-select" required>
                                    <option value="">-- Chọn loại thể thao --</option>
                                    <?php foreach ($parent_tables as $id => $topic): ?>
                                        <option value="<?php echo $id; ?>"><?php echo $topic; ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <!-- Product category dropdown -->
                            <div class="mb-3">
                                <label class="form-label">Danh mục sản phẩm <span class="text-danger">*</span></label>
                                <select name="table" id="childSelect" class="form-select" required disabled>
                                    <option value="">-- Chọn loại thể thao trước --</option>
                                </select>
                            </div>

                            <!-- Product name -->
                            <div class="mb-3">
                                <label class="form-label">Tên Sản Phẩm <span class="text-danger">*</span></label>
                                <input type="text" name="name_product" class="form-control" required
                                    value="<?php echo htmlspecialchars($_POST['name_product'] ?? ''); ?>"
                                    placeholder="Nhập tên sản phẩm">
                            </div>

                            <!-- Product image -->
                            <div class="mb-3">
                                <label class="form-label">Hình Ảnh <span class="text-danger">*</span></label>
                                <input type="file" name="hinhanh" class="form-control" required accept="image/*">
                                <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hình Ảnh Phụ 1</label>
                                <input type="file" name="hinhanh2" class="form-control" accept="image/*">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hình Ảnh Phụ 2</label>
                                <input type="file" name="hinhanh3" class="form-control" accept="image/*">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hình Ảnh Phụ 3</label>
                                <input type="file" name="hinhanh4" class="form-control" accept="image/*">
                            </div>

                            <!-- Brand and quantity -->
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Thương hiệu</label>
                                        <input type="text" name="brand" class="form-control"
                                            value="<?php echo htmlspecialchars($_POST['brand'] ?? ''); ?>"
                                            placeholder="Nhập thương hiệu">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Số lượng tổng</label>
                                        <input type="number" name="quantity" class="form-control"
                                            value="<?php echo htmlspecialchars($_POST['quantity'] ?? ''); ?>"
                                            min="1" placeholder="Tổng số lượng" id="totalQuantityInput">
                                    </div>
                                </div>
                            </div>

                            <!-- Price and original price -->
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Giá bán <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <span class="input-group-text">đ</span>
                                            <input type="text" name="price" class="form-control price-input" required
                                                oninput="formatPrice(this)"
                                                placeholder="Nhập giá bán">
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Giá gốc <span class="text-danger"></span></label>
                                        <div class="input-group">
                                            <span class="input-group-text">đ</span>
                                            <input type="text" name="oprice" class="form-control price-input"
                                                value="<?php echo htmlspecialchars($_POST['oprice'] ?? ''); ?>"
                                                placeholder="Nhập giá gốc" oninput="formatPrice(this)">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Warranty field -->
                            <div class="mb-3" id="warrantyField" style="display: none;">
                                <label class="form-label">Thời gian bảo hành (tháng) <span class="text-danger">*</span></label>
                                <input type="number" name="warranty" class="form-control"
                                    min="1" max="24" placeholder="Nhập thời gian bảo hành">
                            </div>

                            <!-- Size management -->
                            <div class="mb-3" id="sizeField" style="display: none;">
                                <label class="form-label">Quản lý size và số lượng</label>
                                <div id="sizeContainer">
                                    <!-- Size rows will be added here -->
                                </div>
                                <button type="button" class="btn btn-outline-secondary btn-sm" id="addSizeBtn">
                                    <i class="fas fa-plus me-1"></i> Thêm size
                                </button>
                            </div>

                            <!-- Product description selection -->
                            <div class="mb-3">
                                <label class="form-label">Mô tả sản phẩm</label>
                                <select name="description_id" id="descriptionSelect" class="form-select">
                                    <option value="">-- Chọn mô tả mẫu --</option>
                                    <?php
                                    $description_query = "SELECT * FROM motasanpham";
                                    $description_result = mysqli_query($conn, $description_query);
                                    while ($row = mysqli_fetch_assoc($description_result)) {
                                        echo "<option value='{$row['id']}'>{$row['name']}</option>";
                                    }
                                    ?>
                                    <option value="custom">-- Tùy chỉnh mô tả --</option>
                                </select>
                            </div>

                            <!-- Custom description fields -->
                            <div class="mb-3 card" id="descriptionFields" style="display: none;">
                                <div class="card-body">
                                    <h5 class="card-title">Tùy chỉnh mô tả sản phẩm</h5>
                                    <div class="mb-2">
                                        <label class="form-label">Chất liệu</label>
                                        <textarea name="chatlieu" id="chatlieu" class="form-control tinymce" placeholder="Nhập chất liệu" rows="4"></textarea>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">Thiết kế</label>
                                        <textarea name="thietke" id="thietke" class="form-control tinymce" placeholder="Nhập thiết kế" rows="4"></textarea>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">Màu sắc</label>
                                        <input type="text" name="mausac" id="mausac" class="form-control" placeholder="Nhập màu sắc">
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">Kích thước</label>
                                        <input type="text" name="kichthuoc" id="kichthuoc" class="form-control" placeholder="Nhập kích thước">
                                    </div>
                                </div>
                            </div>

                            <button type="submit" name="themsanpham" class="btn btn-pink w-100 mt-3">
                                <i class="fas fa-plus me-2"></i>Thêm Sản Phẩm
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>

    <!-- jQuery and AJAX handling script -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/add_product.js"></script>
</body>

</html>