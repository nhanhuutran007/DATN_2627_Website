<?php
session_start();
include "../../model/config/connect.php";
require_once "xacThucAdmin.php";
// Initialize message variables
$success_msg = $error_msg = '';
$editing_item = null; // Khởi tạo biến $editing_item

if (isset($_POST['add_nav_item'])) {
    try {
        $name = trim($_POST['nav_item_name'] ?? '');
        $categories = $_POST['nav_item_category'] ?? [];
        $position = (int)($_POST['nav_item_position'] ?? 0);

        // Validate inputs
        if (empty($name)) {
            throw new Exception("Tên mục không được để trống");
        }
        if (empty($categories)) {
            throw new Exception("Vui lòng chọn ít nhất một thể loại sản phẩm");
        }
        if ($position < 1 || $position > 5) {
            throw new Exception("Vị trí phải từ 1 đến 5");
        }

        // Convert array of categories to comma-separated string
        $category_string =  $categories;

        // Check if position already exists
        $check_query = "SELECT id FROM category_nav_items WHERE position = ?";
        $check_stmt = $conn->prepare($check_query);
        $check_stmt->bind_param("i", $position);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows > 0) {
            // Update existing item
            $update_query = "UPDATE category_nav_items SET name = ?, category = ? WHERE position = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bind_param("ssi", $name, $category_string, $position);
            if ($update_stmt->execute()) {
                $_SESSION['message'] = "Cập nhật mục thành công!";
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception("Lỗi khi cập nhật mục: " . $update_stmt->error);
            }
            $update_stmt->close();
        } else {
            // Insert new item
            $insert_query = "INSERT INTO category_nav_items (name, category, position) VALUES (?, ?, ?)";
            $insert_stmt = $conn->prepare($insert_query);
            $insert_stmt->bind_param("ssi", $name, $category_string, $position);
            if ($insert_stmt->execute()) {
                $_SESSION['message'] = "Thêm mục thành công!";
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception("Lỗi khi thêm mục: " . $insert_stmt->error);
            }
            $insert_stmt->close();
        }
        $check_stmt->close();

        // Redirect to avoid form resubmission
        header("Location: /baocao/quanlydanhmuc");
        exit;
    } catch (Exception $e) {
        $_SESSION['message'] = $e->getMessage();
        $_SESSION['message_type'] = 'danger';
    }
}

/**
 * Handle delete request
 */
if (isset($_GET['delete_nav_item'])) {
    try {
        $id = (int)$_GET['delete_nav_item'];
        $delete_query = "DELETE FROM category_nav_items WHERE id = ?";
        $delete_stmt = $conn->prepare($delete_query);
        $delete_stmt->bind_param("i", $id);
        if ($delete_stmt->execute()) {
            $_SESSION['message'] = "Xóa mục thành công!";
            $_SESSION['message_type'] = 'success';
        } else {
            throw new Exception("Lỗi khi xóa mục: " . $delete_stmt->error);
        }
        $delete_stmt->close();
    } catch (Exception $e) {
        $_SESSION['message'] = $e->getMessage();
        $_SESSION['message_type'] = 'danger';
    }

    // Sửa URL redirect
    header("Location: /baocao/quanlydanhmuc");
    exit;
}

// Fetch category nav items
$nav_items = [];
$query = "SELECT * FROM category_nav_items ORDER BY position ASC";
$result = mysqli_query($conn, $query);
while ($row = mysqli_fetch_assoc($result)) {
    $nav_items[] = $row;
}

// Category name mapping
$category_names = [
    'bongro' => 'Bóng rổ',
    'bongchuyen' => 'Bóng chuyền',
    'bongda' => 'Bóng đá & Futsal',
    'tapgym' => 'Tập Gym & Workout',
    'chaybo' => 'Chạy bộ & Đi bộ',
    'caulong' => 'Cầu lông',
    'bia' => 'Bi-a',
    'pickleball' => 'Pickleball',
    // 'votcaulong' => 'Vợt Cầu Lông'
    'saleoutlet40' => 'SALE OUTLET 40%'
    // 'dongluc' => 'Động Lực',
    // 'grandsport' => 'Grand Sport',
    // 'spalding' => 'Spalding',
    // 'peak' => 'Peak',
    // 'bubadu' => 'Bubadu',
    // 'saovang' => 'Sao Vàng',
    // 'peri' => 'Peri',
    // 'zocker' => 'Zocker'
];
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Danh Mục</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="danh mục, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/quanlydanhmuc.css">
</head>

<body>
    <!-- Sidebar -->
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản lý danh mục</h2>
                <p class="text-muted mb-0">Chỉnh sửa các danh mục</p>
            </div>
        </div>

        <!-- Display notifications -->
        <?php
        if (isset($_SESSION['message'])) {
            $alert_class = $_SESSION['message_type'] == 'success' ? 'alert-success' : 'alert-danger';
            echo '<div class="alert ' . $alert_class . ' alert-dismissible fade show" role="alert">
        <i class="fas fa-' . ($_SESSION['message_type'] == 'success' ? 'check' : 'exclamation') . '-circle me-2"></i>
        ' . htmlspecialchars($_SESSION['message']) . '
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>';
            unset($_SESSION['message']);
            unset($_SESSION['message_type']);
        }
        ?>

        <!-- Form thêm/sửa mục -->
        <div class="card mb-4">
            <div class="card-body">
                <h4 class="section-title">Thêm/Sửa danh mục</h4>
                <form id="add-nav-item-form" method="POST" action="/baocao/quanlydanhmuc">
                    <div class="form-group mb-3">
                        <label for="nav-item-name">Tên mục:</label>
                        <input type="text" class="form-control" id="nav-item-name" name="nav_item_name" required>
                    </div>

                    <div class="mb-3">
                        <label for="nav-item-category" class="form-label">Thể loại sản phẩm:</label>
                        <div class="category-selection border rounded p-2" style="max-height: 300px; overflow-y: auto;">
                            <?php
                            foreach ($category_names as $value => $label):
                            ?>
                                <div class="form-check">
                                    <input class="form-check-input single-checkbox" type="checkbox" name="nav_item_category"
                                        id="category-<?php echo $value; ?>" value="<?php echo $value; ?>">
                                    <label class="form-check-label" for="category-<?php echo $value; ?>">
                                        <?php echo htmlspecialchars($label); ?>
                                    </label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        <div class="form-text">Chọn một thể loại bằng cách nhấp vào ô.</div>
                    </div>

                    <div class="form-group mb-3">
                        <label for="nav-item-position">Vị trí (1-5):</label>
                        <input type="number" class="form-control" id="nav-item-position" name="nav_item_position" min="1" max="5" required>
                    </div>

                    <button type="submit" class="btn btn-pink" name="add_nav_item">Thêm/Sửa mục</button>
                </form>
            </div>
        </div>

        <!-- Danh sách mục hiện tại -->
        <div class="card">
            <div class="card-body">
                <h4 class="section-title">Danh sách mục hiện tại</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tên mục</th>
                            <th>Thể loại</th>
                            <th>Vị trí</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($nav_items)): ?>
                            <?php foreach ($nav_items as $item): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($item['name']); ?></td>
                                    <td>
                                        <?php
                                        $categories = explode(',', $item['category']);
                                        $category_display = [];
                                        foreach ($categories as $cat) {
                                            $cat = trim($cat);
                                            $category_display[] = isset($category_names[$cat]) ? $category_names[$cat] : $cat;
                                        }
                                        echo htmlspecialchars(implode(', ', $category_display));
                                        ?>
                                    </td>
                                    <td><?php echo $item['position']; ?></td>
                                    <td>
                                        <a href="/baocao/quanlydanhmuc?delete_nav_item=<?php echo $item['id']; ?>"
                                            class="btn btn-danger btn-sm"
                                            onclick="return confirm('Bạn có chắc muốn xóa mục này?')">
                                            Xóa
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4" class="text-center">Chưa có mục nào được thêm</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script>
        // Ẩn tất cả các thông báo Bootstrap sau 2 giây
        setTimeout(function() {
            const alerts = document.querySelectorAll('.alert.alert-dismissible');
            console.log('Found alerts:', alerts.length); // Debug: Ghi log số lượng alert

            alerts.forEach(alert => {
                console.log('Hiding alert:', alert); // Debug: Ghi log alert đang xử lý
                alert.classList.remove('show');
                alert.classList.add('fade');
                setTimeout(() => {
                    console.log('Removing alert from DOM:', alert); // Debug: Ghi log khi xóa
                    alert.remove();
                }, 500); // Chờ animation fade hoàn tất
            });
        }, 2000); // 2 giây
    </script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Chọn tất cả các checkbox có class "single-checkbox"
            const checkboxes = document.querySelectorAll(".single-checkbox");

            // Gắn sự kiện "change" cho từng checkbox
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener("change", function() {
                    // Nếu checkbox này được chọn, bỏ chọn tất cả các checkbox khác
                    if (this.checked) {
                        checkboxes.forEach(cb => {
                            if (cb !== this) {
                                cb.checked = false;
                            }
                        });
                    }
                });
            });
        });
    </script>
</body>

</html>