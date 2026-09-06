<?php
session_start();
include "../../model/config/connect.php";
require_once "xacThucAdmin.php";
// Lấy dữ liệu từ session
$vouchers = isset($_SESSION['vouchers']) ? $_SESSION['vouchers'] : [];
$total_items = isset($_SESSION['total_voucher_items']) ? $_SESSION['total_voucher_items'] : 0;
$current_page = isset($_SESSION['current_voucher_page']) ? $_SESSION['current_voucher_page'] : 1;
$items_per_page = isset($_SESSION['voucher_items_per_page']) ? $_SESSION['voucher_items_per_page'] : 6;
$searchTerm = isset($_SESSION['voucher_search']) ? $_SESSION['voucher_search'] : '';
$filter = isset($_SESSION['voucher_filter']) ? $_SESSION['voucher_filter'] : '';
$sort = isset($_SESSION['voucher_sort']) ? $_SESSION['voucher_sort'] : 'newest';
$total_pages = ceil($total_items / $items_per_page);
unset($_SESSION['vouchers']);
// Gửi yêu cầu lấy voucher khi tải trang lần đầu nếu chưa có dữ liệu
if (empty($vouchers) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
?>
    <form id="initialLoadForm" action="/baocao/user/submit" method="POST" style="display: none;">
        <input type="hidden" name="action" value="get_vouchers">
        <input type="hidden" name="page" value="1">
        <input type="hidden" name="search" value="">
        <input type="hidden" name="filter" value="">
        <input type="hidden" name="sort" value="newest">
    </form>
    <script>
        document.getElementById('initialLoadForm').submit();
    </script>
<?php
    exit();
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Voucher</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="voucher, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/quanlyvoucher.css">

</head>

<body>
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Hiển thị thông báo -->
        <?php if (isset($_SESSION['voucher_success_message'])): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <?php echo $_SESSION['voucher_success_message'];
                unset($_SESSION['voucher_success_message']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <?php if (isset($_SESSION['voucher_error_message'])): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <?php echo $_SESSION['voucher_error_message'];
                unset($_SESSION['voucher_error_message']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản Lý Voucher</h2>
                <p class="text-muted mb-0">Danh sách mã giảm giá</p>
            </div>
            <div class="d-flex">
                <div class="input-group me-3" style="width: 250px;">
                    <form action="/baocao/user/submit" method="POST" id="searchForm" class="d-flex w-100">
                        <input type="hidden" name="action" value="get_vouchers">
                        <input type="hidden" name="page" value="1">
                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                        <input type="text" class="form-control" name="search" id="searchInput" placeholder="Tìm theo mã, tên voucher hoặc username" value="<?php echo htmlspecialchars($searchTerm); ?>">
                        <button class="btn btn-outline-pink" type="submit">
                            <i class="fas fa-search"></i>
                        </button>
                        <?php if (!empty($searchTerm)): ?>
                            <button type="submit" class="btn btn-outline-secondary ms-1" name="search" value="">
                                <i class="fas fa-times"></i>
                            </button>
                        <?php endif; ?>
                    </form>
                </div>
                <button type="button" class="btn btn-pink" data-bs-toggle="modal" data-bs-target="#addVoucherModal">
                    <i class="fas fa-plus me-2"></i>Thêm Voucher
                </button>
            </div>
        </div>

        <!-- Vouchers Table -->
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="section-title">Danh Sách Voucher</h4>
                    <div class="d-flex">
                        <form action="/baocao/user/submit" method="POST" class="me-2">
                            <input type="hidden" name="action" value="get_vouchers">
                            <input type="hidden" name="page" value="1">
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                            <select name="filter" class="form-select" onchange="this.form.submit()">
                                <option value="">Tất cả</option>
                                <option value="active" <?php echo $filter == 'active' ? 'selected' : ''; ?>>Đang hoạt động</option>
                                <option value="inactive" <?php echo $filter == 'inactive' ? 'selected' : ''; ?>>Không hoạt động</option>
                            </select>
                        </form>
                        <form action="/baocao/user/submit" method="POST">
                            <input type="hidden" name="action" value="get_vouchers">
                            <input type="hidden" name="page" value="1">
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                            <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                            <select name="sort" class="form-select" onchange="this.form.submit()">
                                <option value="newest" <?php echo $sort == 'newest' ? 'selected' : ''; ?>>Mới nhất</option>
                                <option value="oldest" <?php echo $sort == 'oldest' ? 'selected' : ''; ?>>Cũ nhất</option>
                                <option value="highest" <?php echo $sort == 'highest' ? 'selected' : ''; ?>>Giá trị cao nhất</option>
                                <option value="lowest" <?php echo $sort == 'lowest' ? 'selected' : ''; ?>>Giá trị thấp nhất</option>
                            </select>
                        </form>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Mã Voucher</th>
                                <th>Tên Voucher</th>
                                <th>Nội dung</th>
                                <th>Giá trị</th>
                                <th>Trạng Thái</th>
                                <th>Người sở hữu</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($vouchers)): ?>
                                <?php foreach ($vouchers as $row): ?>
                                    <?php
                                    $status_class = $row['active'] ? 'badge-active' : 'badge-inactive';
                                    $status_text = $row['active'] ? 'Hoạt động' : 'Không hoạt động';
                                    ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($row['name']); ?></td>
                                        <td><?php echo htmlspecialchars($row['title']); ?></td>
                                        <td><?php echo htmlspecialchars($row['content']); ?></td>
                                        <td><?php echo $row['price'] == 'FREESHIP' ? 'Miễn phí vận chuyển' : number_format($row['price']) . ' ₫'; ?></td>
                                        <td><span class="badge <?php echo $status_class; ?>"><?php echo $status_text; ?></span></td>
                                        <td>
                                            <?php
                                            if ($row['id_user'] == 0) {
                                                echo 'Hệ thống';
                                            } else {
                                                // Lấy thông tin người dùng từ CSDL
                                                $user_query = "SELECT username FROM khachhang WHERE id_user = ?";
                                                $user_stmt = $conn->prepare($user_query);
                                                $user_stmt->bind_param("i", $row['id_user']);
                                                $user_stmt->execute();
                                                $user_result = $user_stmt->get_result();
                                                $user = $user_result->fetch_assoc();
                                                echo $user ? htmlspecialchars($user['username']) : 'Không xác định';
                                            }
                                            ?>
                                        </td>
                                        <td>
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;">
                                                <input type="hidden" name="action" value="toggle_voucher">
                                                <input type="hidden" name="id" value="<?php echo $row['id']; ?>">
                                                <input type="hidden" name="status" value="<?php echo $row['active'] ? '0' : '1'; ?>">
                                                <button type="submit" class="btn btn-sm <?php echo $row['active'] ? 'btn-outline-success' : 'btn-outline-secondary'; ?> me-1" title="<?php echo $row['active'] ? 'Vô hiệu hóa' : 'Kích hoạt'; ?>">
                                                    <i class="fas <?php echo $row['active'] ? 'fa-toggle-off' : 'fa-toggle-on'; ?>"></i>
                                                </button>
                                            </form>
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;" onsubmit="return confirm('Bạn có chắc chắn muốn xóa voucher này?')">
                                                <input type="hidden" name="action" value="delete_voucher">
                                                <input type="hidden" name="id" value="<?php echo $row['id']; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-danger" title="Xóa">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="7" class="text-center">Không có voucher nào</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <nav aria-label="Page navigation" class="mt-4">
                    <ul class="pagination justify-content-center">
                        <?php if ($total_pages > 0): ?>
                            <!-- Nút Trước -->
                            <li class="page-item <?php echo ($current_page <= 1) ? 'disabled' : ''; ?>">
                                <?php if ($current_page > 1): ?>
                                    <form action="/baocao/user/submit" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="get_vouchers">
                                        <input type="hidden" name="page" value="<?php echo $current_page - 1; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <button type="submit" class="page-link">
                                            <i class="fas fa-chevron-left"></i>
                                        </button>
                                    </form>
                                <?php else: ?>
                                    <span class="page-link"><i class="fas fa-chevron-left"></i></span>
                                <?php endif; ?>
                            </li>

                            <?php
                            $start_page = max(1, $current_page - 2);
                            $end_page = min($total_pages, $current_page + 2);

                            if ($start_page > 1) {
                            ?>
                                <li class="page-item">
                                    <form action="/baocao/user/submit" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="get_vouchers">
                                        <input type="hidden" name="page" value="1">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <button type="submit" class="page-link">1</button>
                                    </form>
                                </li>
                                <?php
                                if ($start_page > 2) {
                                    echo '<li class="page-item disabled"><span class="page-link">...</span></li>';
                                }
                            }

                            for ($i = $start_page; $i <= $end_page; $i++) {
                                ?>
                                <li class="page-item <?php echo $i == $current_page ? 'active' : ''; ?>">
                                    <?php if ($i == $current_page): ?>
                                        <span class="page-link"><?php echo $i; ?></span>
                                    <?php else: ?>
                                        <form action="/baocao/user/submit" method="POST" style="display:inline;">
                                            <input type="hidden" name="action" value="get_vouchers">
                                            <input type="hidden" name="page" value="<?php echo $i; ?>">
                                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                            <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                            <button type="submit" class="page-link"><?php echo $i; ?></button>
                                        </form>
                                    <?php endif; ?>
                                </li>
                            <?php
                            }

                            if ($end_page < $total_pages) {
                                if ($end_page < $total_pages - 1) {
                                    echo '<li class="page-item disabled"><span class="page-link">...</span></li>';
                                }
                            ?>
                                <li class="page-item">
                                    <form action="/baocao/user/submit" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="get_vouchers">
                                        <input type="hidden" name="page" value="<?php echo $total_pages; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <button type="submit" class="page-link"><?php echo $total_pages; ?></button>
                                    </form>
                                </li>
                            <?php
                            }
                            ?>

                            <!-- Nút Tiếp -->
                            <li class="page-item <?php echo ($current_page >= $total_pages) ? 'disabled' : ''; ?>">
                                <?php if ($current_page < $total_pages): ?>
                                    <form action="/baocao/user/submit" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="get_vouchers">
                                        <input type="hidden" name="page" value="<?php echo $current_page + 1; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <button type="submit" class="page-link">
                                            <i class="fas fa-chevron-right"></i>
                                        </button>
                                    </form>
                                <?php else: ?>
                                    <span class="page-link"><i class="fas fa-chevron-right"></i></span>
                                <?php endif; ?>
                            </li>
                        <?php endif; ?>
                    </ul>
                </nav>
            </div>
        </div>
    </div>

    <!-- Modal Thêm Voucher -->
    <div class="modal fade" id="addVoucherModal" tabindex="-1" aria-labelledby="addVoucherModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-light">
                    <h5 class="modal-title" id="addVoucherModalLabel">Thêm Voucher Mới</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form action="/baocao/user/submit" method="POST">
                    <div class="modal-body">
                        <input type="hidden" name="action" value="add_voucher">
                        <div class="mb-3">
                            <label for="voucherTitle" class="form-label">Tiêu đề</label>
                            <input type="text" class="form-control" id="voucherTitle" name="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="voucherContent" class="form-label">Nội dung</label>
                            <textarea class="form-control" id="voucherContent" name="content" rows="3" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="voucherName" class="form-label">Mã voucher</label>
                            <input type="text" class="form-control" id="voucherName" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label for="voucherPrice" class="form-label">Giá trị</label>
                            <input type="text" class="form-control" id="voucherPrice" name="price" min="0" step="1000" placeholder="Nhập giá trị (VNĐ)" required>
                            <small class="text-muted">Nhập số tiền giảm giá (ví dụ: 50000) hoặc "FREESHIP" cho miễn phí vận chuyển.</small>
                        </div>
                        <!-- Trong modal Thêm Voucher -->
                        <div class="mb-3">
                            <label for="voucherUser" class="form-label">Người sở hữu</label>
                            <div class="custom-select-wrapper">
                                <div class="custom-select" id="voucherUser">
                                    <div class="custom-select-trigger">
                                        <span id="selectedUser">Tất cả người dùng</span>
                                        <i class="fas fa-chevron-down"></i>
                                    </div>
                                    <div class="custom-options" style="display: none;">
                                        <ul class="option-list">
                                            <li data-value="all" class="option selected">Tất cả người dùng</li>
                                            <?php
                                            $users_query = "SELECT id_user, username FROM khachhang ORDER BY username";
                                            $users_result = $conn->query($users_query);
                                            while ($user = $users_result->fetch_assoc()) {
                                                echo '<li data-value="' . $user['id_user'] . '" class="option">' . htmlspecialchars($user['username']) . '</li>';
                                            }
                                            ?>
                                        </ul>
                                    </div>
                                </div>
                                <input type="hidden" name="id_user" id="voucherUserInput" value="all">
                            </div>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="voucherActive" name="active" checked>
                            <label class="form-check-label" for="voucherActive">
                                Kích hoạt ngay
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        <button type="submit" class="btn btn-pink">Thêm Voucher</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/quanlyvoucher.js"></script>
</body>

</html>