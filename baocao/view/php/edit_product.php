<?php
// view/php/edit_product.php
session_start();
require_once "xacThucAdmin.php";
// Khởi tạo biến
$product = null;
$sizes = [];
$error_message = null;

// Lấy thông tin bảng và ID sản phẩm
$table = isset($_GET['table']) ? $_GET['table'] : '';
$product_id = isset($_GET['this_id']) ? intval($_GET['this_id']) : 0;

// Kiểm tra xem có dữ liệu sản phẩm trong session không
if (!isset($_SESSION['edit_product']) || !isset($_SESSION['edit_table'])) {
    header("Location: /baocao/user/submit?action=get_product_for_edit&this_id=$product_id&table=$table");
    exit();
}

// Lấy dữ liệu từ session
$product = $_SESSION['edit_product'];
$sizes = $_SESSION['edit_sizes'] ?? [];
$table = $_SESSION['edit_table'];
$product_id = $_SESSION['edit_product_id'];

// Xóa session sau khi đã lấy dữ liệu
unset($_SESSION['edit_product']);
unset($_SESSION['edit_sizes']);
unset($_SESSION['edit_table']);
unset($_SESSION['edit_product_id']);

// Xác định nếu sản phẩm cần trường bảo hành
$needsWarranty = in_array($table, ['votcaulong', 'votpickleball', 'gaybia']);

// Xác định nếu sản phẩm có quản lý kích thước
$hasSizes = strpos($table, 'giay') !== false || strpos($table, 'quanao') !== false || $table === 'aobia';
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chỉnh sửa sản phẩm</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="chỉnh sửa, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/edit_product.css">
</head>

<body>
    <!-- Sidebar -->
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">

        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h3 class="mb-0">Chỉnh sửa: <?php echo htmlspecialchars($product['name']) ?></h3>
                    </div>
                    <div class="card-body">
                        <?php
                        if (isset($_SESSION['message'])) {
                            $alert_class = $_SESSION['message_type'] == 'success' ? 'alert-success' : 'alert-danger';
                            echo '<div class="alert ' . $alert_class . ' alert-dismissible fade show" role="alert">
                                <i class="fas fa-' . ($_SESSION['message_type'] == 'success' ? 'check' : 'exclamation') . '-circle me-2"></i>
                                ' . $_SESSION['message'] . '
                                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            </div>';
                            unset($_SESSION['message']);
                            unset($_SESSION['message_type']);
                        }
                        ?>
                        <form method="post" action="/baocao/user/submit" enctype="multipart/form-data" id="productForm">
                            <input type="hidden" name="action" value="update_product">
                            <input type="hidden" name="this_id" value="<?php echo $product_id; ?>">
                            <input type="hidden" name="table" value="<?php echo $table; ?>">

                            <div class="mb-3">
                                <label for="name" class="form-label">Tên sản phẩm <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="name" name="name"
                                    value="<?php echo htmlspecialchars($product['name']) ?>" required>
                            </div>

                            <!-- Hiển thị và upload 4 ảnh -->
                            <div class="mb-3">

                                <div class="row">
                                    <div class="col-md-3 mb-3">

                                        <label for="image" class="form-label">Cập nhật ảnh 1</label>
                                        <input type="file" class="form-control" id="image" name="image"
                                            accept="image/jpeg,image/png,image/gif,image/webp">
                                    </div>
                                    <div class="col-md-3 mb-3">

                                        <label for="image2" class="form-label">Cập nhật ảnh 2</label>
                                        <input type="file" class="form-control" id="image2" name="image2"
                                            accept="image/jpeg,image/png,image/gif,image/webp">
                                    </div>
                                    <div class="col-md-3 mb-3">

                                        <label for="image3" class="form-label">Cập nhật ảnh 3</label>
                                        <input type="file" class="form-control" id="image3" name="image3"
                                            accept="image/jpeg,image/png,image/gif,image/webp">
                                    </div>
                                    <div class="col-md-3 mb-3">

                                        <label for="image4" class="form-label">Cập nhật ảnh 4</label>
                                        <input type="file" class="form-control" id="image4" name="image4"
                                            accept="image/jpeg,image/png,image/gif,image/webp">
                                    </div>
                                </div>
                                <div class="form-text text-muted">Chỉ chấp nhận file ảnh JPG, PNG, GIF, WEBP dưới 2MB</div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="brand" class="form-label">Thương hiệu</label>
                                    <input type="text" class="form-control" id="brand" name="brand"
                                        value="<?php echo htmlspecialchars($product['brand'] ?? 'Đang Cập Nhập') ?>">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="quantity" class="form-label">Số lượng</label>
                                    <input type="number" class="form-control" id="quantity" name="quantity"
                                        value="<?php echo htmlspecialchars($product['quantity'] ?? 10) ?>" min="1">
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="price" class="form-label">Giá bán <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text">đ</span>
                                        <input type="text" class="form-control price-input" id="price" name="price"
                                            value="<?php echo number_format($product['price'], 0, ',', '.') ?>"
                                            required oninput="formatPrice(this)">
                                    </div>
                                </div>

                                <div class="col-md-6 mb-3">
                                    <label for="oprice" class="form-label">Giá gốc <span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <span class="input-group-text">đ</span>
                                        <input type="text" class="form-control price-input" id="oprice" name="oprice"
                                            value="<?php echo number_format($product['oprice'], 0, ',', '.') ?>"
                                            required oninput="formatPrice(this)">
                                    </div>
                                </div>
                            </div>

                            <!-- Warranty field (only shown for racket products) -->
                            <?php if ($needsWarranty): ?>
                                <div class="mb-3">
                                    <label for="warranty" class="form-label">Thời gian bảo hành (tháng) <span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" id="warranty" name="warranty"
                                        value="<?php echo htmlspecialchars($product['warrenty'] ?? '0') ?>"
                                        min="1" max="24" placeholder="Nhập thời gian bảo hành">
                                </div>
                            <?php endif; ?>

                            <!-- Size management (only shown for shoes and clothing) -->
                            <?php if ($hasSizes): ?>
                                <div class="mb-3">
                                    <label class="form-label">Quản lý size và số lượng</label>
                                    <div id="sizeContainer">
                                        <?php foreach ($sizes as $size): ?>
                                            <div class="row size-row">
                                                <div class="col-md-5">
                                                    <input type="text" name="sizes[]" class="form-control"
                                                        value="<?php echo htmlspecialchars($size['size']); ?>"
                                                        placeholder="Size (VD: 39, M, L)">
                                                </div>
                                                <div class="col-md-5">
                                                    <input type="number" name="quantities[]" class="form-control size-quantity"
                                                        value="<?php echo htmlspecialchars($size['quantity']); ?>"
                                                        placeholder="Số lượng" min="1">
                                                </div>
                                                <div class="col-md-2">
                                                    <button type="button" class="btn btn-danger btn-sm remove-size">
                                                        <i class="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" id="addSizeBtn">
                                        <i class="fas fa-plus me-1"></i> Thêm size
                                    </button>
                                </div>
                            <?php endif; ?>

                            <div class="d-flex justify-content-end gap-2">
                                <a href="/baocao/delete_product/<?php echo $table ?>" class="btn btn-outline-pink">Hủy</a>
                                <button type="submit" name="btn" class="btn btn-pink">
                                    <i class="fas fa-save me-2"></i>Cập nhật
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/edit_product.js"></script>
</body>

</html>