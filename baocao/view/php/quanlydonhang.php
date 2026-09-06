<?php
session_start();
include "../../model/config/connect.php";
// chỉnh sửa
// Lấy dữ liệu từ session
// require_once "xacThucAdmin.php";
// Kiểm tra tham số page từ URL
if (isset($_GET['page']) && is_numeric($_GET['page'])) {
    $_SESSION['current_page'] = (int)$_GET['page'];
    echo $_SESSION['current_page'];
}
$orders = isset($_SESSION['orders']) ? $_SESSION['orders'] : [];
$total_items = isset($_SESSION['total_items']) ? $_SESSION['total_items'] : 0;
$current_page = isset($_SESSION['current_page']) ? $_SESSION['current_page'] : 1;
$items_per_page = isset($_SESSION['items_per_page']) ? $_SESSION['items_per_page'] : 6;
$searchTerm = isset($_SESSION['search']) ? $_SESSION['search'] : '';
$filter = isset($_SESSION['filter']) ? $_SESSION['filter'] : '';
$sort = isset($_SESSION['sort']) ? $_SESSION['sort'] : 'newest';
$total_pages = ceil($total_items / $items_per_page);

$show_detail_modal = isset($_SESSION['show_order_modal']) ? $_SESSION['show_order_modal'] : false;
$order_detail = isset($_SESSION['order_detail']) ? $_SESSION['order_detail'] : null;
// Thêm vào phần đầu quanlydonhang.php, sau các biến session khác
$selected_month = isset($_SESSION['selected_month']) ? $_SESSION['selected_month'] : date('m');
$selected_year = isset($_SESSION['selected_year']) ? $_SESSION['selected_year'] : date('Y');


// Gửi yêu cầu lấy đơn hàng khi tải trang lần đầu nếu chưa có dữ liệu
if (empty($orders) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
?>
    <form id="initialLoadForm" action="/baocao/user/submit" method="POST" style="display: none;">
        <input type="hidden" name="action" value="get_orders">
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

// Xóa session modal sau khi sử dụng
unset($_SESSION['show_order_modal']);
// if (!$show_detail_modal) {
//     unset($_SESSION['orders']);
// }

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Đơn Hàng</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="đơn hàng, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/quanlydonhang.css">

</head>

<body>
    <?php include "sidebar.php"; ?>

    <div class="main-content">
        <!-- Hiển thị thông báo -->
        <?php if (isset($_SESSION['success_message'])): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <?php echo $_SESSION['success_message'];
                unset($_SESSION['success_message']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <?php if (isset($_SESSION['error_message'])): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <?php echo $_SESSION['error_message'];
                unset($_SESSION['error_message']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản Lý Đơn Hàng</h2>
                <p class="text-muted mb-0">Danh sách đơn hàng của khách hàng</p>
            </div>
            <div class="d-flex">
                <div class="input-group me-3" style="width: 250px;">
                    <form action="/baocao/user/submit" method="POST" id="searchForm" class="d-flex w-100">
                        <input type="hidden" name="action" value="get_orders">
                        <input type="hidden" name="page" value="1">
                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                        <div class="test">
                            <input type="text" class="form-control" name="search" id="searchInput" placeholder="Tìm kiếm đơn hàng" value="<?php echo htmlspecialchars($searchTerm); ?>">
                            <button class="btn btn-outline-pink" type="submit">
                                <i class="fas fa-search"></i>
                            </button>
                            <?php if (!empty($searchTerm)): ?>
                                <button type="submit" class="btn btn-outline-secondary ms-1" name="search" value="">
                                    <i class="fas fa-times"></i>
                                </button>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
                <!-- Form lọc theo tháng/năm -->
                <div class="d-flex align-items-center me-3">
                    <form action="/baocao/user/submit" method="POST">
                        <input type="hidden" name="action" value="get_orders_by_month">
                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                        <div class="input-group">
                            <select name="month" class="form-select" style="width: 120px;">
                                <?php for ($i = 1; $i <= 12; $i++): ?>
                                    <option value="<?php echo $i; ?>" <?php echo $selected_month == $i ? 'selected' : ''; ?>>
                                        Tháng <?php echo $i; ?>
                                    </option>
                                <?php endfor; ?>
                            </select>
                            <select name="year" class="form-select" style="width: 100px;">
                                <?php for ($i = date('Y'); $i >= date('Y') - 5; $i--): ?>
                                    <option value="<?php echo $i; ?>" <?php echo $selected_year == $i ? 'selected' : ''; ?>>
                                        <?php echo $i; ?>
                                    </option>
                                <?php endfor; ?>
                            </select>
                            <button type="submit" class="btn btn-pink">
                                <i class="fas fa-filter me-2"></i><span>Lọc</span>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Form xuất Excel -->
                <form action="/baocao/user/submit" method="POST">
                    <input type="hidden" name="action" value="export_excel">
                    <button type="submit" class="btn btn-pink">
                        <i class="fas fa-download me-2"></i><span>Xuất Excel</span>
                    </button>
                </form>
            </div>
        </div>

        <!-- Orders Table -->
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="section-title">Danh Sách Đơn Hàng</h4>
                    <div class="d-flex">
                        <form action="/baocao/user/submit" method="POST" class="me-2">
                            <input type="hidden" name="action" value="get_orders">
                            <input type="hidden" name="page" value="1"> <!-- Luôn reset về trang đầu tiên khi thay đổi filter -->
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                            <select name="filter" class="form-select" onchange="this.form.submit()">
                                <option value="">Tất cả</option>
                                <option value="Đang xử lý" <?php echo $filter == 'Đang xử lý' ? 'selected' : ''; ?>>Đang xử lý</option>
                                <option value="Đang giao" <?php echo $filter == 'Đang giao' ? 'selected' : ''; ?>>Đang giao</option>
                                <option value="Đã giao" <?php echo $filter == 'Đã giao' ? 'selected' : ''; ?>>Đã giao</option>
                                <option value="Đã hủy" <?php echo $filter == 'Đã hủy' ? 'selected' : ''; ?>>Đã hủy</option>
                            </select>
                        </form>
                        <form action="/baocao/user/submit" method="POST">
                            <input type="hidden" name="action" value="get_orders">
                            <input type="hidden" name="page" value="1"> <!-- Luôn reset về trang đầu tiên khi thay đổi sort -->
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                            <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                            <select name="sort" class="form-select" onchange="this.form.submit()">
                                <option value="newest" <?php echo $sort == 'newest' ? 'selected' : ''; ?>>Mới nhất</option>
                                <option value="oldest" <?php echo $sort == 'oldest' ? 'selected' : ''; ?>>Cũ nhất</option>
                                <option value="highest" <?php echo $sort == 'highest' ? 'selected' : ''; ?>>Giá cao nhất</option>
                                <option value="lowest" <?php echo $sort == 'lowest' ? 'selected' : ''; ?>>Giá thấp nhất</option>
                            </select>
                        </form>
                    </div>
                </div>

                <!-- Hiển thị thông báo -->
                <?php if (isset($_SESSION['message'])): ?>
                    <div class="alert alert-<?php echo htmlspecialchars($_SESSION['message']['type']); ?> alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($_SESSION['message']['text']); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                    <?php unset($_SESSION['message']); ?>
                <?php endif; ?>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Mã ĐH</th>
                                <th>Khách Hàng</th>
                                <th>SĐT</th>
                                <th>Địa Chỉ</th>
                                <th>Tổng Tiền</th>
                                <th>PT Thanh Toán</th>
                                <th>Trạng Thái</th>
                                <th>Ngày Tạo</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!empty($orders)): ?>
                                <?php foreach ($orders as $row): ?>
                                    <?php
                                    $status_class = '';
                                    $status_text = '';
                                    switch ($row['trangthai']) {
                                        case 'Đã giao':
                                            $status_class = 'badge bg-success';
                                            $status_text = 'Đã giao';
                                            break;
                                        case 'Đang giao':
                                            $status_class = 'badge bg-primary';
                                            $status_text = 'Đang giao';
                                            break;
                                        case 'Đã hủy':
                                            $status_class = 'badge bg-danger';
                                            $status_text = 'Đã hủy';
                                            break;
                                        case 'Đang xử lý':
                                        default:
                                            $status_class = 'badge bg-info';
                                            $status_text = 'Đang xử lý';
                                            break;
                                    }
                                    $orderDate = !empty($row['ngaydat']) ? date('d/m/Y H:i', strtotime($row['ngaydat'])) : 'Chưa xác định';
                                    ?>
                                    <tr>
                                        <td>#<?php echo $row['id']; ?></td>
                                        <td><?php echo htmlspecialchars($row['fullname']); ?></td>
                                        <td><?php echo htmlspecialchars($row['phone']); ?></td>
                                        <td><?php echo !empty($row['address']) ? htmlspecialchars($row['address']) : 'Chưa có địa chỉ'; ?></td>
                                        <td><?php echo number_format($row['grandtotal']); ?>đ</td>
                                        <td><?php echo $row['paymentmethod'] == 'cod' ? 'COD' : 'Chuyển khoản'; ?></td>
                                        <td><span class="<?php echo $status_class; ?>"><?php echo $status_text; ?></span></td>
                                        <td><?php echo $orderDate; ?></td>
                                        <td>
                                            <!-- Nút xem chi tiết -->
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;">
                                                <input type="hidden" name="action" value="get_order_detail">
                                                <input type="hidden" name="id" value="<?php echo $row['id']; ?>">
                                                <input type="hidden" name="page" value="<?php echo $current_page; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-primary me-1" title="Xem chi tiết">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </form>

                                            <!-- Nút xuất hóa đơn -->
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;">
                                                <input type="hidden" name="action" value="export_invoice">
                                                <input type="hidden" name="id" value="<?php echo $row['id']; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-secondary me-1" title="Xuất hóa đơn">
                                                    <i class="fas fa-file-pdf"></i>
                                                </button>
                                            </form>

                                            <!-- Nút xác nhận/xác nhận giao -->
                                            <?php if ($row['trangthai'] == 'Đang xử lý' || $row['trangthai'] == 'Đang giao'): ?>
                                                <button class="btn btn-sm btn-outline-success me-1 update-status-btn"
                                                    data-order-id="<?php echo $row['id']; ?>"
                                                    data-status="completed"
                                                    title="<?php echo $row['trangthai'] == 'Đang xử lý' ? 'Xác nhận giao' : 'Xác nhận đã giao'; ?>">
                                                    <?php echo $row['trangthai'] == 'Đang xử lý' ? '<i class="fas fa-truck"></i>' : '<i class="fas fa-check-double"></i>'; ?>
                                                </button>
                                            <?php elseif ($row['trangthai'] == 'Đã giao'): ?>
                                                <button class="btn btn-sm btn-outline-success me-1" disabled title="Đơn hàng đã hoàn thành">
                                                    <i class="fas fa-check-circle"></i> Đã hoàn thành
                                                </button>
                                            <?php endif; ?>

                                            <!-- Nút hủy đơn -->
                                            <?php if ($row['trangthai'] != 'Đã giao' && $row['trangthai'] != 'Đã hủy'): ?>
                                                <button class="btn btn-sm btn-outline-danger cancel-order-btn"
                                                    data-order-id="<?php echo $row['id']; ?>"
                                                    title="Hủy đơn">
                                                    <i class="fas fa-ban"></i>
                                                </button>
                                            <?php endif; ?>
                                        </td> <!-- update -->
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="9" class="text-center">Không có đơn hàng nào</td>
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
                                        <input type="hidden" name="action" value="<?php echo !empty($selected_month) && !empty($selected_year) ? 'get_orders_by_month' : 'get_orders'; ?>">
                                        <input type="hidden" name="page" value="<?php echo $current_page - 1; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <?php if (!empty($selected_month) && !empty($selected_year)): ?>
                                            <input type="hidden" name="month" value="<?php echo $selected_month; ?>">
                                            <input type="hidden" name="year" value="<?php echo $selected_year; ?>">
                                        <?php endif; ?>
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
                                        <input type="hidden" name="action" value="<?php echo !empty($selected_month) && !empty($selected_year) ? 'get_orders_by_month' : 'get_orders'; ?>">
                                        <input type="hidden" name="page" value="1">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <?php if (!empty($selected_month) && !empty($selected_year)): ?>
                                            <input type="hidden" name="month" value="<?php echo $selected_month; ?>">
                                            <input type="hidden" name="year" value="<?php echo $selected_year; ?>">
                                        <?php endif; ?>
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
                                            <input type="hidden" name="action" value="<?php echo !empty($selected_month) && !empty($selected_year) ? 'get_orders_by_month' : 'get_orders'; ?>">
                                            <input type="hidden" name="page" value="<?php echo $i; ?>">
                                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                            <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                            <?php if (!empty($selected_month) && !empty($selected_year)): ?>
                                                <input type="hidden" name="month" value="<?php echo $selected_month; ?>">
                                                <input type="hidden" name="year" value="<?php echo $selected_year; ?>">
                                            <?php endif; ?>
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
                                        <input type="hidden" name="action" value="<?php echo !empty($selected_month) && !empty($selected_year) ? 'get_orders_by_month' : 'get_orders'; ?>">
                                        <input type="hidden" name="page" value="<?php echo $total_pages; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <?php if (!empty($selected_month) && !empty($selected_year)): ?>
                                            <input type="hidden" name="month" value="<?php echo $selected_month; ?>">
                                            <input type="hidden" name="year" value="<?php echo $selected_year; ?>">
                                        <?php endif; ?>
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
                                        <input type="hidden" name="action" value="<?php echo !empty($selected_month) && !empty($selected_year) ? 'get_orders_by_month' : 'get_orders'; ?>">
                                        <input type="hidden" name="page" value="<?php echo $current_page + 1; ?>">
                                        <input type="hidden" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>">
                                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($filter); ?>">
                                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                                        <?php if (!empty($selected_month) && !empty($selected_year)): ?>
                                            <input type="hidden" name="month" value="<?php echo $selected_month; ?>">
                                            <input type="hidden" name="year" value="<?php echo $selected_year; ?>">
                                        <?php endif; ?>
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

    <!-- Modal Chi Tiết Đơn Hàng -->
    <?php if ($show_detail_modal && isset($order_detail['order'])): ?>
        <?php
        // Xác định class và text cho trạng thái đơn hàng trong modal
        $modal_status_class = '';
        $modal_status_text = '';
        switch ($order_detail['order']['trangthai']) {
            case 'Đã giao':
                $modal_status_class = 'badge bg-success';
                $modal_status_text = 'Đã giao';
                break;
            case 'Đang giao':
                $modal_status_class = 'badge bg-primary';
                $modal_status_text = 'Đang giao';
                break;
            case 'Đã hủy':
                $modal_status_class = 'badge bg-danger';
                $modal_status_text = 'Đã hủy';
                break;
            case 'Đang xử lý':
            default:
                $modal_status_class = 'badge bg-info';
                $modal_status_text = 'Đang xử lý';
                break;
        }
        ?>
        <div class="modal fade show" id="orderDetailModal" tabindex="-1" aria-labelledby="orderDetailModalLabel" style="display: block; background-color: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <h5 class="modal-title" id="orderDetailModalLabel">Chi Tiết Đơn Hàng #<?php echo $order_detail['order']['id']; ?></h5>
                        <a href="/baocao/quanlydonhang" class="btn-close" aria-label="Close"></a>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Thông Tin Khách Hàng</h6>
                                <p class="mb-1"><strong>Họ tên:</strong> <?php echo htmlspecialchars($order_detail['order']['fullname']); ?></p>
                                <p class="mb-1"><strong>Số điện thoại:</strong> <?php echo htmlspecialchars($order_detail['order']['phone']); ?></p>
                                <p class="mb-1"><strong>Địa chỉ:</strong> <?php echo !empty($order_detail['order']['address']) ? htmlspecialchars($order_detail['order']['address']) : 'Chưa có địa chỉ'; ?></p>
                                <p class="mb-1"><strong>Ghi chú:</strong> <?php echo !empty($order_detail['order']['note']) ? htmlspecialchars($order_detail['order']['note']) : 'Không có ghi chú'; ?></p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Thông Tin Đơn Hàng</h6>
                                <p class="mb-1"><strong>Mã đơn hàng:</strong> #<?php echo $order_detail['order']['id']; ?></p>
                                <p class="mb-1"><strong>Phương thức thanh toán:</strong> <?php echo $order_detail['order']['paymentmethod'] == 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'; ?></p>
                                <p class="mb-1"><strong>Ngày đặt:</strong> <?php echo !empty($order_detail['order']['ngaydat']) ? date('d/m/Y', strtotime($order_detail['order']['ngaydat'])) : 'N/A'; ?></p>
                                <p class="mb-1"><strong>Trạng thái:</strong>
                                    <span class="<?php echo $modal_status_class; ?>"><?php echo $modal_status_text; ?></span>
                                </p>
                            </div>
                        </div>
                        <h6 class="fw-bold mb-3">Sản Phẩm Đã Đặt</h6>
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th width="80">Hình Ảnh</th>
                                        <th>Tên Sản Phẩm</th>
                                        <th>Kích Cỡ</th>
                                        <th>Số Lượng</th>
                                        <th>Đơn Giá</th>
                                        <th>Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (!empty($order_detail['details'])): ?>
                                        <?php foreach ($order_detail['details'] as $item): ?>
                                            <?php $total = $item['price'] * $item['quantity']; ?>
                                            <tr>
                                                <td>
                                                    <?php if (!empty($item['image'])): ?>
                                                        <img src="/baocao/view/img/<?php echo basename($item['image']); ?>" alt="<?php echo htmlspecialchars($item['name_product']); ?>" width="50" height="50" class="img-thumbnail">
                                                    <?php else: ?>
                                                        <div class="img-thumbnail d-flex align-items-center justify-content-center" style="width:50px;height:50px;">
                                                            <i class="fas fa-image text-muted"></i>
                                                        </div>
                                                    <?php endif; ?>
                                                </td>
                                                <td><?php echo htmlspecialchars($item['name_product'], ENT_QUOTES); ?></td>
                                                <td><?php echo htmlspecialchars($item['size']); ?></td>
                                                <td><?php echo $item['quantity']; ?></td>
                                                <td><?php echo number_format($item['price']); ?>đ</td>
                                                <td><?php echo number_format($total); ?>đ</td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="6" class="text-center">Không có sản phẩm nào</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                        <div class="row mt-4">
                            <div class="col-md-6"></div>
                            <div class="col-md-6">
                                <div class="bg-light p-3 rounded">
                                    <h6 class="fw-bold mb-3">Tổng Thanh Toán</h6>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>Tổng tiền hàng:</span>
                                        <span><?php echo number_format($order_detail['order']['totalAll']); ?>đ</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>Giảm giá:</span>
                                        <span><?php echo number_format($order_detail['order']['sale']); ?>đ</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>Phí vận chuyển:</span>
                                        <span><?php echo number_format($order_detail['order']['tienship']); ?>đ</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>Miễn phí vận chuyển:</span>
                                        <span><?php echo $order_detail['order']['freeship'] == 'yes' ? 'Có' : 'Không'; ?></span>
                                    </div>
                                    <hr>
                                    <div class="d-flex justify-content-between">
                                        <strong>Tổng thanh toán:</strong>
                                        <strong class="text-danger"><?php echo number_format($order_detail['order']['grandtotal']); ?>đ</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <a href="/baocao/quanlydonhang" class="btn btn-secondary">Đóng</a>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>
    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/quanlydonhang.js"></script>
    <script>
        function adjustSearchBarWidth() {
            const searchBar = document.querySelector('.input-group.me-3');
            if (searchBar) { // Kiểm tra xem phần tử có tồn tại không
                if (window.innerWidth <= 768) {
                    searchBar.style.width = '100%'; // Đặt trực tiếp width 100%
                    searchBar.style.maxWidth = 'none'; // Loại bỏ giới hạn chiều rộng
                } else {
                    searchBar.style.width = '250px'; // Khôi phục width cho màn hình lớn
                    searchBar.style.maxWidth = '250px'; // Giới hạn chiều rộng
                }
            }
        }

        // Gọi hàm khi tải trang
        window.addEventListener('load', adjustSearchBarWidth);
        // Gọi hàm khi thay đổi kích thước màn hình
        window.addEventListener('resize', adjustSearchBarWidth);
    </script>
</body>

</html>