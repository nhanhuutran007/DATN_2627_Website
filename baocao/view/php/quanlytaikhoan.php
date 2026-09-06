<?php
include "../../model/config/connect.php";
session_start();
require_once "xacThucAdmin.php";
$success_msg = $_SESSION['success_msg'] ?? '';
$error_msg = $_SESSION['error_msg'] ?? '';
unset($_SESSION['success_msg'], $_SESSION['error_msg']);

// Số tài khoản mỗi trang
$accounts_per_page = 6;

// Lấy trang hiện tại từ query string, mặc định là trang 1
$current_page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$current_page = max(1, $current_page); // Đảm bảo trang không nhỏ hơn 1

// Tính offset cho truy vấn SQL
$offset = ($current_page - 1) * $accounts_per_page;

// Xử lý tìm kiếm tài khoản
$search_term = isset($_GET['search']) ? mysqli_real_escape_string($conn, $_GET['search']) : '';
$where_clause = '';
if (!empty($search_term)) {
    $where_clause = " WHERE username LIKE '%$search_term%' 
                     OR email LIKE '%$search_term%' 
                     OR fullname LIKE '%$search_term%' 
                     OR phone LIKE '%$search_term%'";
}

// Đếm tổng số tài khoản để tính số trang
$count_query = "SELECT COUNT(*) as total FROM khachhang" . $where_clause;
$count_result = mysqli_query($conn, $count_query);
$total_accounts = mysqli_fetch_assoc($count_result)['total'];
$total_pages = ceil($total_accounts / $accounts_per_page);

// Lấy danh sách tài khoản cho trang hiện tại
$users_query = "SELECT * FROM khachhang" . $where_clause . " ORDER BY id_user ASC LIMIT $accounts_per_page OFFSET $offset";
$users_result = mysqli_query($conn, $users_query);
$users = [];
while ($row = mysqli_fetch_assoc($users_result)) {
    $users[] = $row;
}
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Tài Khoản</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="quản lý, thể thao, NHL Sports, thời trang thể thao">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/quanlytaikhoan.css">
</head>
<body>
    <?php include "sidebar.php"; ?>
    <div class="main-content">
        <!-- Thông báo -->
        <?php if (!empty($success_msg)): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <?php echo htmlspecialchars($success_msg); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Đóng"></button>
            </div>
        <?php endif; ?>
        <?php if (!empty($error_msg)): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                <?php echo htmlspecialchars($error_msg); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Đóng"></button>
            </div>
        <?php endif; ?>

        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h3 class="section-title">Danh Sách Tài Khoản</h3>
                            <button class="btn btn-pink" data-bs-toggle="modal" data-bs-target="#addUserModal">
                                <i class="fas fa-plus"></i> Thêm Tài Khoản
                            </button>
                        </div>

                        <!-- Form tìm kiếm -->
                        <div class="mb-4">
                            <form action="" method="GET" class="d-flex">
                                <input type="search" name="search" class="form-control me-2" placeholder="Tìm kiếm tài khoản..." value="<?php echo htmlspecialchars($search_term); ?>">
                                <input type="hidden" name="page" value="1"> <!-- Reset về trang 1 khi tìm kiếm -->
                                <button type="submit" class="btn btn-pink">
                                    <i class="fas fa-search"></i> Tìm
                                </button>
                            </form>
                        </div>

                        <!-- Bảng tài khoản -->
                        <div class="table-responsive">
                            <table class="table table-hover user-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Ảnh đại diện</th>
                                        <th>Tên đăng nhập</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (count($users) > 0): ?>
                                        <?php foreach ($users as $user): ?>
                                            <tr>
                                                <td data-label="ID"><?php echo $user['id_user']; ?></td>
                                                <td data-label="Ảnh đại diện">
                                                    <?php if (!empty($user['avatar'])): ?>
                                                        <img src="/baocao/view/img/upload/avatar/<?php echo $user['avatar']; ?>" alt="Ảnh đại diện" class="user-avatar">
                                                    <?php else: ?>
                                                        <div class="user-avatar-placeholder">
                                                            <i class="fas fa-user"></i>
                                                        </div>
                                                    <?php endif; ?>
                                                </td>
                                                <td data-label="Tên đăng nhập">
                                                    <a href="#" class="username-link" data-bs-toggle="modal" data-bs-target="#userDetailModal<?php echo $user['id_user']; ?>">
                                                        <?php echo htmlspecialchars($user['username']); ?>
                                                    </a>
                                                </td>
                                                <td data-label="Hành động">
                                                    <div class="d-flex gap-2">
                                                        <button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editUserModal<?php echo $user['id_user']; ?>" title="Sửa">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <button type="button" class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#deleteModal<?php echo $user['id_user']; ?>" title="Xóa">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            <!-- Modal Chi tiết tài khoản -->
                                            <div class="modal fade user-detail-modal" id="userDetailModal<?php echo $user['id_user']; ?>" tabindex="-1" aria-labelledby="userDetailModalLabel" aria-hidden="true">
                                                <div class="modal-dialog modal-lg">
                                                    <div class="modal-content">
                                                        <div class="modal-header">
                                                            <h5 class="modal-title" id="userDetailModalLabel">Chi tiết tài khoản: <?php echo htmlspecialchars($user['username']); ?></h5>
                                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                                                        </div>
                                                        <div class="modal-body">
                                                            <div class="row">
                                                                <div class="col-md-4 text-center">
                                                                    <?php if (!empty($user['avatar'])): ?>
                                                                        <img src="/baocao/view/img/upload/avatar/<?php echo $user['avatar']; ?>" alt="Ảnh đại diện" class="img-fluid rounded-circle mb-3" style="max-width: 150px;">
                                                                    <?php else: ?>
                                                                        <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center mb-3" style="width: 150px; height: 150px;">
                                                                            <i class="fas fa-user fa-3x"></i>
                                                                        </div>
                                                                    <?php endif; ?>
                                                                </div>
                                                                <div class="col-md-8">
                                                                    <p><strong>ID:</strong> <?php echo $user['id_user']; ?></p>
                                                                    <p><strong>Tên đăng nhập:</strong> <?php echo htmlspecialchars($user['username']); ?></p>
                                                                    <p><strong>Họ và tên:</strong> <?php echo htmlspecialchars($user['fullname'] ?? 'Chưa cập nhật'); ?></p>
                                                                    <p><strong>Email:</strong> <?php echo htmlspecialchars($user['email'] ?? 'Chưa cập nhật'); ?></p>
                                                                    <p><strong>Số điện thoại:</strong> <?php echo htmlspecialchars($user['phone'] ?? 'Chưa cập nhật'); ?></p>
                                                                    <p><strong>Địa chỉ:</strong> <?php echo htmlspecialchars($user['address'] ?? 'Chưa cập nhật'); ?></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="modal-footer">
                                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Modal Sửa tài khoản -->
                                            <div class="modal fade" id="editUserModal<?php echo $user['id_user']; ?>" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
                                                <div class="modal-dialog">
                                                    <div class="modal-content">
                                                        <div class="modal-header">
                                                            <h5 class="modal-title" id="editUserModalLabel">Sửa Tài Khoản: <?php echo htmlspecialchars($user['username']); ?></h5>
                                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                                                        </div>
                                                        <div class="modal-body">
                                                            <form action="/baocao/user/submit" method="POST" class="needs-validation" novalidate>
                                                                <input type="hidden" name="id_user" value="<?php echo $user['id_user']; ?>">
                                                                <div class="mb-3">
                                                                    <label for="username" class="form-label">Tên đăng nhập</label>
                                                                    <input type="text" class="form-control" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required>
                                                                    <div class="invalid-feedback">Tên đăng nhập không được để trống.</div>
                                                                </div>
                                                                <div class="mb-3">
                                                                    <label for="email" class="form-label">Email</label>
                                                                    <input type="email" class="form-control" name="email" value="<?php echo htmlspecialchars($user['email'] ?? ''); ?>" 
                                                                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
                                                                    <div class="invalid-feedback">Vui lòng nhập email hợp lệ (ví dụ: example@domain.com).</div>
                                                                </div>
                                                                <div class="mb-3">
                                                                    <label for="fullname" class="form-label">Họ và tên</label>
                                                                    <input type="text" class="form-control" name="fullname" value="<?php echo htmlspecialchars($user['fullname'] ?? ''); ?>">
                                                                </div>
                                                                <div class="mb-3">
                                                                    <label for="phone" class="form-label">Số điện thoại</label>
                                                                    <input type="text" class="form-control" name="phone" value="<?php echo htmlspecialchars($user['phone'] ?? ''); ?>" 
                                                                        pattern="\d{10}" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '');">
                                                                    <div class="invalid-feedback">Số điện thoại phải có đúng 10 chữ số (không bao gồm ký tự khác).</div>
                                                                </div>
                                                                <div class="mb-3">
                                                                    <label for="address" class="form-label">Địa chỉ</label>
                                                                    <input type="text" class="form-control" name="address" value="<?php echo htmlspecialchars($user['address'] ?? ''); ?>">
                                                                </div>
                                                               
                                                                <div class="mb-3">
                                                                    <label for="admin_password" class="form-label">Mật khẩu admin (bắt buộc để xác nhận thay đổi)</label>
                                                                    <div class="input-group">
                                                                        <input type="password" class="form-control" name="admin_password" id="admin_password_<?php echo $user['id_user']; ?>" 
                                                                            minlength="8" pattern=".{8,}" required>
                                                                        <button type="button" class="btn btn-outline-secondary toggle-password" data-target="admin_password_<?php echo $user['id_user']; ?>">
                                                                            <i class="fas fa-eye"></i>
                                                                        </button>
                                                                        <div class="invalid-feedback">Mật khẩu admin phải có ít nhất 8 ký tự.</div>
                                                                    </div>
                                                                </div>
                                                            
                                                                <div class="mb-3">
                                                                    <label for="password" class="form-label">Mật khẩu mới (để trống nếu không thay đổi)</label>
                                                                    <div class="input-group">
                                                                        <input type="password" class="form-control" name="password" id="password_<?php echo $user['id_user']; ?>" 
                                                                            minlength="8" pattern=".{8,}">
                                                                        <button type="button" class="btn btn-outline-secondary toggle-password" data-target="password_<?php echo $user['id_user']; ?>">
                                                                            <i class="fas fa-eye"></i>
                                                                        </button>
                                                                        <div class="invalid-feedback">Mật khẩu mới phải có ít nhất 8 ký tự.</div>
                                                                    </div>
                                                                </div>
                                                                <button type="submit" name="editUser" class="btn btn-pink">Lưu</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <!-- Modal Xác nhận xóa -->
                                            <div class="modal fade delete-confirm-modal" id="deleteModal<?php echo $user['id_user']; ?>" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
                                                <div class="modal-dialog">
                                                    <div class="modal-content">
                                                        <div class="modal-header">
                                                            <h5 class="modal-title" id="deleteModalLabel">Xác nhận xóa tài khoản</h5>
                                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                                                        </div>
                                                        <div class="modal-body">
                                                            <?php if ($user['username'] === 'admin'): ?>
                                                                <div class="">
                                                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                                                    Không thể xóa tài khoản admin!
                                                                </div>
                                                            <?php else: ?>
                                                                Bạn có chắc chắn muốn xóa tài khoản <strong><?php echo htmlspecialchars($user['username']); ?></strong>?
                                                                <p class="text-danger mt-2"><small>Lưu ý: Hành động này không thể hoàn tác.</small></p>
                                                            <?php endif; ?>
                                                        </div>
                                                        <div class="modal-footer">
                                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                                                            <?php if ($user['username'] !== 'admin'): ?>
                                                                <form action="/baocao/user/submit" method="POST">
                                                                    <input type="hidden" name="id_user" value="<?php echo $user['id_user']; ?>">
                                                                    <button type="submit" name="xoataikhoan" class="btn btn-danger">Xóa</button>
                                                                </form>
                                                            <?php endif; ?>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    <?php else: ?>
                                        <tr>
                                            <td colspan="4" class="text-center py-3">Không tìm thấy tài khoản nào</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>

                        <!-- Phân trang -->
                        <?php if ($total_pages > 1): ?>
                            <nav aria-label="Phân trang tài khoản" class="mt-4">
                                <ul class="pagination justify-content-center">
                                    <!-- Nút Trang trước -->
                                    <li class="page-item <?php echo $current_page <= 1 ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $current_page - 1; ?><?php echo !empty($search_term) ? '&search=' . urlencode($search_term) : ''; ?>" aria-label="Trước">
                                            <span aria-hidden="true">&laquo;</span>
                                        </a>
                                    </li>
                                    <!-- Các số trang -->
                                    <?php
                                    $start_page = max(1, $current_page - 2);
                                    $end_page = min($total_pages, $current_page + 2);
                                    // Hiển thị dấu ba chấm nếu cần
                                    if ($start_page > 1): ?>
                                        <li class="page-item"><a class="page-link" href="?page=1<?php echo !empty($search_term) ? '&search=' . urlencode($search_term) : ''; ?>">1</a></li>
                                        <?php if ($start_page > 2): ?>
                                            <li class="page-item disabled"><span class="page-link">...</span></li>
                                        <?php endif; ?>
                                    <?php endif; ?>
                                    <!-- Hiển thị các trang gần trang hiện tại -->
                                    <?php for ($i = $start_page; $i <= $end_page; $i++): ?>
                                        <li class="page-item <?php echo $i == $current_page ? 'active' : ''; ?>">
                                            <a class="page-link" href="?page=<?php echo $i; ?><?php echo !empty($search_term) ? '&search=' . urlencode($search_term) : ''; ?>"><?php echo $i; ?></a>
                                        </li>
                                    <?php endfor; ?>
                                    <!-- Hiển thị dấu ba chấm và trang cuối nếu cần -->
                                    <?php if ($end_page < $total_pages): ?>
                                        <?php if ($end_page < $total_pages - 1): ?>
                                            <li class="page-item disabled"><span class="page-link">...</span></li>
                                        <?php endif; ?>
                                        <li class="page-item"><a class="page-link" href="?page=<?php echo $total_pages; ?><?php echo !empty($search_term) ? '&search=' . urlencode($search_term) : ''; ?>"><?php echo $total_pages; ?></a></li>
                                    <?php endif; ?>
                                    <!-- Nút Trang sau -->
                                    <li class="page-item <?php echo $current_page >= $total_pages ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $current_page + 1; ?><?php echo !empty($search_term) ? '&search=' . urlencode($search_term) : ''; ?>" aria-label="Sau">
                                            <span aria-hidden="true">&raquo;</span>
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Thêm tài khoản -->
        <div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addUserModalLabel">Thêm Tài Khoản Mới</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                    </div>
                    <div class="modal-body">
                        <form action="/baocao/user/submit" method="POST" class="needs-validation" novalidate>
                            <div class="mb-3">
                                <label for="username" class="form-label">Tên đăng nhập</label>
                                <input type="text" class="form-control" name="username" required>
                                <div class="invalid-feedback">Tên đăng nhập không được để trống.</div>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Mật khẩu</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" name="password" id="new_user_password" minlength="8" pattern=".{8,}" required>
                                    <button type="button" class="btn btn-outline-secondary toggle-password" data-target="new_user_password">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <div class="invalid-feedback">Mật khẩu phải có ít nhất 8 ký tự.</div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" name="email" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
                                <div class="invalid-feedback">Vui lòng nhập email hợp lệ.</div>
                            </div>
                            <div class="mb-3">
                                <label for="fullname" class="form-label">Họ và tên</label>
                                <input type="text" class="form-control" name="fullname">
                            </div>
                            <div class="mb-3">
                                <label for="phone" class="form-label">Số điện thoại</label>
                                <input type="text" class="form-control" name="phone" pattern="\d{10}" maxlength="10">
                                <div class="invalid-feedback">Số điện thoại phải có đúng 10 chữ số.</div>
                            </div>
                            <div class="mb-3">
                                <label for="address" class="form-label">Địa chỉ</label>
                                <input type="text" class="form-control" name="address">
                            </div>
                            <button type="submit" name="addUser" class="btn btn-pink">Thêm</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/baocao/view/js/quanlytaikhoan.js"></script>
</body>
</html>