<?php
session_start();
require_once "xacThucAdmin.php";
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);

// Lấy dữ liệu từ session
$selectedMonth = $_SESSION['selected_month'] ?? date('n');
$selectedYear = $_SESSION['selected_year'] ?? date('Y');
$availableMonths = $_SESSION['available_months'] ?? [];
$customerCount = $_SESSION['customer_count'] ?? 0;
$productCount = $_SESSION['product_count'] ?? 0;
$revenue = $_SESSION['revenue'] ?? 0;
$orderCount = $_SESSION['order_count'] ?? 0;
$canceledAmount = $_SESSION['canceled_amount'] ?? 0;
$canceledCount = $_SESSION['canceled_count'] ?? 0;
$percentChange = $_SESSION['percent_change'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NHL admin</title>
  <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
  <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
  <meta name="keywords" content="admin, thể thao, NHL Sports, thời trang thể thao">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/baocao/view/css/admin.css">
</head>

<body>
  <?php include "sidebar.php"; ?>
  <?php if (!empty($success_msg)): ?>
    <div id="success-alert" class="alert-success">
      <?= htmlspecialchars($success_msg) ?>
    </div>
  <?php endif; ?>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Header and Welcome -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="mb-1">Dashboard</h2>
        <p class="text-muted mb-0">Mừng trở lại</p>
      </div>
      <div class="d-flex align-items-center">
        <!-- Form chọn tháng/năm -->
        <form method="POST" action="/baocao/user/submit" class="d-flex me-3">
          <div class="input-group">
            <select name="month" class="form-select me-2" style="width: auto;">
              <?php for ($i = 1; $i <= 12; $i++): ?>
                <option value="<?php echo $i; ?>" <?php echo ($selectedMonth == $i) ? 'selected' : ''; ?>>
                  Tháng <?php echo $i; ?>
                </option>
              <?php endfor; ?>
            </select>
            <select name="year" class="form-select me-2" style="width: auto;">
              <?php
              $currentYear = date('Y');
              for ($i = $currentYear; $i >= $currentYear - 5; $i--): ?>
                <option value="<?php echo $i; ?>" <?php echo ($selectedYear == $i) ? 'selected' : ''; ?>>
                  <?php echo $i; ?>
                </option>
              <?php endfor; ?>
            </select>
            <input type="hidden" name="action" value="admin_stats">
            <button type="submit" class="btn btn-pink">Xem</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="row mb-4 g-3">
      <!-- Trong phần Stats Cards, thẻ Khách hàng -->
      <div class="col-md-3">
        <a href="/baocao/quanlytaikhoan" class="text-decoration-none">
          <div class="stat-card p-3">
            <div class="d-flex justify-content-between mb-2">
              <div>
                <p class="text-muted mb-1">Khách hàng</p>
                <h3><?php echo $customerCount; ?></h3>
              </div>
              <div class="circle-icon icon-blue">
                <i class="fas fa-users"></i>
              </div>
            </div>
          </div>
        </a>
      </div>

      <!-- Thẻ Sản phẩm -->
      <div class="col-md-3">
        <a href="/baocao/delete_product" class="text-decoration-none">
          <div class="stat-card p-3">
            <div class="d-flex justify-content-between mb-2">
              <div>
                <p class="text-muted mb-1">Sản phẩm</p>
                <h3><?php echo $productCount; ?></h3>
              </div>
              <div class="circle-icon icon-yellow">
                <i class="fas fa-box"></i>
              </div>
            </div>
          </div>
        </a>
      </div>

      <!-- Thẻ Doanh thu -->
      <div class="col-md-3">
        <a href="/baocao/quanlydonhang" class="text-decoration-none">
          <div class="stat-card p-3">
            <div class="d-flex justify-content-between mb-2">
              <div>
                <p class="text-muted mb-1">Doanh thu (<?php echo "Tháng $selectedMonth/$selectedYear"; ?>)</p>
                <h3><?php echo number_format($revenue / 1000); ?>KĐ</h3>
                <small class="text-muted"><?php echo $orderCount; ?> đơn</small>
              </div>
              <div class="circle-icon icon-red">
                <i class="fas fa-chart-line"></i>
              </div>
            </div>
          </div>
        </a>
      </div>

      <!-- Thẻ Đơn hủy -->
      <div class="col-md-3">
        <a href="/baocao/quanlydonhang" class="text-decoration-none">
          <div class="stat-card p-3">
            <div class="d-flex justify-content-between mb-2">
              <div>
                <p class="text-muted mb-1">Đã hủy (<?php echo "Tháng $selectedMonth/$selectedYear"; ?>)</p>
                <h3><?php echo number_format($canceledAmount / 1000); ?>KĐ</h3>
                <small class="text-muted"><?php echo $canceledCount; ?> đơn</small>
              </div>
              <div class="circle-icon icon-green">
                <i class="fas fa-times-circle"></i>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- Earnings Card -->
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="pink-bg p-4">
          <div class="row">
            <div class="col-md-8">
              <h4 class="mb-3">Thống kê doanh thu theo tháng</h4>
              <div class="d-flex align-items-center mb-3">
                <h2 class="mb-0 me-3"><?php echo number_format($revenue); ?> VNĐ</h2>
                <?php if ($percentChange !== null): ?>
                  <span class="badge bg-white text-dark px-3 py-2 rounded-pill">
                    <i class="fas <?php echo $percentChange >= 0 ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger'; ?> me-1"></i>
                    <?php echo abs($percentChange); ?>%
                  </span>
                <?php endif; ?>
              </div>
              <p class="mb-4">Tổng doanh thu tháng <?php echo "$selectedMonth/$selectedYear"; ?> từ <?php echo $orderCount; ?> đơn hàng</p>
              <div class="d-flex">
                <a href="/baocao/quanlydonhang" class="btn btn-light px-4">
                  <i class="fas fa-chart-line me-2"></i>Xem chi tiết
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Danh sách các tháng có dữ liệu -->
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Lịch sử doanh thu theo tháng</h5>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Tháng/Năm</th>
                    <th>Số đơn hàng</th>
                    <th>Doanh thu</th>
                    <th>Đơn hủy</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  // Chỉ hiển thị tháng hiện tại đang được chọn
                  $monthKey = $selectedMonth . '_' . $selectedYear;
                  $monthRevenue = $revenue;
                  $monthOrderCount = $orderCount;
                  $monthCanceledAmount = $canceledAmount;
                  $monthCanceledCount = $canceledCount;
                  ?>
                  <tr>
                    <td>Tháng <?php echo $selectedMonth . '/' . $selectedYear; ?></td>
                    <td><?php echo $monthOrderCount; ?> đơn</td>
                    <td><?php echo number_format($monthRevenue); ?> VNĐ</td>
                    <td><?php echo $monthCanceledCount; ?> đơn (<?php echo number_format($monthCanceledAmount); ?> VNĐ)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
  <script>
    const alertBox = document.getElementById("success-alert");
    if (alertBox) {
      setTimeout(function() {
        alertBox.style.opacity = "0";
        setTimeout(function() {
          alertBox.style.display = "none";
        }, 500); // Đợi hiệu ứng mờ xong mới ẩn
      }, 3000); // Hiển thị 3 giây
    }
  </script>
</body>

</html>