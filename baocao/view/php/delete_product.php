<!-- require_once "xacThucAdmin.php"; -->
<?php
// view/php/delete_product.php
session_start();

// Khởi tạo biến
$parent_tables = [];
$child_tables = [];
$products = [];

// Lấy danh sách loại thể thao (parent tables) từ session hoặc controller
if (isset($_SESSION['parent_tables'])) {
    $parent_tables = $_SESSION['parent_tables'];
} else {
    // Redirect to controller để lấy dữ liệu
    header("Location: /baocao/user/submit?action=load_parent_tables");
    exit;
}

// Lấy child_tables từ session nếu có
if (isset($_SESSION['child_tables'])) {
    $child_tables = $_SESSION['child_tables'];
    unset($_SESSION['child_tables']); // Xóa để tránh tái sử dụng
}

// Lấy parent_id từ GET hoặc từ session
$parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : (isset($_SESSION['parent_id']) ? $_SESSION['parent_id'] : 0);

// Lấy thông tin bảng và trạng thái hiển thị
$selected_table = $_GET['table'] ?? '';
$show_inactive = isset($_GET['show_inactive']) && $_GET['show_inactive'] == 1;
$displayName = '';

// Nếu có bảng được chọn, lấy danh sách sản phẩm từ controller
if (!empty($selected_table)) {
    if (!isset($_SESSION['products'])) {
        // Chuyển hướng đến controller để lấy dữ liệu sản phẩm
        header("Location: /baocao/user/submit?action=get_products&table=$selected_table&show_inactive=" . ($show_inactive ? '1' : '0'));
        exit;
    } else {
        $products = $_SESSION['products'];
        $displayName = isset($_SESSION['display_name']) ? $_SESSION['display_name'] : '';
        unset($_SESSION['products']); // Xóa khỏi session sau khi sử dụng
        unset($_SESSION['display_name']);
    }
}

// Hàm format display name nếu cần (có thể chuyển xuống controller)
function formatDisplayName($table)
{
    return isset($_SESSION['display_name']) ? $_SESSION['display_name'] : $table;
}

// Xóa session tìm kiếm nếu không ở chế độ tìm kiếm toàn cục
if (!isset($_GET['global_search'])) {
    unset($_SESSION['global_search_keyword']);
    unset($_SESSION['global_search_results']);
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Sản Phẩm</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="xóa sản phẩm, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/themes/base/jquery-ui.min.css">
    <link rel="stylesheet" href="/baocao/view/css/delete_product.css">
</head>

<body>
    <!-- Sidebar -->
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản lý sản phẩm</h2>

            </div>
            <div>
                <a href="/baocao/add_product" class="btn btn-pink">
                    <i class="fas fa-plus me-2"></i>Thêm sản phẩm
                </a>
                <?php if (!empty($selected_table) && !isset($_GET['global_search'])): ?>
                    <form method="post" action="/baocao/user/submit" style="display: inline;">
                        <input type="hidden" name="action" value="search_products">
                        <input type="hidden" name="table" value="<?php echo $selected_table; ?>">
                        <input type="hidden" name="show_inactive" value="<?php echo $show_inactive ? '0' : '1'; ?>">
                        <button type="submit" class="btn <?php echo $show_inactive ? 'btn-success' : 'btn-warning' ?>">
                            <i class="fas <?php echo $show_inactive ? 'fa-eye' : 'fa-eye-slash' ?> me-2"></i>
                            <?php echo $show_inactive ? 'Xem sản phẩm hiển thị' : 'Xem sản phẩm đã ẩn' ?>
                        </button>
                    </form>
                <?php elseif (isset($_GET['global_search'])): ?>
                    <form method="post" action="/baocao/user/submit" style="display: inline;">
                        <input type="hidden" name="action" value="global_search">
                        <input type="hidden" name="global_search_keyword" value="<?php echo htmlspecialchars($_SESSION['global_search_keyword'] ?? ''); ?>">
                        <input type="hidden" name="show_inactive" value="<?php echo $show_inactive ? '0' : '1'; ?>">
                        <button type="submit" class="btn <?php echo $show_inactive ? 'btn-success' : 'btn-warning' ?>">
                            <i class="fas <?php echo $show_inactive ? 'fa-eye' : 'fa-eye-slash' ?> me-2"></i>
                            <?php echo $show_inactive ? 'Xem sản phẩm hiển thị' : 'Xem sản phẩm đã ẩn' ?>
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </div>

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

        <!-- Global Search Form -->
        <div class="card mb-4">
            <div class="card-body">
                <h4 class="section-title">Tìm kiếm toàn bộ sản phẩm</h4>
                <form method="post" action="/baocao/user/submit" id="globalSearchForm">
                    <input type="hidden" name="action" value="global_search">
                    <input type="hidden" name="show_inactive" value="<?php echo $show_inactive ? '1' : '0'; ?>">
                    <div class="input-group">
                        <input type="text" class="form-control" name="global_search_keyword" id="globalSearchInput"
                            autocomplete="off"
                            placeholder="Nhập tên sản phẩm cần tìm..."
                            value="<?php echo isset($_SESSION['global_search_keyword']) ? htmlspecialchars($_SESSION['global_search_keyword']) : ''; ?>"
                            required>
                        <button class="btn btn-pink" type="submit">
                            <i class="fas fa-search me-2"></i>Tìm kiếm
                        </button>
                        <?php if (isset($_GET['global_search']) && isset($_SESSION['global_search_keyword'])): ?>
                            <a href="/baocao/delete_product" class="btn btn-outline-secondary">
                                <i class="fas fa-times me-2"></i>Xóa tìm kiếm
                            </a>
                        <?php endif; ?>
                    </div>
                </form>
            </div>
        </div>

        <!-- Category selection form -->
        <div class="card mb-4">
            <div class="card-body">
                <h4 class="section-title">Chọn danh mục</h4>
                <form method="post" action="/baocao/user/submit" id="parentForm">
                    <input type="hidden" name="action" value="get_child_tables">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Loại thể thao</label>
                                <select name="parent_id" id="parentSelect" class="form-select">
                                    <option value="">-- Chọn loại thể thao --</option>
                                    <?php foreach ($parent_tables as $id => $topic): ?>
                                        <option value="<?php echo $id; ?>" <?php echo $parent_id == $id ? 'selected' : ''; ?>>
                                            <?php echo $topic; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Danh mục sản phẩm</label>
                                <select name="table" id="childSelect" class="form-select">
                                    <option value="">-- Chọn danh mục --</option>
                                    <?php foreach ($child_tables as $table): ?>
                                        <option value="<?php echo $table; ?>" <?php echo $selected_table == $table ? 'selected' : ''; ?>>
                                            <?php echo formatDisplayName($table); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php if ($show_inactive): ?>
                                    <input type="hidden" name="show_inactive" value="1">
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Products list -->
        <div class="row">
            <?php
            // Xác định danh sách sản phẩm cần hiển thị
            $display_products = [];

            if (isset($_GET['global_search']) && isset($_SESSION['global_search_results'])) {
                // Hiển thị kết quả tìm kiếm toàn cục
                $display_products = $_SESSION['global_search_results'];
            } elseif (!empty($products)) {
                // Hiển thị danh sách sản phẩm trong danh mục đã chọn
                $display_products = $products;
            }

            if (!empty($display_products)):
            ?>
                <?php foreach ($display_products as $product): ?>
                    <div class="col-md-3">
                        <div class="product-card position-relative">
                            <?php if ($show_inactive): ?>
                                <span class="status-badge inactive-badge">Đã ẩn</span>
                            <?php else: ?>
                                <span class="status-badge active-badge">Đang hiển thị</span>
                            <?php endif; ?>

                            <?php if (isset($_GET['global_search'])): ?>
                                <span class="category-badge"><?php echo htmlspecialchars($product['table_display']); ?></span>
                            <?php endif; ?>

                            <img src="/baocao/view/img/<?php echo htmlspecialchars($product['image']); ?>"
                                alt="<?php echo htmlspecialchars($product['name']); ?>"
                                class="product-img mb-3">
                            <h5 class="mb-2"><?php echo htmlspecialchars($product['name']); ?></h5>
                            <div class="mb-2">
                                <span class="product-price">
                                    <?php
                                    $price = floatval($product['price']);
                                    echo number_format($price);
                                    ?>đ
                                </span>
                                <?php if (isset($product['oprice']) && $product['oprice'] > $product['price']): ?>
                                    <span class="original-price">
                                        <?php
                                        $original_price = floatval($product['oprice']);
                                        echo number_format($original_price);
                                        ?>đ
                                    </span>
                                <?php endif; ?>
                            </div>
                            <div class="product-info-row">
                                <small class="text-muted">Số lượng: <?php echo $product['quantity']; ?></small>
                                <small class="text-muted">Lượt xem: <?php echo $product['view']; ?></small>
                            </div>
                            <div class="action-btns">
                                <?php
                                // Xác định bảng của sản phẩm
                                $product_table = isset($product['table_name']) ? $product['table_name'] : $selected_table;
                                ?>
                                <a href="/baocao/user/submit?action=get_product_for_edit&this_id=<?php echo $product['id']; ?>&table=<?php echo $product_table; ?>" class="edit-btn">
                                    <i class="fas fa-edit me-1"></i>Sửa
                                </a>
                                <?php if ($show_inactive): ?>
                                    <form method="post" action="/baocao/user/submit" style="display: inline;">
                                        <input type="hidden" name="action" value="restore_product">
                                        <input type="hidden" name="restore_id" value="<?php echo $product['id']; ?>">
                                        <input type="hidden" name="table" value="<?php echo $product_table; ?>">
                                        <button type="submit" class="restore-btn"
                                            onclick="return confirm('Bạn có chắc muốn khôi phục sản phẩm này?')">
                                            <i class="fas fa-undo me-1"></i>Khôi phục
                                        </button>
                                    </form>
                                    <form method="post" action="/baocao/user/submit" style="display: inline;">
                                        <input type="hidden" name="action" value="delete_product">
                                        <input type="hidden" name="delete_id" value="<?php echo $product['id']; ?>">
                                        <input type="hidden" name="product" value="<?php echo htmlspecialchars($product['name']); ?>">
                                        <input type="hidden" name="table" value="<?php echo $selected_table; ?>">
                                        <button type="submit" class="delete-btn"
                                            onclick="return confirm('Bạn có chắc muốn xóa vĩnh viễn sản phẩm này?')">
                                            <i class="fas fa-trash me-1"></i>Xóa
                                        </button>
                                    </form>
                                <?php else: ?>
                                    <form method="post" action="/baocao/user/submit" style="display: inline;">
                                        <input type="hidden" name="action" value="hide_product">
                                        <input type="hidden" name="this_id" value="<?php echo $product['id']; ?>">
                                        <input type="hidden" name="product" value="<?php echo htmlspecialchars($product['name']); ?>">
                                        <input type="hidden" name="table" value="<?php echo $product_table; ?>">
                                        <button type="submit" class="delete-btn"
                                            onclick="return confirm('Bạn có chắc muốn ẩn sản phẩm này?')">
                                            <i class="fas fa-eye-slash me-1"></i>Ẩn
                                        </button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <?php
                        if (isset($_GET['global_search'])) {
                            echo 'Không tìm thấy sản phẩm nào phù hợp với từ khóa tìm kiếm';
                        } elseif (empty($selected_table)) {
                            echo 'Vui lòng chọn danh mục sản phẩm hoặc sử dụng tìm kiếm toàn cục';
                        } else {
                            echo 'Không có sản phẩm nào trong danh mục này';
                        }
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/themes/base/jquery-ui.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js"></script>
    <script>
        // Thay thế đoạn code xử lý change event của parentSelect
        document.getElementById('parentSelect').addEventListener('change', function() {
            if (this.value) {
                // Hiển thị loading indicator
                const childSelect = document.getElementById('childSelect');
                childSelect.disabled = true;
                childSelect.innerHTML = '<option value="">Đang tải danh mục...</option>';

                // Gọi AJAX để lấy danh mục con
                fetch(`/baocao/user/submit?action=get_child_tables_json&parent_id=${this.value}`)
                    .then(response => response.json())
                    .then(data => {
                        childSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
                        data.forEach(table => {
                            const option = document.createElement('option');
                            option.value = table;
                            option.textContent = formatTableName(table);
                            childSelect.appendChild(option);
                        });
                        childSelect.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        childSelect.innerHTML = '<option value="">Lỗi khi tải danh mục</option>';
                    });
            }
        });

        // Thêm sự kiện khi click vào dropdown danh mục
        document.getElementById('childSelect').addEventListener('change', function() {
            if (this.value) {
                // Hiển thị loading
                const productsContainer = document.querySelector('.row');
                productsContainer.innerHTML = `
            <div class="col-12 text-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Đang tải sản phẩm...</p>
            </div>
        `;

                // Gửi yêu cầu reset trước khi tải mới
                fetch('/baocao/user/submit?action=reset_child_selection')
                    .then(() => {
                        window.location.href = `/baocao/user/submit?action=get_products&table=${this.value}<?php echo $show_inactive ? '&show_inactive=1' : '' ?>`;
                    });
            }
        });
        // Hàm định dạng tên bảng (có thể thay thế bằng hàm từ server)
        function formatTableName(table) {
            return table.replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/^./, str => str.toUpperCase())
                .replace('Bong', 'Bóng')
                .replace('Gym', 'Gym')
                .replace('PhuKien', 'Phụ Kiện');
        }

        // Xử lý khi chọn danh mục sản phẩm
        document.getElementById('childSelect').addEventListener('change', function() {
            if (this.value) {
                window.location.href = '/baocao/user/submit?action=get_products&table=' + this.value + '<?php echo $show_inactive ? '&show_inactive=1' : '' ?>';
            }
        });
        document.addEventListener('DOMContentLoaded', function() {
            // Tìm phần tử thông báo
            const alert = document.querySelector('.alert.alert-dismissible');

            if (alert) {
                // Đặt timeout 3 giây (3000ms) để ẩn thông báo
                setTimeout(function() {
                    // Kiểm tra xem Bootstrap JS có được bao gồm không
                    if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                        // Sử dụng Bootstrap Alert để đóng thông báo
                        const bsAlert = new bootstrap.Alert(alert);
                        bsAlert.close();
                    } else {
                        // Nếu không dùng Bootstrap JS, ẩn thủ công
                        alert.classList.remove('show');
                        alert.classList.add('fade');
                        setTimeout(() => {
                            alert.remove();
                        }, 150); // Chờ thêm 150ms để hoàn tất hiệu ứng fade
                    }
                }, 3000);
            }
        });
        $(document).ready(function() {
            // Autocomplete cho tìm kiếm toàn cục
            $("input[name='global_search_keyword']").autocomplete({
                source: function(request, response) {
                    $.ajax({
                        url: "/baocao/user/submit",
                        dataType: "json",
                        data: {
                            action: "search_suggestions",
                            term: request.term
                        },
                        success: function(data) {
                            response(data);
                        }
                    });
                },
                minLength: 2,
                select: function(event, ui) {
                    // Khi chọn một gợi ý, submit form tìm kiếm
                    $(this).val(ui.item.value);
                    $("#globalSearchForm").submit();
                }
            });
        });
        $(document).ready(function() {
            // Khởi tạo jQuery UI Autocomplete
            $("#globalSearchInput").autocomplete({
                source: function(request, response) {
                    $.ajax({
                        url: "/baocao/user/submit",
                        dataType: "json",
                        data: {
                            action: "search_suggestions",
                            term: request.term
                        },
                        success: function(data) {
                            response(data);
                        }
                    });
                },
                minLength: 2, // Kích hoạt sau khi nhập 2 ký tự
                select: function(event, ui) {
                    // Khi chọn gợi ý, điền giá trị vào ô input và submit form
                    $("#globalSearchInput").val(ui.item.value);
                    $("#globalSearchForm").submit();
                }
            }).data("ui-autocomplete")._renderItem = function(ul, item) {
                // Tùy chỉnh render để hiển thị hình ảnh và văn bản
                return $("<li>")
                    .append(
                        '<div class="autocomplete-item">' +
                        '<img src="/baocao/view/img/' + item.image + '" alt="' + item.label + '" style="width: 40px; height: 40px; margin-right: 10px; vertical-align: middle;">' +
                        '<span>' + item.label + '</span>' +
                        '</div>'
                    )
                    .appendTo(ul);
            };
        });
    </script>
</body>

</html>