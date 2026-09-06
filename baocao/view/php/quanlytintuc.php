<?php
include "../../model/config/connect.php";
session_start();
require_once "xacThucAdmin.php";
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);

// Xử lý trạng thái xem tin tức (hiển thị hoặc đã ẩn)
$view_hidden = isset($_POST['view_hidden']) && $_POST['view_hidden'] === 'true' ? true : false;
$active_condition = $view_hidden ? "t.active = 0" : "t.active = 1";

// Xử lý tìm kiếm
$search_query = isset($_POST['search']) ? trim($_POST['search']) : '';
$search_condition = "";
$bind_params = [];
$bind_types = "";
if (!empty($search_query)) {
    $search_condition = " AND (t.title LIKE ? OR t.id IN (SELECT nt.news_id FROM news_tags nt JOIN tags tg ON nt.tag_id = tg.id WHERE tg.name LIKE ?)) ";
    $search_param = "%" . $search_query . "%";
    $bind_params[] = $search_param;
    $bind_params[] = $search_param;
    $bind_types .= "ss";
}

// Xử lý lọc theo tháng và năm
$month = isset($_POST['month']) ? (int)$_POST['month'] : '';
$year = isset($_POST['year']) ? (int)$_POST['year'] : '';
$date_condition = "";
if (!empty($month)) {
    $date_condition .= " AND MONTH(t.created_at) = ?";
    $bind_params[] = $month;
    $bind_types .= "i";
}
if (!empty($year)) {
    $date_condition .= " AND YEAR(t.created_at) = ?";
    $bind_params[] = $year;
    $bind_types .= "i";
}

// Xử lý sắp xếp
$sort = isset($_POST['sort']) ? $_POST['sort'] : 'newest';
$order_by = "";
switch ($sort) {
    case 'newest':
        $order_by = "t.created_at DESC";
        break;
    case 'oldest':
        $order_by = "t.created_at ASC";
        break;
    case 'most_viewed':
        $order_by = "t.view_count DESC";
        break;
    case 'least_viewed':
        $order_by = "t.view_count ASC";
        break;
    default:
        $order_by = "t.created_at DESC";
}

// Xử lý phân trang
$items_per_page = 12;
$current_page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$current_page = max(1, $current_page);
$offset = ($current_page - 1) * $items_per_page;

// Đếm tổng số tin tức
$count_sql = "SELECT COUNT(DISTINCT t.id) as total 
             FROM tintuc t
             LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1
             WHERE $active_condition $search_condition $date_condition";
$count_stmt = $conn->prepare($count_sql);
if (!empty($bind_params)) {
    $count_stmt->bind_param($bind_types, ...$bind_params);
}
$count_stmt->execute();
$count_result = $count_stmt->get_result();
$total_items = $count_result->fetch_assoc()['total'];
$total_pages = ceil($total_items / $items_per_page);

// Truy vấn lấy danh sách tin tức
$sql = "SELECT DISTINCT t.*, ni.image_url, ni.caption 
        FROM tintuc t
        LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1
        WHERE $active_condition $search_condition $date_condition 
        ORDER BY $order_by
        LIMIT ? OFFSET ?";
$stmt = $conn->prepare($sql);

// Bind tham số
$bind_params[] = $items_per_page;
$bind_params[] = $offset;
$bind_types .= "ii";
if (!empty($bind_params)) {
    $stmt->bind_param($bind_types, ...$bind_params);
}
$stmt->execute();
$result = $stmt->get_result();
$news = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Lấy danh sách tag
        $tag_sql = "SELECT tg.name 
                    FROM news_tags nt 
                    JOIN tags tg ON nt.tag_id = tg.id 
                    WHERE nt.news_id = ?";
        $tag_stmt = $conn->prepare($tag_sql);
        $tag_stmt->bind_param("i", $row['id']);
        $tag_stmt->execute();
        $tag_result = $tag_stmt->get_result();
        $tags = [];
        while ($tag_row = $tag_result->fetch_assoc()) {
            $tags[] = $tag_row['name'];
        }
        $row['tags'] = implode(", ", $tags);
        $news[] = $row;
        $tag_stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản Lý Tin Tức</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Quản lý tin tức thể thao.">
    <meta name="keywords" content="tin tức, thể thao, NHL Sports">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/quanlytintuc.css">
</head>

<body>
    <?php
    include "sidebar.php";
    ?>

    <div class="main-content">
        <?php if (!empty($success_msg)): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <?php echo $success_msg; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <!-- Tiêu đề -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="mb-1">Quản Lý Tin Tức</h2>
                <p class="text-muted mb-0">Danh sách các bài viết tin tức</p>
            </div>
            <div class="d-flex">
                <div class="input-group me-3" style="width: 250px;">
                    <form action="/baocao/quanlytintuc" method="POST" id="searchForm" class="d-flex w-100">
                        <input type="text" class="form-control" name="search" id="searchInput" placeholder="Tìm kiếm tin" value="<?php echo htmlspecialchars($search_query); ?>">
                        <input type="hidden" name="month" value="<?php echo htmlspecialchars($month); ?>">
                        <input type="hidden" name="year" value="<?php echo htmlspecialchars($year); ?>">
                        <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                        <input type="hidden" name="view_hidden" value="<?php echo $view_hidden ? 'true' : 'false'; ?>">
                        <button class="btn btn-outline-pink" type="submit">
                            <i class="fas fa-search"></i>
                        </button>
                        <?php if (!empty($search_query)): ?>
                            <button type="submit" class="btn btn-outline-secondary ms-1" name="search" value="">
                                <i class="fas fa-times"></i>
                            </button>
                        <?php endif; ?>
                    </form>
                </div>
                <a href="/baocao/add_news" class="btn btn-pink me-4">
                    <i class="fas fa-plus me-2"></i><span>Thêm Tin Tức</span>
                </a>
                <form action="/baocao/quanlytintuc" method="POST">
                    <input type="hidden" name="search" value="<?php echo htmlspecialchars($search_query); ?>">
                    <input type="hidden" name="month" value="<?php echo htmlspecialchars($month); ?>">
                    <input type="hidden" name="year" value="<?php echo htmlspecialchars($year); ?>">
                    <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                    <input type="hidden" name="view_hidden" value="<?php echo $view_hidden ? 'false' : 'true'; ?>">
                    <button type="submit" class="btn <?php echo $view_hidden ? 'btn-success' : 'btn-warning'; ?>">
                        <i class="fas <?php echo $view_hidden ? 'fa-eye' : 'fa-eye-slash'; ?> me-2"></i><span><?php echo $view_hidden ? 'Xem Tin Tức Hiển Thị' : 'Xem Tin Tức Đã Ẩn'; ?></span>
                    </button>
                </form>
            </div>
        </div>

        <!-- Danh Sách Tin Tức -->
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="section-title">Danh Sách Tin Tức</h4>
                    <div class="filter-group">
                        <!-- Lọc theo tháng -->
                        <form action="/baocao/quanlytintuc" method="POST">
                            <select name="month" class="form-select" onchange="this.form.submit()">
                                <option value="">Tất cả tháng</option>
                                <option value="1" <?php echo $month == 1 ? 'selected' : ''; ?>>Tháng 1</option>
                                <option value="2" <?php echo $month == 2 ? 'selected' : ''; ?>>Tháng 2</option>
                                <option value="3" <?php echo $month == 3 ? 'selected' : ''; ?>>Tháng 3</option>
                                <option value="4" <?php echo $month == 4 ? 'selected' : ''; ?>>Tháng 4</option>
                                <option value="5" <?php echo $month == 5 ? 'selected' : ''; ?>>Tháng 5</option>
                                <option value="6" <?php echo $month == 6 ? 'selected' : ''; ?>>Tháng 6</option>
                                <option value="7" <?php echo $month == 7 ? 'selected' : ''; ?>>Tháng 7</option>
                                <option value="8" <?php echo $month == 8 ? 'selected' : ''; ?>>Tháng 8</option>
                                <option value="9" <?php echo $month == 9 ? 'selected' : ''; ?>>Tháng 9</option>
                                <option value="10" <?php echo $month == 10 ? 'selected' : ''; ?>>Tháng 10</option>
                                <option value="11" <?php echo $month == 11 ? 'selected' : ''; ?>>Tháng 11</option>
                                <option value="12" <?php echo $month == 12 ? 'selected' : ''; ?>>Tháng 12</option>
                            </select>
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($search_query); ?>">
                            <input type="hidden" name="year" value="<?php echo htmlspecialchars($year); ?>">
                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                            <input type="hidden" name="view_hidden" value="<?php echo $view_hidden ? 'true' : 'false'; ?>">
                        </form>
                        <!-- Lọc theo năm -->
                        <form action="/baocao/quanlytintuc" method="POST">
                            <select name="year" class="form-select" onchange="this.form.submit()">
                                <option value="">Tất cả năm</option>
                                <option value="2023" <?php echo $year == 2023 ? 'selected' : ''; ?>>2023</option>
                                <option value="2024" <?php echo $year == 2024 ? 'selected' : ''; ?>>2024</option>
                                <option value="2025" <?php echo $year == 2025 ? 'selected' : ''; ?>>2025</option>
                                <option value="2026" <?php echo $year == 2026 ? 'selected' : ''; ?>>2026</option>
                                <option value="2027" <?php echo $year == 2027 ? 'selected' : ''; ?>>2027</option>
                                <option value="2028" <?php echo $year == 2028 ? 'selected' : ''; ?>>2028</option>
                                <option value="2029" <?php echo $year == 2029 ? 'selected' : ''; ?>>2029</option>
                                <option value="2030" <?php echo $year == 2030 ? 'selected' : ''; ?>>2030</option>
                                <option value="2031" <?php echo $year == 2031 ? 'selected' : ''; ?>>2031</option>
                            </select>
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($search_query); ?>">
                            <input type="hidden" name="month" value="<?php echo htmlspecialchars($month); ?>">
                            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort); ?>">
                            <input type="hidden" name="view_hidden" value="<?php echo $view_hidden ? 'true' : 'false'; ?>">
                        </form>
                        <!-- Sắp xếp -->
                        <form action="/baocao/quanlytintuc" method="POST" id="sortForm">
                            <select name="sort" class="form-select" style="width: 150px;" onchange="this.form.submit()">
                                <option value="newest" <?php echo $sort == 'newest' ? 'selected' : ''; ?>>Mới nhất</option>
                                <option value="oldest" <?php echo $sort == 'oldest' ? 'selected' : ''; ?>>Cũ nhất</option>
                                <option value="most_viewed" <?php echo $sort == 'most_viewed' ? 'selected' : ''; ?>>Xem nhiều nhất</option>
                                <option value="least_viewed" <?php echo $sort == 'least_viewed' ? 'selected' : ''; ?>>Xem ít nhất</option>
                            </select>
                            <input type="hidden" name="search" value="<?php echo htmlspecialchars($search_query); ?>">
                            <input type="hidden" name="month" value="<?php echo htmlspecialchars($month); ?>">
                            <input type="hidden" name="year" value="<?php echo htmlspecialchars($year); ?>">
                            <input type="hidden" name="view_hidden" value="<?php echo $view_hidden ? 'true' : 'false'; ?>">
                        </form>
                    </div>
                </div>

                <!-- Hiển thị danh sách tin tức dạng thẻ -->
                <div class="row">
                    <?php if (!empty($news)): ?>
                        <?php foreach ($news as $item): ?>
                            <div class="col-md-3 mb-4">
                                <div class="news-card">
                                    <img src="<?php echo htmlspecialchars($item['image_url'] ?? '/baocao/view/img/default-news.jpg'); ?>" alt="<?php echo htmlspecialchars($item['title']); ?>" class="news-img">
                                    <div>
                                        <div class="news-content">
                                            <h5><?php echo htmlspecialchars($item['title']); ?></h5>
                                            <p class="news-info"><strong>Lượt Xem:</strong> <?php echo $item['view_count']; ?></p>
                                            <p class="news-info"><strong>Thẻ:</strong> <?php echo htmlspecialchars($item['tags'] ?? 'Không có thẻ'); ?></p>
                                            <!-- Thêm ngày tạo ở góc phải -->
                                            <p class="news-date">Ngày tạo: <?php echo date('d/m/Y', strtotime($item['created_at'])); ?></p>
                                        </div>
                                    </div>
                                    <div class="action-btns">
                                        <?php if ($view_hidden): ?>
                                            <!-- Nút hiển thị lại cho tin tức đã ẩn -->
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;" onsubmit="return confirm('Bạn có chắc chắn muốn hiển thị lại tin tức này?')">
                                                <input type="hidden" name="show_news" value="show_news">
                                                <input type="hidden" name="id" value="<?php echo $item['id']; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-primary" title="Hiển thị lại">
                                                    <i class="fas fa-eye me-1"></i>
                                                </button>
                                            </form>
                                        <?php else: ?>
                                            <!-- Nút ẩn cho tin tức đang hiển thị -->
                                            <form action="/baocao/user/submit" method="POST" style="display:inline-block;" onsubmit="return confirm('Bạn có chắc chắn muốn ẩn tin tức này?')">
                                                <input type="hidden" name="hide_news" value="hide_news">
                                                <input type="hidden" name="id" value="<?php echo $item['id']; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-primary" title="Ẩn">
                                                    <i class="fas fa-eye-slash me-1"></i>
                                                </button>
                                            </form>
                                        <?php endif; ?>
                                        <form action="/baocao/user/submit" method="POST" style="display:inline-block;">
                                            <input type="hidden" name="edit_news" value="edit_news">
                                            <input type="hidden" name="id" value="<?php echo $item['id']; ?>">
                                            <button type="submit" class="btn btn-sm btn-outline-success" title="Chỉnh sửa">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </form>
                                        <form action="/baocao/user/submit" method="POST" style="display:inline-block;" onsubmit="return confirm('Bạn có chắc chắn muốn xóa tin tức này?')">
                                            <input type="hidden" name="delete_news" value="delete_news">
                                            <input type="hidden" name="id" value="<?php echo $item['id']; ?>">
                                            <button type="submit" class="btn btn-sm btn-outline-danger" title="Xóa">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Không có tin tức nào để hiển thị.
                            </div>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Phân trang -->
                <?php if ($total_pages > 1): ?>
                    <nav aria-label="Page navigation">
                        <ul class="pagination justify-content-center mt-4">
                            <!-- Nút Previous -->
                            <li class="page-item <?php echo $current_page <= 1 ? 'disabled' : ''; ?>">
                                <a class="page-link" href="?page=<?php echo $current_page - 1; ?>&search=<?php echo urlencode($search_query); ?>&month=<?php echo $month; ?>&year=<?php echo $year; ?>&sort=<?php echo $sort; ?>&view_hidden=<?php echo $view_hidden ? 'true' : 'false'; ?>" aria-label="Previous">
                                    <span aria-hidden="true">&laquo;</span>
                                </a>
                            </li>
                            <!-- Các số trang -->
                            <?php
                            $start_page = max(1, $current_page - 2);
                            $end_page = min($total_pages, $current_page + 2);
                            if ($start_page > 1) {
                                echo '<li class="page-item"><a class="page-link" href="?page=1&search=' . urlencode($search_query) . '&month=' . $month . '&year=' . $year . '&sort=' . $sort . '&view_hidden=' . ($view_hidden ? 'true' : 'false') . '">1</a></li>';
                                if ($start_page > 2) {
                                    echo '<li class="page-item disabled"><span class="page-link">...</span></li>';
                                }
                            }
                            for ($i = $start_page; $i <= $end_page; $i++): ?>
                                <li class="page-item <?php echo $i == $current_page ? 'active' : ''; ?>">
                                    <a class="page-link" href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search_query); ?>&month=<?php echo $month; ?>&year=<?php echo $year; ?>&sort=<?php echo $sort; ?>&view_hidden=<?php echo $view_hidden ? 'true' : 'false'; ?>"><?php echo $i; ?></a>
                                </li>
                            <?php endfor; ?>
                            <?php
                            if ($end_page < $total_pages) {
                                if ($end_page < $total_pages - 1) {
                                    echo '<li class="page-item disabled"><span class="page-link">...</span></li>';
                                }
                                echo '<li class="page-item"><a class="page-link" href="?page=' . $total_pages . '&search=' . urlencode($search_query) . '&month=' . $month . '&year=' . $year . '&sort=' . $sort . '&view_hidden=' . ($view_hidden ? 'true' : 'false') . '">' . $total_pages . '</a></li>';
                            }
                            ?>
                            <!-- Nút Next -->
                            <li class="page-item <?php echo $current_page >= $total_pages ? 'disabled' : ''; ?>">
                                <a class="page-link" href="?page=<?php echo $current_page + 1; ?>&search=<?php echo urlencode($search_query); ?>&month=<?php echo $month; ?>&year=<?php echo $year; ?>&sort=<?php echo $sort; ?>&view_hidden=<?php echo $view_hidden ? 'true' : 'false'; ?>" aria-label="Next">
                                    <span aria-hidden="true">&raquo;</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            if ($(".alert-success").length || $(".alert-danger").length) {
                setTimeout(function() {
                    $(".alert").alert("close");
                }, 3000);
            }
        });
    </script>
</body>

</html>