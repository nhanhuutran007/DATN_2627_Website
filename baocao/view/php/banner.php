<?php
session_start();
include "../../model/config/connect.php";
require_once "xacThucAdmin.php";
// Lấy dữ liệu từ session
$head_banners = isset($_SESSION['head_banners']) ? $_SESSION['head_banners'] : [];
$mid_banners = isset($_SESSION['mid_banners']) ? $_SESSION['mid_banners'] : [];
$foot_banners = isset($_SESSION['foot_banners']) ? $_SESSION['foot_banners'] : [];

// Xóa session banner sau khi sử dụng
unset($_SESSION['head_banners']);
unset($_SESSION['mid_banners']);
unset($_SESSION['foot_banners']);

// Gửi yêu cầu lấy banner khi tải trang lần đầu nếu chưa có dữ liệu
if (empty($head_banners) && empty($mid_banners) && empty($foot_banners) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
?>
    <form id="initialLoadForm" action="/baocao/user/submit" method="GET" style="display: none;">
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
    <title>Quản lý Banner</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="banner, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/banner.css">
</head>

<body>
    <!-- Sidebar -->
    <?php include "sidebar.php"; ?>

    <!-- Main Content -->
    <div class="main-content">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản lý Banner</h2>
                <p class="text-muted mb-0">Thêm, xóa banner quảng cáo</p>
            </div>
        </div>

        <?php if (isset($_SESSION['message'])): ?>
            <div class="alert <?php echo $_SESSION['message_type'] == 'success' ? 'alert-success' : 'alert-danger'; ?> alert-dismissible fade show" role="alert">
                <i class="fas fa-<?php echo $_SESSION['message_type'] == 'success' ? 'check' : 'exclamation'; ?>-circle me-2"></i>
                <?php echo htmlspecialchars($_SESSION['message']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
            <?php
            unset($_SESSION['message']);
            unset($_SESSION['message_type']);
            ?>
        <?php endif; ?>

        <ul class="nav nav-tabs mb-4" id="bannerTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="head-tab" data-bs-toggle="tab" data-bs-target="#head-banner" type="button" role="tab">Head Banner</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="mid-tab" data-bs-toggle="tab" data-bs-target="#mid-banner" type="button" role="tab">Mid Banner</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="foot-tab" data-bs-toggle="tab" data-bs-target="#foot-banner" type="button" role="tab">Foot Banner</button>
            </li>
        </ul>

        <div class="tab-content" id="bannerTabsContent">
            <!-- Tab Head Banner -->
            <div class="tab-pane fade show active" id="head-banner" role="tabpanel">
                <!-- Form thêm head banner mới -->
                <div class="card mb-4">
                    <div class="card-body">
                        <h4 class="section-title">Thêm Head Banner Mới</h4>
                        <form method="post" enctype="multipart/form-data" action="/baocao/user/submit">
                            <div class="mb-3">
                                <label class="form-label">Hình ảnh banner (Desktop) <span class="text-danger">*</span></label>
                                <input type="file" name="banner_image" class="form-control" required accept="image/*">
                                <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hình ảnh banner (Mobile)</label>
                                <input type="file" name="mb_image" class="form-control" accept="image/*">
                                <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                            </div>
                            <button type="submit" name="add_banner" class="btn btn-pink">
                                <i class="fas fa-plus me-2"></i>Thêm Head Banner
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Danh sách head banner -->
                <div class="row">
                    <?php if (!empty($head_banners)): ?>
                        <?php foreach ($head_banners as $banner): ?>
                            <div class="col-md-6 mb-4">
                                <div class="banner-card">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h5>Desktop Banner</h5>
                                            <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image']); ?>" alt="Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                        </div>
                                        <div class="col-md-6">
                                            <?php if (!empty($banner['mb_image'])): ?>
                                                <h5>Mobile Banner</h5>
                                                <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['mb_image']); ?>" alt="Mobile Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                            <?php else: ?>
                                                <h5>Mobile Banner</h5>
                                                <div class="alert alert-secondary">Chưa có ảnh mobile</div>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    <div class="action-btns">
                                        <a href="/baocao/user/submit?delete_id=<?php echo $banner['id']; ?>" class="delete-btn" onclick="return confirm('Bạn có chắc muốn xóa banner này?')">
                                            <i class="fas fa-trash me-1"></i>Xóa
                                        </a>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Chưa có head banner nào được thêm
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Tab Mid Banner -->
            <div class="tab-pane fade" id="mid-banner" role="tabpanel">
                <!-- Form thêm mid banner mới -->
                <div class="card mb-4">
                    <div class="card-body">
                        <h4 class="section-title">Thêm Mid Banner Mới</h4>
                        <form method="post" enctype="multipart/form-data" action="/baocao/user/submit">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Hình ảnh 1 <span class="text-danger">*</span></label>
                                    <input type="file" name="image1" class="form-control" required accept="image/*">
                                    <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Hình ảnh 2 <span class="text-danger">*</span></label>
                                    <input type="file" name="image2" class="form-control" required accept="image/*">
                                    <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Hình ảnh 3 <span class="text-danger">*</span></label>
                                    <input type="file" name="image3" class="form-control" required accept="image/*">
                                    <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                                </div>
                            </div>
                            <button type="submit" name="add_mid_banner" class="btn btn-pink">
                                <i class="fas fa-plus me-2"></i>Thêm Mid Banner
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Danh sách mid banner -->
                <div class="row">
                    <?php if (!empty($mid_banners)): ?>
                        <?php foreach ($mid_banners as $banner): ?>
                            <div class="col-12 mb-4">
                                <div class="banner-card">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <h5>Hình ảnh 1</h5>
                                            <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image1']); ?>" alt="Mid Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <h5>Hình ảnh 2</h5>
                                            <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image2']); ?>" alt="Mid Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <h5>Hình ảnh 3</h5>
                                            <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image3']); ?>" alt="Mid Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                        </div>
                                    </div>
                                    <div class="action-btns">
                                        <a href="/baocao/user/submit?delete_mid_id=<?php echo $banner['id']; ?>" class="delete-btn" onclick="return confirm('Bạn có chắc muốn xóa mid banner này?')">
                                            <i class="fas fa-trash me-1"></i>Xóa
                                        </a>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Chưa có mid banner nào được thêm
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Tab Foot Banner -->
            <div class="tab-pane fade" id="foot-banner" role="tabpanel">
                <!-- Form thêm foot banner mới -->
                <div class="card mb-4">
                    <div class="card-body">
                        <h4 class="section-title">Thêm Foot Banner Mới</h4>
                        <form method="post" enctype="multipart/form-data" action="/baocao/user/submit">
                            <div class="mb-3">
                                <label class="form-label">Hình ảnh banner <span class="text-danger">*</span></label>
                                <input type="file" name="foot_image" class="form-control" required accept="image/*">
                                <small class="text-muted">Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP (tối đa 2MB)</small>
                            </div>
                            <button type="submit" name="add_foot_banner" class="btn btn-pink">
                                <i class="fas fa-plus me-2"></i>Thêm Foot Banner
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Danh sách foot banner -->
                <div class="row">
                    <?php if (!empty($foot_banners)): ?>
                        <?php foreach ($foot_banners as $banner): ?>
                            <div class="col-md-6 mb-4">
                                <div class="banner-card">
                                    <h5>Banner</h5>
                                    <img src="/baocao/view/img/<?php echo htmlspecialchars($banner['image']); ?>" alt="Foot Banner <?php echo $banner['id']; ?>" class="img-fluid rounded mb-3">
                                    <div class="action-btns">
                                        <a href="/baocao/user/submit?delete_foot_id=<?php echo $banner['id']; ?>" class="delete-btn" onclick="return confirm('Bạn có chắc muốn xóa foot banner này?')">
                                            <i class="fas fa-trash me-1"></i>Xóa
                                        </a>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Chưa có foot banner nào được thêm
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
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
</body>

</html>