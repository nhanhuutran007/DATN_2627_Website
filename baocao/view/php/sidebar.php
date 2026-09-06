<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>sidebar</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="sidebar, thể thao, NHL Sports, thời trang thể thao">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/sidebar.css">
</head>

<body>
    <!-- Sidebar với chức năng toggle -->
    <div class="sidebar" id="sidebar">
        <div class="d-flex align-items-center p-3 border-bottom">
            <a href="/baocao/admin" class="d-flex align-items-center text-decoration-none">
                <img src="/baocao/view/img/logo3.webp" alt="Shop Logo" class="brand-avatar me-2">
                <span class="brand-logo">NHL-Sport</span>
            </a>
        </div>

        <!-- Thêm nút toggle -->
        <div class="sidebar-toggle" id="sidebarToggle">
            <i class="fas fa-chevron-left"></i>
        </div>

        <div class="sidebar-heading">Pages</div>
        <div class="list">
            <ul class="nav flex-column px-2">
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao.add_product' ? 'active' : ''; ?>" href="/baocao/add_product">
                        <i class="fas fa-file"></i> <span>Thêm sản phẩm</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/add_news' ? 'active' : ''; ?>" href="/baocao/add_news">
                        <i class="fas fa-newspaper"></i> <span>Thêm tin tức</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/delete_product' ? 'active' : ''; ?>" href="/baocao/delete_product">
                        <i class="fas fa-edit"></i> <span>Quản lý sản phẩm</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/banner' ? 'active' : ''; ?>" href="/baocao/banner">
                        <i class="fas fa-calendar"></i> <span>Quản lý banner</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/quanlydanhmuc' ? 'active' : ''; ?>" href="/baocao/quanlydanhmuc">
                        <i class="fas fa-list"></i> <span>Quản lý danh mục</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/quanlytaikhoan' ? 'active' : ''; ?>" href="/baocao/quanlytaikhoan">
                        <i class="fas fa-user-friends"></i> <span>Quản lý tài khoản</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/quanlydonhang' ? 'active' : ''; ?>" href="/baocao/quanlydonhang">
                        <i class="fas fa-shopping-cart"></i> <span>Quản lý đơn hàng</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/quanlyvoucher' ? 'active' : ''; ?>" href="/baocao/quanlyvoucher">
                        <i class="fas fa-tags"></i> <span>Quản lý voucher</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/quanlytintuc' ? 'active' : ''; ?>" href="/baocao/quanlytintuc">
                        <i class="fas fa-cogs"></i> <span>Quản lý tin tức</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/admin_chat' ? 'active' : ''; ?>" href="/baocao/admin_chat">
                        <i class="fas fa-comment"></i> <span>Tin nhắn</span>
                    </a>
                </li>
                <li class="nav-item">
                    <button class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == '/baocao/model/config/daily_backup.php' ? 'active' : ''; ?>" id="backupButton">
                        <i class="fas fa-file-export"></i> <span>Lưu trữ dữ liệu</span>
                    </button>
                </li>
                <!-- Nút Đăng xuất -->
                <li class="nav-item">
                    <form action="/baocao/user/submit" method="POST" style="margin: 0;">
                        <button type="submit" name="logout" class="nav-link logout-btn logout-centered" style="border: none; background: none; width: 100%;">
                            <i class="fas fa-sign-out-alt"></i> <span>Đăng xuất</span>
                        </button>
                    </form>
                </li>
            </ul>
        </div>
    </div>

    <!-- Script cho toggle -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const mainContent = document.querySelector('.main-content');

            // Khôi phục trạng thái từ localStorage nếu có
            const sidebarState = localStorage.getItem('sidebarState');
            if (sidebarState === 'collapsed') {
                sidebar.classList.add('collapsed');
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
                if (mainContent) {
                    mainContent.classList.add('expanded');
                }
            }

            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');

                // Lưu trạng thái vào localStorage
                if (sidebar.classList.contains('collapsed')) {
                    localStorage.setItem('sidebarState', 'collapsed');
                    sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
                } else {
                    localStorage.setItem('sidebarState', 'expanded');
                    sidebarToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
                }

                // Thay đổi margin cho main-content nếu nó tồn tại
                if (mainContent) {
                    mainContent.classList.toggle('expanded');
                }
            });


            const backupButton = document.getElementById('backupButton');
            if (backupButton) {
                backupButton.addEventListener('click', function() {
                    backupButton.disabled = true;
                    backupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Đang lưu trữ...</span>';

                    fetch('/baocao/model/config/daily_backup.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Phản hồi từ server không thành công: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                alert('Backup thành công: ' + data.filename);
                                // Tải file từ đường dẫn tuyệt đối
                                const fileUrl = '/baocao/model/config/' + data.filename; // /backups/nhlsports_20250514_205900.sql
                                const link = document.createElement('a');
                                link.href = fileUrl;
                                link.download = data.filename.split('/').pop(); // nhlsports_20250514_205900.sql
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            } else {
                                alert('Backup thất bại: ' + (data.error || 'Lỗi không xác định'));
                            }
                        })
                        .catch(error => {
                            alert('Lỗi khi thực hiện backup: ' + error.message);
                        })
                        .finally(() => {
                            backupButton.disabled = false;
                            backupButton.innerHTML = '<i class="fas fa-file-export"></i> <span>Lưu trữ dữ liệu</span>';
                        });
                });
            }

        });
    </script>
</body>

</html>