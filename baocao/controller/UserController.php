<?php
session_start();
require_once '../model/UserModel.php';
require_once '../model/vendor/autoload.php';
$action = isset($_POST['action']) ? $_POST['action'] : (isset($_GET['action']) ? $_GET['action'] : '');
// Xử lý các hành động từ UserController và BannerController
if (!empty($action)) {

    // Tải danh sách loại thể thao
    if ($action === 'load_parent_tables') {
        $parent_tables = getParentTables();
        $_SESSION['parent_tables'] = $parent_tables;
        header("Location: /baocao/delete_product");
        exit;
    }

    // Lấy danh mục con dựa trên loại thể thao
    if ($action === 'get_child_tables' && isset($_POST['parent_id'])) {
        $parent_id = intval($_POST['parent_id']);
        $child_tables = getChildTables($parent_id);
        $_SESSION['child_tables'] = $child_tables;
        $_SESSION['parent_id'] = $parent_id;
        header("Location: /baocao/delete_product");
        exit;
    }

    // qwert
    if ($action === 'get_products' && isset($_GET['table'])) {
        $table = $_GET['table'];
        $show_inactive = isset($_GET['show_inactive']) ? intval($_GET['show_inactive']) : 0;
        $search_keyword = isset($_GET['search_keyword']) ? urldecode($_GET['search_keyword']) : '';

        // Lưu từ khóa tìm kiếm vào session
        $_SESSION['search_keyword'] = $search_keyword;

        // Lấy sản phẩm với từ khóa tìm kiếm
        $products = getProducts($table, $show_inactive, $search_keyword);
        $displayName = formatDisplayName($table);
        $_SESSION['products'] = $products;
        $_SESSION['display_name'] = $displayName;
        header("Location: /baocao/delete_product/" . $table . ($show_inactive ? "&show_inactive=1" : "") . ($search_keyword ? "&search_keyword=" . urlencode($search_keyword) : ""));
        exit;
    }

    // Xử lý ẩn sản phẩm
    if ($action === 'hide_product' && isset($_POST['this_id']) && isset($_POST['table'])) {
        $product_id = $_POST['this_id'];
        $table = $_POST['table'];
        $name = $_POST['product'] ?? '';
        if (hideProduct($table, $product_id)) {
            if (hideCartItemsByProductName($conn, $name)) {
                $_SESSION['message'] = 'Đã ẩn sản phẩm và các mục trong giỏ hàng thành công!';
            } else {
                $_SESSION['message'] = 'Đã ẩn sản phẩm nhưng lỗi khi ẩn các mục trong giỏ hàng!';
            }
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = 'Lỗi khi ẩn sản phẩm!';
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/user/submit?action=get_products&table=$table");
        exit;
    }

    // Xử lý khôi phục sản phẩm
    if ($action === 'restore_product' && isset($_POST['restore_id']) && isset($_POST['table'])) {
        $product_id = $_POST['restore_id'];
        $table = $_POST['table'];
        if (restoreProduct($table, $product_id)) {
            $_SESSION['message'] = 'Khôi phục sản phẩm thành công!';
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = 'Lỗi khi khôi phục sản phẩm!';
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/user/submit?action=get_products&table=$table&show_inactive=1");
        exit;
    }

    // Xử lý tìm kiếm sản phẩm
    if ($action === 'search_products' && isset($_POST['table'])) {
        $table = $_POST['table'];
        $show_inactive = isset($_POST['show_inactive']) ? intval($_POST['show_inactive']) : 0;
        $search_keyword = isset($_POST['search_keyword']) ? $_POST['search_keyword'] : '';

        header("Location: /baocao/user/submit?action=get_products&table=$table&show_inactive=$show_inactive" .
            (!empty($search_keyword) ? "&search_keyword=" . urlencode($search_keyword) : ""));
        exit;
    }
    // qwert
    if ($action === 'global_search') {
        $search_keyword = isset($_POST['global_search_keyword']) ? $_POST['global_search_keyword'] : '';
        $show_inactive = isset($_POST['show_inactive']) ? intval($_POST['show_inactive']) : 0;

        if (!empty($search_keyword)) {
            // Thực hiện tìm kiếm toàn cục
            $search_results = searchProductsGlobal($search_keyword, $show_inactive);
            $_SESSION['global_search_results'] = $search_results;
            $_SESSION['global_search_keyword'] = $search_keyword;
            $_SESSION['show_inactive'] = $show_inactive;
        }

        header("Location: /baocao/delete_product?global_search=1" .
            ($show_inactive ? "&show_inactive=1" : ""));
        exit;
    }
    // qwert
    if ($action === 'search_suggestions' && isset($_GET['term'])) {
        $term = $_GET['term'];
        $suggestions = getSearchSuggestions($term);
        header('Content-Type: application/json');
        echo json_encode($suggestions);
        exit;
    }
    // Lấy thông tin sản phẩm để chỉnh sửa
    if ($action === 'get_product_for_edit' && (isset($_POST['this_id']) || isset($_GET['this_id'])) && (isset($_POST['table']) || isset($_GET['table']))) {
        $product_id = isset($_POST['this_id']) ? intval($_POST['this_id']) : intval($_GET['this_id']);
        $table = isset($_POST['table']) ? $_POST['table'] : $_GET['table'];
        if (!productExists($table, $product_id)) {
            $_SESSION['message'] = 'Sản phẩm không tồn tại!';
            $_SESSION['message_type'] = 'danger';
            header("Location: /baocao/delete_product");
            exit;
        }
        $product = getProductById($table, $product_id);
        $sizes = getProductSizes($table, $product_id);
        $_SESSION['edit_product'] = $product;
        $_SESSION['edit_sizes'] = $sizes;
        $_SESSION['edit_table'] = $table;
        $_SESSION['edit_product_id'] = $product_id;
        header("Location: /baocao/edit_product?this_id=$product_id&table=$table");
        exit;
    }

    // asdfg
    if ($action === 'reset_child_selection') {
        unset($_SESSION['child_tables']);
        unset($_SESSION['parent_id']);
        unset($_SESSION['products']);
        unset($_SESSION['display_name']);
        echo 'OK';
        exit;
    }
    // asdfg
    if ($action === 'get_child_tables_json' && isset($_GET['parent_id'])) {
        $parent_id = intval($_GET['parent_id']);
        $child_tables = getChildTables($parent_id);
        header('Content-Type: application/json');
        echo json_encode($child_tables);
        exit;
    }

    // Xử lý cập nhật sản phẩm
    if ($action === 'update_product' && isset($_POST['this_id']) && isset($_POST['table'])) {
        $product_id = intval($_POST['this_id']);
        $table = $_POST['table'];

        try {
            // Validate inputs
            $name = trim($_POST['name'] ?? '');
            if (empty($name)) {
                throw new Exception("Tên sản phẩm không được để trống");
            }

            $brand = trim($_POST['brand'] ?? 'Đang Cập Nhập');
            $quantity = intval($_POST['quantity'] ?? 10);
            if ($quantity <= 0) {
                throw new Exception("Số lượng phải lớn hơn 0");
            }

            // Price processing
            $price = str_replace(['.', ','], '', $_POST['price'] ?? '0');
            $oprice = str_replace(['.', ','], '', $_POST['oprice'] ?? '0');
            if (!is_numeric($price) || !is_numeric($oprice)) {
                throw new Exception("Giá sản phẩm phải là số");
            }

            // Khởi tạo mảng dữ liệu để cập nhật
            $data = [
                'name' => $name,
                'brand' => $brand,
                'quantity' => $quantity,
                'price' => $price,
                'oprice' => $oprice,
            ];

            // Warranty field cho sản phẩm vợt
            if (in_array($table, ['votcaulong', 'votpickleball', 'gaybia'])) {
                $warranty = $_POST['warranty'] ?? '0';
                if (empty($warranty)) {
                    throw new Exception("Vui lòng nhập thời gian bảo hành");
                }
                $data['warranty'] = $warranty;
            }

            // Xử lý tải lên các hình ảnh (image, image2, image3, image4)
            $image_info = [];
            $image_fields = ['image', 'image2', 'image3', 'image4'];
            foreach ($image_fields as $field) {
                if (isset($_FILES[$field]) && $_FILES[$field]['error'] == UPLOAD_ERR_OK) {
                    $imageFileType = strtolower(pathinfo($_FILES[$field]['name'], PATHINFO_EXTENSION));

                    // Kiểm tra có phải là ảnh không
                    $check = getimagesize($_FILES[$field]['tmp_name']);
                    if ($check === false) {
                        throw new Exception("File $field không phải là ảnh hợp lệ");
                    }

                    // Kiểm tra kích thước file (max 2MB)
                    if ($_FILES[$field]['size'] > 2000000) {
                        throw new Exception("Kích thước file $field tối đa là 2MB");
                    }

                    // Chỉ cho phép một số định dạng ảnh
                    $allowed_types = ['jpg', 'png', 'jpeg', 'gif', 'webp'];
                    if (!in_array($imageFileType, $allowed_types)) {
                        throw new Exception("Chỉ chấp nhận file ảnh JPG, JPEG, PNG, GIF hoặc WEBP cho $field");
                    }

                    $image_name = basename($_FILES[$field]['name']);
                    $upload_dir = '../view/img/';
                    $upload_path = $upload_dir . $image_name;

                    if (!move_uploaded_file($_FILES[$field]['tmp_name'], $upload_path)) {
                        throw new Exception("Lỗi khi tải lên hình ảnh $field");
                    }

                    $image_info[$field] = $image_name;
                }
            }

            // Cập nhật thông tin sản phẩm
            if (!updateProduct($table, $product_id, $data, $image_info)) {
                throw new Exception("Cập nhật sản phẩm thất bại");
            }

            // Xử lý kích thước sản phẩm nếu có
            if (isset($_POST['sizes'])) {
                $sizes = $_POST['sizes'];
                $quantities = $_POST['quantities'];
                $name = $_POST['name'];
                $total_size_quantity = 0;
                foreach ($quantities as $qty) {
                    $qty = intval($qty);
                    if ($qty > 0) {
                        $total_size_quantity += $qty;
                    }
                }

                if ($total_size_quantity > $quantity) {
                    throw new Exception("Tổng số lượng của các kích thước ($total_size_quantity) không được vượt quá số lượng tổng ($quantity)");
                }

                if (!updateProductSizes($table, $product_id, $sizes, $name, $quantities)) {
                    throw new Exception("Cập nhật kích thước sản phẩm thất bại");
                }
            }

            $_SESSION['message'] = 'Cập nhật sản phẩm thành công!';
            $_SESSION['message_type'] = 'success';
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
            error_log("Lỗi cập nhật sản phẩm: " . $e->getMessage());
        }

        header("Location: /baocao/user/submit?action=get_products&table=$table");
        exit;
    }

    // Xử lý xóa head banner
    if ($action === 'delete_banner' && isset($_GET['delete_id'])) {
        $delete_id = intval($_GET['delete_id']);
        $banners = getHeadBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteHeadBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            if ($banner && file_exists($target_dir . $banner['image'])) {
                unlink($target_dir . $banner['image']);
            }
            if ($banner && !empty($banner['mb_image']) && file_exists($target_dir . $banner['mb_image'])) {
                unlink($target_dir . $banner['mb_image']);
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý thêm mid banner
    if ($action === 'add_mid_banner') {
        try {
            $required_images = ['image1', 'image2', 'image3'];
            $uploaded_images = [];
            foreach ($required_images as $image) {
                $validation = validateImageFile($_FILES[$image], $image);
                if (!$validation['success']) {
                    throw new Exception($validation['error']);
                }
                $uploaded_images[$image] = $validation['filename'];
            }
            $result = addMidBanner($uploaded_images['image1'], $uploaded_images['image2'], $uploaded_images['image3']);
            if ($result['success']) {
                $target_dir = "../view/img/";
                foreach ($uploaded_images as $key => $image_name) {
                    move_uploaded_file($_FILES[$key]['tmp_name'], $target_dir . $image_name);
                }
                $_SESSION['message'] = $result['message'];
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception($result['error']);
            }
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý xóa mid banner
    if ($action === 'delete_mid_banner' && isset($_GET['delete_mid_id'])) {
        $delete_id = intval($_GET['delete_mid_id']);
        $banners = getMidBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteMidBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            foreach (['image1', 'image2', 'image3'] as $img) {
                if ($banner && !empty($banner[$img]) && file_exists($target_dir . $banner[$img])) {
                    unlink($target_dir . $banner[$img]);
                }
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý thêm foot banner
    if ($action === 'add_foot_banner') {
        try {
            $validation = validateImageFile($_FILES['foot_image'], 'foot banner');
            if (!$validation['success']) {
                throw new Exception($validation['error']);
            }
            $image_name = $validation['filename'];
            $result = addFootBanner($image_name);
            if ($result['success']) {
                $target_dir = "../view/img/";
                move_uploaded_file($_FILES['foot_image']['tmp_name'], $target_dir . $image_name);
                $_SESSION['message'] = $result['message'];
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception($result['error']);
            }
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý xóa foot banner
    if ($action === 'delete_foot_banner' && isset($_GET['delete_foot_id'])) {
        $delete_id = intval($_GET['delete_foot_id']);
        $banners = getFootBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteFootBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            if ($banner && file_exists($target_dir . $banner['image'])) {
                unlink($target_dir . $banner['image']);
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // qwert
    if ($action === 'export_excel') {
        $filter = isset($_SESSION['filter']) ? $_SESSION['filter'] : '';
        $sort = isset($_SESSION['sort']) ? $_SESSION['sort'] : 'newest';
        $month = isset($_SESSION['selected_month']) ? $_SESSION['selected_month'] : null;
        $year = isset($_SESSION['selected_year']) ? $_SESSION['selected_year'] : null;

        $orders = getAllOrdersForExport($filter, $sort, $month, $year);
        exportOrdersToExcel($orders);
        exit();
    }

    if ($action === 'export_invoice' && isset($_POST['id'])) {
        $orderId = $_POST['id'];
        $orderDetail = getOrderDetail($orderId);

        if (isset($orderDetail['order'])) {
            exportInvoiceToPDF($orderDetail);
        } else {
            $_SESSION['error_message'] = 'Không tìm thấy đơn hàng để xuất hóa đơn';
            header("Location: /baocao/quanlydonhang");
            exit();
        }
    }

    // Xử lý vouchers
    if ($action === 'get_vouchers') {
        $items_per_page = 6;
        $current_page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
        $offset = ($current_page - 1) * $items_per_page;
        $searchTerm = isset($_POST['search']) ? trim($_POST['search']) : '';
        $filter = isset($_POST['filter']) ? $_POST['filter'] : '';
        $sort = isset($_POST['sort']) ? $_POST['sort'] : 'newest';
        if (!empty($searchTerm)) {
            $vouchers = searchVouchers($searchTerm, $offset, $items_per_page);
            $total_items = countSearchVouchers($searchTerm);
        } else {
            $vouchers = getVouchersPaginated($offset, $items_per_page, $filter, $sort);
            $total_items = countVouchers($filter);
        }
        $_SESSION['vouchers'] = $vouchers;
        $_SESSION['total_voucher_items'] = $total_items;
        $_SESSION['current_voucher_page'] = $current_page;
        $_SESSION['voucher_items_per_page'] = $items_per_page;
        $_SESSION['voucher_search'] = $searchTerm;
        $_SESSION['voucher_filter'] = $filter;
        $_SESSION['voucher_sort'] = $sort;
        header("Location: /baocao/quanlyvoucher");
        exit();
    }

    // Thêm voucher mới
    if ($action === 'add_voucher') {
        $title = $_POST['title'];
        $content = $_POST['content'];
        $name = $_POST['name'];
        $price = $_POST['price'];
        $id_user = $_POST['id_user'];
        $active = isset($_POST['active']) ? 1 : 0;
        if (!is_numeric($price) && strtoupper($price) !== 'FREESHIP') {
            $_SESSION['voucher_error_message'] = "Giá trị voucher phải là số hoặc 'FREESHIP'";
            header("Location: /baocao/quanlyvoucher");
            exit();
        }
        global $conn;
        if ($id_user === 'all') {
            $users_query = "SELECT id_user FROM khachhang";
            $users_result = $conn->query($users_query);
            $success = true;
            $error_message = '';
            while ($user = $users_result->fetch_assoc()) {
                $result = addVoucher($title, $content, $name, $price, $user['id_user'], $active);
                if (!$result['success']) {
                    $success = false;
                    $error_message = $result['error'];
                    break;
                }
            }
            if ($success) {
                $_SESSION['voucher_success_message'] = 'Thêm voucher cho tất cả người dùng thành công';
            } else {
                $_SESSION['voucher_error_message'] = $error_message;
            }
        } else {
            $result = addVoucher($title, $content, $name, $price, $id_user, $active);
            if ($result['success']) {
                $_SESSION['voucher_success_message'] = $result['message'];
            } else {
                $_SESSION['voucher_error_message'] = $result['error'];
            }
        }
        $items_per_page = $_SESSION['voucher_items_per_page'] ?? 6;
        $current_page = $_SESSION['current_voucher_page'] ?? 1;
        $offset = ($current_page - 1) * $items_per_page;
        $searchTerm = $_SESSION['voucher_search'] ?? '';
        $filter = $_SESSION['voucher_filter'] ?? '';
        $sort = $_SESSION['voucher_sort'] ?? 'newest';
        if (!empty($searchTerm)) {
            $vouchers = searchVouchers($searchTerm, $offset, $items_per_page);
            $total_items = countSearchVouchers($searchTerm);
        } else {
            $vouchers = getVouchersPaginated($offset, $items_per_page, $filter, $sort);
            $total_items = countVouchers($filter);
        }
        $_SESSION['vouchers'] = $vouchers;
        $_SESSION['total_voucher_items'] = $total_items;
        header("Location: /baocao/quanlyvoucher");
        exit();
    }

    // Xóa voucher
    if ($action === 'delete_voucher') {
        $voucherId = $_POST['id'];
        $result = deleteVoucher($voucherId);
        if ($result['success']) {
            $_SESSION['voucher_success_message'] = $result['message'];
        } else {
            $_SESSION['voucher_error_message'] = $result['error'];
        }
        header("Location: /baocao/quanlyvoucher");
        exit();
    }

    // Bật/tắt trạng thái voucher
    if ($action === 'toggle_voucher') {
        $voucherId = $_POST['id'];
        $status = $_POST['status'];
        $result = toggleVoucherStatus($voucherId, $status);
        if ($result['success']) {
            $_SESSION['voucher_success_message'] = $result['message'];
        } else {
            $_SESSION['voucher_error_message'] = $result['error'];
        }
        header("Location: /baocao/quanlyvoucher");
        exit();
    }

    // Hủy đơn
    if ($action === 'delete_order' && isset($_POST['id'])) {
        header('Content-Type: application/json');
        $orderId = $_POST['id'];
        $result = updateOrderStatus($orderId, 'cancelled');

        if ($result['success']) {
            // Cập nhật trạng thái trong session nếu tồn tại
            if (isset($_SESSION['orders'])) {
                foreach ($_SESSION['orders'] as &$order) {
                    if ($order['id'] == $orderId) {
                        $order['trangthai'] = 'Đã hủy';
                        break;
                    }
                }
                unset($order); // Hủy tham chiếu
            }

            echo json_encode([
                'success' => true,
                'success_message' => 'Đơn hàng đã được hủy và số lượng sản phẩm đã được hoàn lại thành công'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        exit();
    }

    // Lấy chi tiết đơn hàng
    if ($action === 'get_order_detail' && isset($_POST['id'])) {
        $orderId = $_POST['id'];
        $orderDetail = getOrderDetail($orderId);
        $_SESSION['order_detail'] = $orderDetail;
        $_SESSION['show_order_modal'] = true;

        // Lấy số trang từ POST, nếu không có thì lấy từ session hoặc mặc định là 1
        $page = isset($_POST['page']) ? (int)$_POST['page'] : (isset($_SESSION['current_page']) ? (int)$_SESSION['current_page'] : 1);

        // Chuyển hướng về trang hiện tại với tham số page
        header("Location: /baocao/quanlydonhang");
        exit();
    }

    if ($action === 'update_status' && isset($_POST['id']) && isset($_POST['status'])) {
        header('Content-Type: application/json');
        $orderId = $_POST['id'];
        $currentStatus = getOrderCurrentStatus($orderId);

        // Logic chuyển trạng thái đơn giản
        if ($_POST['status'] == 'completed') {
            if ($currentStatus == 'Đang xử lý') {
                $newStatus = 'Đang giao';
            } elseif ($currentStatus == 'Đang giao') {
                $newStatus = 'Đã giao';
            } else {
                $newStatus = $currentStatus; // Giữ nguyên nếu đã ở trạng thái cuối
            }
        } else {
            $newStatus = $currentStatus;
        }

        $result = updateOrderStatus($orderId, $newStatus);

        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'message' => 'Cập nhật trạng thái thành công: ' . $newStatus
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => $result['error']
            ]);
        }
        exit();
    }

    // Lấy danh sách đơn hàng
    if ($action === 'get_orders') {
        $items_per_page = 6;
        $current_page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
        $offset = ($current_page - 1) * $items_per_page;
        $searchTerm = isset($_POST['search']) ? trim($_POST['search']) : '';
        $filter = isset($_POST['filter']) ? $_POST['filter'] : '';
        $sort = isset($_POST['sort']) ? $_POST['sort'] : 'newest';

        if (!empty($searchTerm)) {
            // Tìm kiếm đơn hàng
            $orders = searchOrders($searchTerm, $offset, $items_per_page);
            $total_items = countSearchOrders($searchTerm);
        } else {
            // Lấy đơn hàng với bộ lọc và phân trang
            $orders = getFilteredOrdersPaginated($offset, $items_per_page, $filter, $sort);
            // Đếm số đơn hàng theo bộ lọc
            if (!empty($filter)) {
                $total_items = countFilteredOrders($filter);
            } else {
                $total_items = countOrders();
            }
        }

        // Lưu dữ liệu vào session
        $_SESSION['orders'] = $orders;
        $_SESSION['total_items'] = $total_items;
        $_SESSION['current_page'] = $current_page;
        $_SESSION['items_per_page'] = $items_per_page;
        $_SESSION['search'] = $searchTerm;
        $_SESSION['filter'] = $filter;
        $_SESSION['sort'] = $sort;

        header("location: /baocao/quanlydonhang");
        exit();
    }
    // if ($action === 'get_orders_by_month') {
    //     $items_per_page = 6; // Số mục trên mỗi trang
    //     $month = isset($_POST['month']) ? (int)$_POST['month'] : date('m');
    //     $year = isset($_POST['year']) ? (int)$_POST['year'] : date('Y');
    //     $filter = isset($_POST['filter']) ? $_POST['filter'] : '';
    //     $sort = isset($_POST['sort']) ? $_POST['sort'] : 'newest';
    //     $current_page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
    //     $offset = ($current_page - 1) * $items_per_page;

    //     // Lấy đơn hàng với phân trang asdfg
    //     $orders = getOrdersByMonth($month, $year, $filter, $sort, $offset, $items_per_page);
    //     $total_items = countOrdersByMonth($month, $year, $filter);

    //     // Kiểm tra nếu không có đơn hàng
    //     if (empty($orders) || $total_items == 0) {
    //         $_SESSION['message'] = [
    //             'type' => 'warning',
    //             'text' => 'Không tìm thấy đơn hàng nào trong tháng ' . $month . '/' . $year . '.'
    //         ];
    //     } else {
    //         // Lưu dữ liệu vào session nếu có đơn hàng
    //         $_SESSION['orders'] = $orders;
    //         $_SESSION['total_items'] = $total_items;
    //         $_SESSION['current_page'] = 1;
    //         $_SESSION['items_per_page'] = $items_per_page;
    //         $_SESSION['search'] = '';
    //         $_SESSION['filter'] = $filter;
    //         $_SESSION['sort'] = $sort;
    //         $_SESSION['selected_month'] = $month;
    //         $_SESSION['selected_year'] = $year;
    //     }

    //     header("location: /baocao/quanlydonhang");
    //     exit();
    // }
    if ($action === 'get_orders_by_month') {
        $items_per_page = 6; // Số mục trên mỗi trang
        $month = isset($_POST['month']) ? (int)$_POST['month'] : date('m');
        $year = isset($_POST['year']) ? (int)$_POST['year'] : date('Y');
        $filter = isset($_POST['filter']) ? $_POST['filter'] : '';
        $sort = isset($_POST['sort']) ? $_POST['sort'] : 'newest';
        $current_page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
        $offset = ($current_page - 1) * $items_per_page;

        // Lấy đơn hàng với phân trang asdfg
        $orders = getOrdersByMonth($month, $year, $filter, $sort, $offset, $items_per_page);
        $total_items = countOrdersByMonth($month, $year, $filter);

        // Kiểm tra nếu không có đơn hàng
        if (empty($orders) || $total_items == 0) {
            $_SESSION['message'] = [
                'type' => 'warning',
                'text' => 'Không tìm thấy đơn hàng nào trong tháng ' . $month . '/' . $year . '.'
            ];
        } else {
            // Lưu dữ liệu vào session nếu có đơn hàng
            $_SESSION['orders'] = $orders;
            $_SESSION['total_items'] = $total_items;
            $_SESSION['current_page'] = $current_page;
            $_SESSION['items_per_page'] = $items_per_page;
            $_SESSION['search'] = '';
            $_SESSION['filter'] = $filter;
            $_SESSION['sort'] = $sort;
            $_SESSION['selected_month'] = $month;
            $_SESSION['selected_year'] = $year;
        }

        header("location: /baocao/quanlydonhang");
        exit();
    }

    if ($action === 'admin_stats') {
        $selectedMonth = isset($_POST['month']) ? (int)$_POST['month'] : date('n');
        $selectedYear = isset($_POST['year']) ? (int)$_POST['year'] : date('Y');

        // Lưu các tham số đã chọn vào session
        $_SESSION['selected_month'] = $selectedMonth;
        $_SESSION['selected_year'] = $selectedYear;

        // Lấy dữ liệu và lưu vào session
        $_SESSION['available_months'] = getAvailableMonths();
        $_SESSION['customer_count'] = getCustomerCount();
        $_SESSION['product_count'] = getProductCount();

        // Lấy dữ liệu doanh thu theo tháng/năm đã chọn
        $revenueData = getRevenueByMonth($selectedMonth, $selectedYear);
        $_SESSION['revenue'] = $revenueData['revenue'];
        $_SESSION['order_count'] = $revenueData['order_count'];

        // Lấy dữ liệu đơn hủy theo tháng/năm đã chọn
        $canceledOrders = getCanceledOrdersStats($selectedMonth, $selectedYear);
        $_SESSION['canceled_count'] = $canceledOrders['count'];
        $_SESSION['canceled_amount'] = $canceledOrders['amount'];

        // Lấy dữ liệu tháng trước để tính phần trăm tăng/giảm (nếu có)
        $availableMonths = $_SESSION['available_months'];
        $prevMonthData = null;

        foreach ($availableMonths as $index => $monthData) {
            if ($monthData['year'] == $selectedYear && $monthData['month'] == $selectedMonth) {
                if (isset($availableMonths[$index + 1])) {
                    $prevMonthData = $availableMonths[$index + 1];
                    break;
                }
            }
        }

        if ($prevMonthData) {
            $prevMonth = $prevMonthData['month'];
            $prevYear = $prevMonthData['year'];
            $prevRevenueData = getRevenueByMonth($prevMonth, $prevYear);
            $prevRevenue = $prevRevenueData['revenue'];

            if ($prevRevenue > 0) {
                $percentChange = (($revenueData['revenue'] - $prevRevenue) / $prevRevenue) * 100;
                $_SESSION['percent_change'] = round($percentChange, 1);
            }
        }

        // Chuyển hướng đến View
        header("Location: /baocao/admin");
        exit();
    }

    if ($action == 'delete_product') {
        $delete_id = isset($_POST['delete_id']) ? intval($_POST['delete_id']) : 0;
        $table = isset($_POST['table']) ? $_POST['table'] : '';
        $product_name = $_POST['product'] ?? '';

        // Kiểm tra dữ liệu hợp lệ
        if ($delete_id > 0 && !empty($table)) {
            $result = xoaSanPham($table, $delete_id);
            if ($result) {
                if (deleteCartItem($conn, $product_name)) {
                    xoaSanPhamTrongBangSize($conn, $product_name);
                    $_SESSION['message'] = 'Xóa sản phẩm thành công!';
                } else {
                    $_SESSION['message'] = 'Đã xóa sản phẩm nhưng lỗi khi ẩn các mục trong giỏ hàng!';
                }
                $_SESSION['message_type'] = 'success';
            } else {
                $_SESSION['message'] = 'Lỗi khi xóa sản phẩm!';
                $_SESSION['message_type'] = 'danger';
            }
        }

        // Chuyển hướng về trang delete_product.php với danh mục hiện tại
        header("Location: /baocao/delete_product?table=$table&show_inactive=1");
        exit;
    }

    if ($action === 'home_news') {
        // Lấy bài tin tức chính (1 bài mới nhất hoặc nổi bật)
        $main_query = "SELECT * FROM news WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1";
        $main_result = mysqli_query($conn, $main_query);
        $main_news = mysqli_fetch_assoc($main_result);

        // Lấy các bài tin tức phụ (4 bài tiếp theo)
        $side_query = "SELECT * FROM news WHERE is_active = 1 ORDER BY created_at DESC LIMIT 4 OFFSET 1";
        $side_result = mysqli_query($conn, $side_query);
        $side_news = [];
        while ($row = mysqli_fetch_assoc($side_result)) {
            $side_news[] = $row;
        }

        // Lưu vào session
        $_SESSION['main_news'] = $main_news;
        $_SESSION['side_news'] = $side_news;

        // Chuyển hướng về trang chủ
        header("Location: /baocao/trangchu");
        exit();
    }


    // Xem chi tiết bài viết
    if ($action === 'detail') {
        // Kiểm tra có tham số id không
        if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
            header("Location: /baocao/danhmuctin");
            exit();
        }

        $id = intval($_GET['id']);

        // Lấy chi tiết bài viết
        $news_item = getNewsDetail($id);

        if (!$news_item) {
            header("Location: /baocao/danhmuctin");
            exit();
        }

        // Lấy các hình ảnh liên quan đến tin tức
        $news_images = getNewsImages($id);

        // Lấy hình ảnh chính (primary image)
        $primary_image = null;
        foreach ($news_images as $img) {
            if ($img['is_primary'] == 1) {
                $primary_image = $img;
                break;
            }
        }

        // Tăng số lượt xem
        updateNewsViews($id);

        // Lưu dữ liệu vào session để sử dụng trong view
        $_SESSION['news_item'] = $news_item;
        $_SESSION['news_images'] = $news_images;
        $_SESSION['primary_image'] = $primary_image;
        $_SESSION['related_news'] = getRelatedNews($id, 5);
        $_SESSION['categories'] = getNewsCategories(5);
        $_SESSION['sidebar_news'] = getSidebarNews(5);
        $_SESSION['tags'] = getAllTags();

        header("Location: /baocao/tintuc/" . to_short_slug($news_item['title'], 5));
        exit();
    }

    if ($action === 'tag') {
        // Kiểm tra có tham số tag_id không
        if (!isset($_POST['tag_id']) || !is_numeric($_POST['tag_id'])) {
            $_SESSION['error_msg'] = "Tag ID không hợp lệ.";
            header("Location: /baocao/danhmuctin");
            exit();
        }

        $tag_id = intval($_POST['tag_id']);

        // Lấy thông tin tag và tin tức liên quan
        $tag_info = getTagInfo($tag_id);
        if (!$tag_info) {
            $_SESSION['error_msg'] = "Tag không tồn tại.";
            header("Location: /baocao/danhmuctin");
            exit();
        }

        $_SESSION['tag'] = $tag_info;
        $_SESSION['tag_news'] = getNewsByTag($tag_id);
        $_SESSION['categories'] = getNewsCategories(5);
        $_SESSION['sidebar_news'] = getSidebarNews(5);
        $_SESSION['tags'] = getAllTags();

        $tag_slug = to_slug($tag_info['name']);

        // Chuyển hướng đến tag.php
        header("Location: /baocao/tag/" . $tag_slug);
        exit();
    }

    // Lấy danh sách bài viết (mặc định)
    if ($action === 'list') {
        // Process the request for list action
        $current_page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

        // Ensure page number is valid
        if ($current_page < 1) $current_page = 1;

        // Lấy danh sách bài viết nổi bật
        $featured_news = getFeaturedNews(3);
        $featured_ids = array_column($featured_news, 'id');

        // Lấy danh sách bài viết phân trang
        $paginated_news = getPaginatedNews($featured_ids, $current_page, 5);

        // Lưu dữ liệu vào session để sử dụng trong view
        $_SESSION['featured_news'] = $featured_news;
        $_SESSION['paginated_news'] = $paginated_news['news'];
        $_SESSION['total_pages'] = $paginated_news['total_pages'];
        $_SESSION['current_page'] = $paginated_news['current_page'];
        $_SESSION['categories'] = getNewsCategories(5);
        $_SESSION['sidebar_news'] = getSidebarNews(5);
        $_SESSION['tags'] = getAllTags();

        // Store the current URL for pagination links
        $_SESSION['controller_url'] = $_SERVER['PHP_SELF'];

        // Redirect to the view with the page parameter preserved
        header("Location: /baocao/danhmuctin");
        exit();
    }
}


//function tạo mã OTP
function generateOTP($length = 6)
{
    $min = pow(10, $length - 1);
    $max = pow(10, $length) - 1;
    return sprintf("%0{$length}d", mt_rand($min, $max));
}

function to_slug($str)
{
    // Chuyển tiếng Việt có dấu thành không dấu
    $str = mb_strtolower($str, 'UTF-8');
    $str = preg_replace('/[áàảãạâấầẩẫậăắằẳẵặ]/u', 'a', $str);
    $str = preg_replace('/[éèẻẽẹêếềểễệ]/u', 'e', $str);
    $str = preg_replace('/[iíìỉĩị]/u', 'i', $str);
    $str = preg_replace('/[óòỏõọôốồổỗộơớờởỡợ]/u', 'o', $str);
    $str = preg_replace('/[úùủũụưứừửữự]/u', 'u', $str);
    $str = preg_replace('/[ýỳỷỹỵ]/u', 'y', $str);
    $str = preg_replace('/đ/u', 'd', $str);

    // Loại bỏ ký tự đặc biệt
    $str = preg_replace('/[^a-z0-9\s-]/', '', $str);

    // Thay dấu cách bằng gạch ngang
    $str = preg_replace('/[\s]+/', '-', $str);

    return trim($str, '-');
}

function to_short_slug($productName, $slug)
{
    $words = explode(" ", $productName);
    return to_slug(implode("-", array_slice($words, 0, $slug))); // lấy 3 từ đầu tiên
}

function addHyphen($string)
{
    // Từ điển ánh xạ các danh mục
    $categoryMap = [
        // Môn thể thao
        'bongro' => 'bong-ro',
        'quabongro' => 'qua-bong-ro',
        'giaybongro' => 'giay-bong-ro',
        'quanaobongro' => 'quan-ao-bong-ro',
        'phukienbongro' => 'phu-kien-bong-ro',
        'bongchuyen' => 'bong-chuyen',
        'quabongchuyen' => 'qua-bong-chuyen',
        'giaybongchuyen' => 'giay-bong-chuyen',
        'quanaobongchuyen' => 'quan-ao-bong-chuyen',
        'phukienbongchuyen' => 'phu-kien-bong-chuyen',
        'bongda' => 'bong-da',
        'quabongda' => 'qua-bong-da',
        'giaybongda' => 'giay-bong-da',
        'quanaobongda' => 'quan-ao-bong-da',
        'phukienbongda' => 'phu-kien-bong-da',
        'tapgym' => 'tap-gym',
        'giaytapgym' => 'giay-tap-gym',
        'quanaogym' => 'quan-ao-gym',
        'phukiengym' => 'phu-kien-gym',
        'chaybo' => 'chay-bo',
        'giaychaybo' => 'giay-chay-bo',
        'quanaochaybo' => 'quan-ao-chay-bo',
        'phukienchaybo' => 'phu-kien-chay-bo',
        'caulong' => 'cau-long',
        'votcaulong' => 'vot-cau-long',
        'cauthidau' => 'cau-thi-dau',
        'giaycaulong' => 'giay-cau-long',
        'quanaocaulong' => 'quan-ao-cau-long',
        'phukiencaulong' => 'phu-kien-cau-long',
        'bia' => 'bia',
        'gaybia' => 'gay-bia',
        'aobia' => 'ao-bia',
        'phukienbia' => 'phu-kien-bia',
        'pickleball' => 'pickle-ball',
        'votpickleball' => 'vot-pickle-ball',
        'giaypickleball' => 'giay-pickle-ball',
        'phukienpick' => 'phu-kien-pick',

        // Áo thể thao nam
        'aothethaonam' => 'ao-the-thao-nam',
        'aophongnam' => 'ao-phong-nam',
        'aopolonam' => 'ao-polo-nam',
        'aokhoacnam' => 'ao-khoac-nam',
        'aohoodienam' => 'ao-hoodie-nam',
        'aobodynam' => 'ao-body-nam',
        'quanthethaonam' => 'quan-the-thao-nam',
        'quanshortnam' => 'quan-short-nam',
        'quandainam' => 'quan-dai-nam',
        'quanbodynam' => 'quan-body-nam',
        'bothethaonam' => 'bo-the-thao-nam',
        'bobongdanam' => 'bo-bong-da-nam',
        'bobongchuyennam' => 'bo-bong-chuyen-nam',
        'bocaulongnam' => 'bo-cau-long-nam',
        'giaythethaonam' => 'giay-the-thao-nam',
        'giaybongronam' => 'giay-bong-ro-nam',
        'giaybongchuyennam' => 'giay-bong-chuyen-nam',
        'giaybongdanam' => 'giay-bong-da-nam',
        'giaychaybonam' => 'giay-chay-bo-nam',
        'giaycaulongnam' => 'giay-cau-long-nam',

        // Áo thể thao nữ
        'aothethaonu' => 'ao-the-thao-nu',
        'aophongnu' => 'ao-phong-nu',
        'aopolonu' => 'ao-polo-nu',
        'aohoodienu' => 'ao-hoodie-nu',
        'aokhoacnu' => 'ao-khoac-nu',
        'quanthethaonu' => 'quan-the-thao-nu',
        'quanshortnu' => 'quan-short-nu',
        'quandainu' => 'quan-dai-nu',
        'quanleggingnu' => 'quan-legging-nu',
        'bothethaonu' => 'bo-the-thao-nu',
        'bobongchuyennu' => 'bo-bong-chuyen-nu',
        'bocaulongnu' => 'bo-cau-long-nu',
        'giaythethaonu' => 'giay-the-thao-n terminu',
        'giaybongronu' => 'giay-bong-ro-nu',
        'giaybongchuyennu' => 'giay-bong-chuyen-nu',
        'giaychaybonu' => 'giay-chay-bo-nu',
        'giaycaulongnu' => 'giay-cau-long-nu',

        // Phụ kiện
        'balo&tui' => 'balo-tui',
        'balo' => 'balo',
        'balo_tuidung' => 'balo-tui-dung',
        'pkkhac' => 'phu-kien-khac',
        'pkbongda' => 'phu-kien-bong-da',
        'pkcaulong' => 'phu-kien-cau-long',
        'pkbongro' => 'phu-kien-bong-ro',
        'pkbongchuyen' => 'phu-kien-bong-chuyen',
        'pkbia' => 'phu-kien-bia',

        // Thương hiệu
        'dongluc' => 'dong-luc',
        'quanaodongluc' => 'quan-ao-dong-luc',
        'giaydepdongluc' => 'giay-dep-dong-luc',
        'bongdongluc' => 'bong-dong-luc',
        'pkttdongluc' => 'phu-kien-the-thao-dong-luc',
        'grandsport' => 'grand-sport',
        'quanaograndsport' => 'quan-ao-grand-sport',
        'giaydepgrandsport' => 'giay-dep-grand-sport',
        'spalding' => 'spalding',
        'bongspalding' => 'bong-spalding',
        'pkttspalding' => 'phu-kien-the-thao-spalding',
        'peak' => 'peak',
        'giaybongropeak' => 'giay-bong-ro-peak',
        'giaychaybopeak' => 'giay-chay-bo-peak',
        'bubadu' => 'bubadu',
        'quanaobubadu' => 'quan-ao-bubadu',
        'votbubadu' => 'vot-bubadu',
        'pkttbubadu' => 'phu-kien-the-thao-bubadu',
        'saovang' => 'sao-vang',
        'giaysaovang' => 'giay-sao-vang',
        'quanaosaovang' => 'quan-ao-sao-vang',
        'pkttsaovang' => 'phu-kien-the-thao-sao-vang',
        'peri' => 'peri',
        'coperi' => 'co-peri',
        'pkttperi' => 'phu-kien-the-thao-peri',
        'zocker' => 'zocker',
        'giaychaybozocker' => 'giay-chay-bo-zocker',
        'giaybongdazocker' => 'giay-bong-da-zocker',
        'pkttzocker' => 'phu-kien-the-thao-zocker',
        'pickzocker' => 'pick-zocker',

        'saleoutlet40' => 'sale-outlet'
    ];

    $string = strtolower($string); // Chuyển thành chữ thường
    // Kiểm tra nếu chuỗi tồn tại trong từ điển
    if (isset($categoryMap[$string])) {
        return $categoryMap[$string];
    }

    // Nếu không có trong từ điển, thử tách bằng biểu thức chính quy
    $result = preg_replace('/([a-z])([A-Z])/', '$1-$2', lcfirst($string));
    return $result;
}



if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Đăng nhập
    if (isset($_POST['dangnhap'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];

        $_SESSION['form_data'] = [
            'username' => $username,
        ];

        if (empty($username)) {
            $_SESSION['error_msg'] = "Tài khoản không được để trống.";
            $_SESSION['form_data']['username'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login");
            exit;
        }

        if (empty($password)) {
            $_SESSION['error_msg'] = "Mật khẩu không được để trống.";
            header("Location: /baocao/login");
            exit;
        }

        try {
            $passBrypt = passBrypt($username);
            $checkpassbrypt = password_verify($password, $passBrypt);

            if (!$checkpassbrypt) {
                $_SESSION['error_msg'] = "Sai mật khẩu!";
                header("location: /baocao/login");
                exit();
            }

            // Gọi hàm kiểm tra đăng nhập
            $user = checkUserLogin($username, $passBrypt);

            // Nếu không tìm thấy người dùng hoặc mật khẩu sai
            if (!$user) {
                $_SESSION['error_msg'] = "Tài khoản hoặc mật khẩu không đúng.";
                $_SESSION['form_data']['username'] = '';
                header("Location: /baocao/login");
                exit;
            }

            if ($user['active_2fa']) {
                try {
                    $email = $user['email'];
                    $token = generateOTP();
                    storeResetToken($email, $token);
                    $_SESSION['otp_code'] = $token;
                    $subject = "Xác thực để đăng nhập";
                    $message = "Mã OTP của bạn là: $token\nVui lòng nhập mã này để xác thực đăng nhập.\nMã có hiệu lực trong 5 phút.";
                    $_SESSION['pending_login'] = [
                        'username' => $username,
                        'password' => $passBrypt,
                    ];
                    if (sendMail($email, $subject, $message)) {
                        $_SESSION['success_msg'] = "Xác thực để đăng nhập!";
                        header("Location: /baocao/login?show=authen");
                        exit;
                    } else {
                        $_SESSION['error_msg'] = "Lỗi khi gửi mail để xác thực!";
                        header("Location: /baocao/login");
                        exit;
                    }
                } catch (Exception $e) {
                    $_SESSION['error_msg'] = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
                    header("Location: /baocao/login");
                    exit;
                }
            }

            // /// tạo session id mới để tránh session fixation
            session_regenerate_id(true);

            // Đăng nhập thành công
            $_SESSION['mySession'] = $user['username'];
            $_SESSION['getvoucher'] = $user['id_user'];
            $_SESSION['info'] = getUserInfo($username);
            $_SESSION['success_msg'] = "Đăng nhập thành công!";
            unset($_SESSION['form_data']);

            ///////////////// bảo mật phiên theo thời gian sử dụng
            $_SESSION['LAST_ACTIVITY'] = time();

            // // Tạo mã login token bảo mật
            // $token = bin2hex(random_bytes(32));
            // $_SESSION['login_token'] = $token;
            // updateLoginToken($token, $username);

            header('location: /baocao/trangchu');
            exit();
        } catch (Exception $e) {
            // Xử lý lỗi từ cơ sở dữ liệu hoặc hàm checkUserLogin
            $_SESSION['error_msg'] = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
            header("Location: /baocao/login");
            exit;
        }
    }

    //Đang nhap khi da bật 2fa
    if (isset($_POST['authen'])) {
        $otp = $_POST['otp'];
        if (empty($otp)) {
            $_SESSION['error_msg'] = "OTP không được để trống.";
            header("Location: /baocao/login?show=authen");
            exit;
        }

        if ($otp === $_SESSION['otp_code']) {
            if (!isset($_SESSION['pending_login'])) {
                $_SESSION['error_msg'] = "Phiên xác thực không hợp lệ.";
                header("Location: /baocao/login?show=authen");
                exit;
            }
            $loginData = $_SESSION['pending_login'];
            $username = $loginData['username'];
            $password = $loginData['password'];
            unset($_SESSION['pending_login']);
            unset($_SESSION['otp_code']);

            $user = checkUserLogin($username, $password);


            // / tạo session id mới để tránh session fixation
            session_regenerate_id(true);

            // Đăng nhập thành công
            $_SESSION['mySession'] = $user['username'];
            $_SESSION['getvoucher'] = $user['id_user'];
            $_SESSION['info'] = getUserInfo($username);
            $_SESSION['success_msg'] = "Đăng nhập thành công!";
            updateToken($username);
            $_SESSION['LAST_ACTIVITY'] = time();

            if ($username === "admin") {
                header('location: /baocao/admin');
                exit();
            }

            // // Tạo mã login token bảo mật
            // $token = bin2hex(random_bytes(32));
            // $_SESSION['login_token'] = $token;
            // updateLoginToken($token, $username);

            header('location: /baocao/trangchu');
            exit();
        } else {
            $_SESSION['error_msg'] = "Mã OTP không đúng!";
            header("Location: /baocao/login?show=authen");
            exit();
        }
    }

    // Đăng xuất
    if (isset($_POST['logout'])) {
        if (isset($_SESSION['mySession'])) {
            $username = $_SESSION['mySession'];
            // $login_token = null;
            // updateLoginToken($login_token, $username);
            unset($_SESSION['mySession']);
            unset($_SESSION['user']); // Xóa thông tin người dùng
            unset($_SESSION['info']);
            unset($_SESSION['getvoucher']);
            // session_unset();
            // session_destroy();
            $_SESSION['success_msg'] = "Đăng xuất thành công!";
            session_regenerate_id(true);
            // unset($_SESSION['cart']); // Xóa thông tin giỏ hàng
            header("location: /baocao/trangchu");
            exit();
        }
    }

    // Đăng ký
    if (isset($_POST['dangky'])) {
        $username = $_POST['username'];
        $password = $_POST['password'];
        $fullname = $_POST['fullname'];
        $email = $_POST['email'];
        $phone = $_POST['phone'];
        $address = $_POST['address'];


        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        // Kiểm tra dữ liệu đầu vào
        // Lưu các giá trị đã nhập để giữ lại trong form
        $_SESSION['form_data'] = [
            'fullname' => $fullname,
            'username' => $username,
            'email' => $email,
            'phone' => $phone,
            'address' => $address
        ];

        // Kiểm tra từng trường
        if (empty($fullname)) {
            $_SESSION['error_msg'] = "Họ và tên không được để trống.";
            $_SESSION['form_data']['fullname'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login?show=register");
            exit;
        }

        if (empty($username)) {
            $_SESSION['error_msg'] = "Tài khoản không được để trống.";
            $_SESSION['form_data']['username'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login?show=register");
            exit;
        }

        if (empty($password)) {
            $_SESSION['error_msg'] = "Mật khẩu không được để trống.";
            header("Location: /baocao/login?show=register");
            exit;
        }
        if (strlen($password) < 8) {
            $_SESSION['error_msg'] = "Mật khẩu phải có ít nhất 8 ký tự.";
            header("Location: /baocao/login?show=register");
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $_SESSION['error_msg'] = "Email không hợp lệ.";
            $_SESSION['form_data']['email'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login?show=register");
            exit;
        }

        if (!preg_match("/^[0-9]{10}$/", $phone)) {
            $_SESSION['error_msg'] = "Số điện thoại không hợp lệ.";
            $_SESSION['form_data']['phone'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login?show=register");
            exit;
        }

        if (empty($address)) {
            $_SESSION['error_msg'] = "Địa chỉ không được để trống.";
            $_SESSION['form_data']['address'] = ''; // Xóa trường lỗi
            header("Location: /baocao/login?show=register");
            exit;
        }

        $userExist = checkUserExist($username);
        $emailExist = checkEmailExist($email);
        if ($userExist && $emailExist) {
            $_SESSION['error_msg'] = "Tài khoản và Email đã tồn tại!";
            $_SESSION['form_data']['username'] = '';
            $_SESSION['form_data']['email'] = '';
            header("Location: /baocao/login?show=register");
            exit();
        } else if ($userExist) {
            $_SESSION['error_msg'] = "Tài khoản đã tồn tại!";
            $_SESSION['form_data']['username'] = '';
            header("Location: /baocao/login?show=register");
            exit();
        } else if ($emailExist) {
            $_SESSION['error_msg'] = "Email đã tồn tại!";
            $_SESSION['form_data']['email'] = '';
            header("Location: /baocao/login?show=register");
            exit();
        }

        try {
            $token = generateOTP();
            $_SESSION['otp_code_register'] = $token;
            $subject = "Xác thực để đăng ký";
            $message = "Mã OTP của bạn là: $token\nVui lòng nhập mã này để xác thực đăng ký.\nMã có hiệu lực trong 5 phút.";
            $_SESSION['pending_register'] = [
                'username' => $username,
                'password' => $hashedPassword,
                'fullname' => $fullname,
                'email' => $email,
                'phone' => $phone,
                'address' => $address,
                'token' => $token,
            ];
            if (sendMail($email, $subject, $message)) {
                $_SESSION['success_msg'] = "Xác thực mail để đăng ký!";
                header("Location: /baocao/login?show=authen-register");
                exit;
            } else {
                $_SESSION['error_msg'] = "Lỗi khi gửi mail để xác thực!";
                header("Location: /baocao/login?show=register");
                exit;
            }
        } catch (Exception $e) {
            $_SESSION['error_msg'] = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
            header("Location: /baocao/login?show=register");
            exit;
        }
    }

    //Xác thực email đăng ký
    if (isset($_POST['authen_register'])) {
        $otp = $_POST['otp'];
        if (empty($otp)) {
            $_SESSION['error_msg'] = "OTP không được để trống.";
            header("Location: /baocao/login?show=authen-register");
            exit;
        }

        if ($otp === $_SESSION['otp_code_register']) {
            if (!isset($_SESSION['pending_register'])) {
                $_SESSION['error_msg'] = "Phiên xác thực không hợp lệ.";
                header("Location: /baocao/login?show=authen-register");
                exit;
            }
            $loginData = $_SESSION['pending_register'];
            $username = $loginData['username'];
            $password = $loginData['password'];
            $fullname = $loginData['fullname'];
            $email = $loginData['email'];
            $phone = $loginData['phone'];
            $address = $loginData['address'];
            $token = $loginData['token'];
            echo $token;
            unset($_SESSION['pending_register']);
            unset($_SESSION['otp_code_register']);

            $insert_id = dangky($username, $password, $email, $phone, $fullname, $address);    ////////// đã băm mật khẩu
            if ($insert_id) {
                $_SESSION['mySession'] = $username;
                $_SESSION['success_msg'] = "Đăng ký thành công! Đăng nhập để vào tài khoản";
                createVoucher($insert_id);
                unset($_SESSION['form_data']);
                header('location: /baocao/login');
                exit();
            } else {
                $_SESSION['error_msg'] = "Đăng ký thất bại! Vui lòng thử lại.";
                header("Location: /baocao/login?show=authen-register");
                exit();
            }
        } else {
            $_SESSION['error_msg'] = "Mã OTP không đúng!";
            header("Location: /baocao/login?show=authen-register");
            exit();
        }
    }

    // Quên mật khẩu
    if (isset($_POST['forgot'])) {
        $email = $_POST['email'];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $_SESSION['error_msg'] = "Email không hợp lệ.";
            header("Location: /baocao/login?show=forgot");
            exit;
        }


        try {
            $emailExist = checkEmailExist($email);
            if (!$emailExist) {
                $_SESSION['error_msg'] = "Email không tồn tại!";
                header("Location: /baocao/login?show=forgot");
                exit();
            }
            $token = bin2hex(random_bytes(32));
            storeResetToken($email, $token);
            $resetLink = "http://localhost/baocao/view/php/reset_password.php?token=$token";
            $subject = "Yêu cầu đặt lại mật khẩu tại shop NHL SPORTS";
            $message = "Nhấp vào link sau để đặt lại mật khẩu: <a href='$resetLink'>Đặt lại mật khẩu</a>";
            if (sendMail($email, $subject, $message)) {
                $_SESSION['success_msg'] = "Email đặt lại mật khẩu đã được gửi!";
                header("Location: /baocao/trangchu");
                exit;
            } else {
                $_SESSION['error_msg'] = "Lỗi khi gửi mail!";
                header("Location: /baocao/login?show=forgot");
                exit;
            }
        } catch (Exception $e) {
            $_SESSION['error_msg'] = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
            header("Location: /baocao/login?show=forgot");
            exit;
        }
    }

    // Reset mật khẩu qua token
    if (isset($_POST['resetpass'])) {
        $newpass = $_POST['newpass'];
        $reconfirm = $_POST['reconfirm'];
        if ($newpass == $reconfirm) {
            if (!isset($_SESSION['reset_token'])) {
                $_SESSION['error_msg'] = "Lỗi cập nhập! Vui lòng thử lại";
                header("Location: /baocao/login?show=forgot");
                exit();
            }
            $token = $_SESSION['reset_token'];
            unset($_SESSION['reset_token']);
            $passBrypt = password_hash($newpass, PASSWORD_BCRYPT);
            $result = changePassword($passBrypt, $token);
            if ($result) {
                $_SESSION['success_msg'] = "Đặt lại mật khẩu thành công! Tiến hành đăng nhập";
                header("Location: /baocao/login");
                exit();
            } else {
                $_SESSION['error_msg'] = "Lỗi cập nhập! Vui lòng thử lại";
                header("Location: /baocao/login?show=forgot");
                exit();
            }
        } else {
            $_SESSION['error_msg'] = "Xác nhận mật khẩu không khớp!";
            header("Location: /baocao/login?show=forgot");
            exit();
        }
    }

    // Lấy giỏ hàng
    if (isset($_POST['get_cart'])) {
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']);
            $cart = getCartByUser($user['id_user']);
            echo json_encode($cart);
        } else {
            echo json_encode([]);
        }
        exit();
    }

    // Thêm vào giỏ hàng
    if (isset($_POST['add_to_cart'])) {
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']);
            $image = isset($_POST['image']) ? basename($_POST['image']) : 'null';
            $product_name = $_POST['product_name'] ?? '';
            $size = $_POST['size'] ?? 'N/A';
            $price = $_POST['price'] ?? '';
            $quantity = isset($_POST['quantity']) ? (int)$_POST['quantity'] : 0;
            if (empty($product_name) || $price <= 0 || $quantity <= 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ.',
                ]);
                exit;
            }
            $result  = checkProductInDatabase($user['id_user'], $product_name, $size);
            if ($result && $result->num_rows > 0) {
                // Nếu có thì tăng số lượng lên
                $row = $result->fetch_assoc();
                $new_quantity = $row['quantity'] + $quantity;
                $success = updateCart($new_quantity, $row['id']);
            } else {
                // Thêm sản phẩm mới vào giỏ hàng
                $success = insertProductToCart($user['id_user'], $product_name, $price, $size, $quantity, $image);
            }
            if ($success) {
                echo json_encode([
                    'success' => $success,
                    'message' => 'Đã thêm vào giỏ hàng.',
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lỗi khi thêm vào giỏ hàng.',
                    'debug' => $debug_data
                ]);
            }
            exit;
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng đăng nhập!',
                'debug' => ['error' => 'User not logged in']
            ]);
        }
        exit();
    }


    // Cập nhật giỏ hàng
    if (isset($_POST['update_cart'])) {
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']);
            $product_name = $_POST['product_name'] ?? '';
            $size = $_POST['size'] ?? 'N/A';
            // $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
            $quantity = ($_POST['quantity'] ?? 1);
            // error_log("Cập nhật giỏ hàng: id=$id, quantity=$quantity, id_user={$user['id_user']}"); // Debug dữ liệu nhận được

            if ($quantity <= 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ: ID hoặc số lượng không đúng.'
                ]);
                exit();
            }
            $result = updateProductQuantity($user['id_user'], $product_name, $size, $quantity);
            // $result = updateProductQuantityById($user['id_user'], $id, $quantity);
            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Đã cập nhật số lượng.' : 'Cập nhật thất bại.'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập.'
            ]);
        }
        exit();
    }

    // Xóa khỏi giỏ hàng
    if (isset($_POST['remove_from_cart'])) {
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']);
            $product_name = $_POST['product_name'] ?? '';
            $size = $_POST['size'] ?? 'N/A';
            $result = removeProductFromCart($user['id_user'], $product_name, $size);
            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Đã xoá sản phẩm khỏi DB.' : 'Không thể xoá sản phẩm.'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập.'
            ]);
        }
        exit();
    }

    // Lấy thông tin người dùng khi ấn vào tài khoản
    if (isset($_POST['taikhoan'])) {
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']); //hàm này trả về mảng thông tin người dùng
            $_SESSION['user'] = $user ?: []; // Nếu $user là false/null, gán mảng rỗng
        } else {
            $_SESSION['user'] = []; // Người dùng chưa đăng nhập
        }
        header("location: /baocao/taikhoan");
    }

    //zxcvb
    // Cập nhật thông tin người dùng
    if (isset($_POST['update_user_info'])) {
        $response = ['success' => false, 'message' => ''];
        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
        $fullname = isset($_POST['fullname']) ? trim($_POST['fullname']) : '';
        $email = isset($_POST['email']) ? trim($_POST['email']) : '';
        $phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
        $address = isset($_POST['address']) ? trim($_POST['address']) : '';
        $password = isset($_POST['password']) ? trim($_POST['password']) : '';

        // Kiểm tra dữ liệu
        if (empty($fullname) || empty($email) || empty($phone) || empty($address)) {
            $response['message'] = 'Vui lòng điền đầy đủ thông tin.';
            echo json_encode($response);
            exit();
        }

        // Kiểm tra định dạng email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $response['message'] = 'Email không hợp lệ.';
            echo json_encode($response);
            exit();
        }

        // Kiểm tra định dạng số điện thoại
        if (!preg_match('/^[0-9]{10}$/', $phone)) {
            $response['message'] = 'Số điện thoại không hợp lệ.';
            echo json_encode($response);
            exit();
        }

        // Kiểm tra mật khẩu
        if (empty($password)) {
            $response['message'] = 'Vui lòng nhập mật khẩu để xác nhận.';
            echo json_encode($response);
            exit();
        }

        // Kiểm tra mật khẩu người dùng
        if (!verifyUserPassword($user_id, $password)) {
            $response['message'] = 'Mật khẩu không đúng.';
            echo json_encode($response);
            exit();
        }

        $success = updateInfoUser($fullname, $email, $phone, $address, $user_id);
        if ($success) {
            // Cập nhật session
            $_SESSION['info']['fullname'] = $fullname;
            $_SESSION['info']['email'] = $email;
            $_SESSION['info']['phone'] = $phone;
            $_SESSION['info']['address'] = $address;
            $response['success'] = true;
        } else {
            $response['message'] = 'Lỗi khi cập nhật thông tin.';
        }
        echo json_encode($response);
        exit();
    }



    // Đổi mật khẩu trong trang tài khoản
    if (isset($_POST['change_password'])) {
        header("Content-Type: application/json");
        $response = ['success' => false, 'message' => ''];
        // // Debug: Ghi log yêu cầu nhận được
        // error_log("change_password: POST data: " . print_r($_POST, true));
        // Kiểm tra đăng nhập
        if (!isset($_SESSION['mySession']) || !isset($_SESSION['info']['id_user'])) {
            $response['message'] = 'Vui lòng đăng nhập.';
            error_log("change_password: Error: User not logged in");
            echo json_encode($response);
            exit();
        }

        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;

        $old_password = isset($_POST['old_password']) ? trim($_POST['old_password']) : '';
        $new_password = isset($_POST['new_password']) ? trim($_POST['new_password']) : '';

        // Kiểm tra đầu vào
        if (empty($old_password) || empty($new_password)) {
            $response['message'] = 'Vui lòng điền đầy đủ mật khẩu cũ và mới.';
            error_log("change_password: Error: Empty old_password or new_password");
            echo json_encode($response);
            exit();
        }

        if (strlen($new_password) < 8) {
            $response['message'] = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
            error_log("change_password: Error: New password too short");
            echo json_encode($response);
            exit();
        }

        // Lấy thông tin người dùng
        $user = getUserInfo($_SESSION['mySession']);
        if (!$user) {
            $response['message'] = 'Không tìm thấy thông tin người dùng.';
            error_log("change_password: Error: User not found for session={$_SESSION['mySession']}");
            echo json_encode($response);
            exit();
        }


        // Kiểm tra mật khẩu cũ
        if (!password_verify($old_password, $user['password'])) {
            $response['message'] = 'Mật khẩu cũ không đúng!';
            echo json_encode($response);
            exit();
        }

        // Mã hóa mật khẩu mới
        $passBryptNew = password_hash($new_password, PASSWORD_BCRYPT);

        // Cập nhật mật khẩu
        $success = changePasswordInAccount($passBryptNew, $user['email']);
        if ($success) {
            $response['success'] = true;
            error_log("change_password: Success: Password updated for user_id=$user_id");
        } else {
            $response['message'] = 'Lỗi khi cập nhật mật khẩu trong cơ sở dữ liệu.';
            error_log("change_password: Error: Database update failed for user_id=$user_id");
        }

        echo json_encode($response);
        exit();
    }

    // Xử lý upload avatar
    if (isset($_POST['update_avatar'])) {
        header("Content-Type: application/json");
        $response = ['success' => false, 'message' => ''];

        $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] == UPLOAD_ERR_NO_FILE) {
            $response['message'] = 'Vui lòng chọn một file ảnh.';
            error_log("Error: No file uploaded");
            echo json_encode($response);
            exit();
        }

        $file = $_FILES['avatar'];
        $max_size = 5 * 1024 * 1024; // 5MB

        error_log("Received avatar: user_id=$user_id, filename=" . $file['name'] . ", type=" . $file['type'] . ", size=" . $file['size']);

        // Kiểm tra kích thước file
        if ($file['size'] > $max_size) {
            $response['message'] = 'Kích thước file không được vượt quá 5MB.';
            echo json_encode($response);
            exit();
        }

        // Đường dẫn lưu file
        $original_filename = pathinfo($file['name'], PATHINFO_FILENAME);
        $upload_dir = "../view/img/upload/avatar/";
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $new_filename = $original_filename . '.' . $file_extension;
        $upload_path = $upload_dir . $new_filename;

        // Di chuyển file vào thư mục
        if (move_uploaded_file($file['tmp_name'], $upload_path)) {
            // Xóa avatar cũ (nếu có)
            if (!empty($_SESSION['info']['avatar']) && file_exists($upload_dir . $_SESSION['info']['avatar'])) {
                if (!unlink($upload_dir . $_SESSION['info']['avatar'])) {
                    error_log("Warning: Failed to delete old avatar " . $upload_dir . $_SESSION['info']['avatar']);
                }
            }

            // Cập nhật database
            $success = updateAvatar($new_filename, $user_id);

            if ($success) {
                // Cập nhật session
                $_SESSION['info']['avatar'] = $new_filename;
                $response['success'] = true;
                $response['avatar'] = $new_filename;
                error_log("Success: Avatar updated, user_id=$user_id, filename=$new_filename");
            } else {
                $response['message'] = 'Lỗi khi cập nhật database.';
                unlink($upload_path); // Xóa file nếu database thất bại
                error_log("Error: Database update failed for user_id=$user_id");
            }
        } else {
            $response['message'] = 'Lỗi khi lưu file ảnh.';
            error_log("Error: Failed to move uploaded file, tmp_name=" . $file['tmp_name'] . ", destination=$upload_path");
        }

        echo json_encode($response);
        exit();
    }

    // Lấy danh sách sản phẩm cho thanh tìm kiếm
    if (isset($_POST['get_products_for_search'])) {
        $query = isset($_POST['query']) ? $_POST['query'] : '';
        $products = searchProducts($query);
        if ($products === false) {
            $products = [];
        }
        // $_SESSION['products'] = searchProductsFull($query);
        $fullProducts = searchProductsFull($query);
        error_log("searchProductsFull result count: " . count($fullProducts)); // Debug: Ghi lại số lượng sản phẩm trả về từ searchProductsFull
        $_SESSION['products'] = $fullProducts;
        echo json_encode($products);
        exit();
    }

    // Xử lý danh mục sản phẩm từ trang chủ đến trang chủ đề
    if (isset($_POST['selected_sport'])) {
        $selectedSport = $_POST['selected_sport'];
        $products = getProductFromTable($selectedSport);
        $_SESSION['products'] = $products;
        echo json_encode([
            'success' => true
        ]);
        header("Location: /baocao/trangchude/" . addHyphen($selectedSport));
        exit();
    }
    if (isset($_POST['selected_sport1'])) { //////////////cho menu right bot
        $selectedSport = $_POST['selected_sport1'];

        // Kiểm tra giá trị selectedSport
        if (empty($selectedSport)) {
            echo json_encode([
                'success' => false,
                'message' => 'Danh mục không hợp lệ.'
            ]);
            exit();
        }

        // Lấy sản phẩm từ bảng tương ứng
        $products = getProductFromTable($selectedSport);

        // Kiểm tra kết quả trả về từ getProductFromTable
        if ($products === false || $products === null) {
            echo json_encode([
                'success' => false,
                'message' => 'Không thể lấy sản phẩm từ danh mục: ' . htmlspecialchars($selectedSport)
            ]);
            exit();
        }

        // Lưu sản phẩm vào session
        $_SESSION['products'] = $products;

        // Trả về phản hồi JSON thành công
        echo json_encode([
            'success' => true
        ]);
        exit();
    }

    if (isset($_POST['all-product'])) {
        $selectedSport = $_POST['all-product'];
        $all_product = getAllProduct();
        $_SESSION['products'] = $all_product;
        header("Location: /baocao/trangchude/$selectedSport");
        exit();
    }
    if (isset($_POST['all-product1'])) {
        $selectedSport = $_POST['all-product1'];
        $all_product = getAllProduct();
        $_SESSION['products'] = $all_product;
        header("Location: /baocao/trangchude/$selectedSport");
        exit();
    }

    //đi đến trang chi tiết
    if (isset($_POST['product_name'])) {
        $productName = $_POST['product_name'];
        $productDetail = selectFromAllTablesByName($productName);
        $_SESSION['productsDetail'] = $productDetail;

        $topViewedProducts = getTopViewedProducts(4);
        $_SESSION['topViewedProducts'] = $topViewedProducts;


        header("Location: /baocao/trangchitiet/" . to_short_slug($productName, 7));
        exit();
    }

    if (isset($_POST['themsanpham'])) {
        try {
            $table = $_POST['table'] ?? '';
            $name_product = trim($_POST['name_product'] ?? '');
            $brand = trim($_POST['brand'] ?? 'Đang Cập Nhập');
            $price = preg_replace('/[^\d]/', '', $_POST['price']);
            $oprice = isset($_POST['oprice']) && trim($_POST['oprice']) !== '' ? preg_replace('/[^\d]/', '', $_POST['oprice']) : 0;
            $warranty = $_POST['warranty'] ?? '0';
            $image_name = basename($_FILES["hinhanh"]["name"]);
            $image2_name = basename($_FILES["hinhanh2"]["name"]);
            $image3_name = basename($_FILES["hinhanh3"]["name"]);
            $image4_name = basename($_FILES["hinhanh4"]["name"]);
            $image_tmp_name = $_FILES["hinhanh"]["tmp_name"];
            $image2_tmp_name = $_FILES["hinhanh2"]["tmp_name"];
            $image3_tmp_name = $_FILES["hinhanh3"]["tmp_name"];
            $image4_tmp_name = $_FILES["hinhanh4"]["tmp_name"];
            $sizes = $_POST['sizes'] ?? '';
            $quantities = $_POST['quantities'] ?? '1';

            if (is_array($quantities)) {
                $quantity = array_sum($quantities);
            } else {
                $quantity = $_POST['quantity'];
            }
            $description_id = 0;
            if (isset($_POST['description_id']) && $_POST['description_id'] === 'custom') {
                $chatlieu = trim($_POST['chatlieu'] ?? '');
                $thietke = trim($_POST['thietke'] ?? '');
                $mausac = trim($_POST['mausac'] ?? '');
                $kichthuoc = trim($_POST['kichthuoc'] ?? '');
                $name_desc = trim($_POST['name_product'] ?? 'Custom Description');
                if (!empty($chatlieu) || !empty($thietke) || !empty($mausac) || !empty($kichthuoc)) {
                    $description_id = addProductDescription($name_desc, $chatlieu, $thietke, $mausac, $kichthuoc);
                }
            } else {
                $description_id = intval($_POST['description_id'] ?? 0);
            }
            // print_r($description_id);
            $success = themSanPham($table, $name_product, $brand, $price, $oprice, $warranty, $image_name, $image2_name, $image3_name, $image4_name, $image_tmp_name, $image2_tmp_name, $image3_tmp_name, $image4_tmp_name, $quantity, $sizes, $quantities, $description_id);
            if ($success) {
                $_SESSION['success_msg'] = "Thêm sản phẩm thành công!";
                header("Location: /baocao/add_product");
                exit();
            }
            exit();
        } catch (Exception $e) {
            $error_msg = $e->getMessage();
            $_SESSION['error_msg'] = $error_msg;
            header("Location: /baocao/add_product");
            exit();
        }
    }

    if (isset($_POST['thanhtoan'])) {
        // Xử lý dữ liệu giỏ hàng
        if (isset($_POST['cart_data'])) {
            $cartData = json_decode($_POST['cart_data'], true);
            // print_r($cartData);
            $_SESSION['cart'] = $cartData['items'] ?? []; // Lưu giỏ hàng vào session
            if (isset($cartData['appliedVoucher'])) {
                $_SESSION['appliedVoucher'] = $cartData['appliedVoucher'];
            } else {
                $_SESSION['appliedVoucher'] = null;
            }
        } else {
            error_log("No cart_data received in POST");
            http_response_code(400); // Trả mã lỗi
            echo json_encode(['error' => 'Không tìm thấy dữ liệu giỏ hàng!']);
            exit();
        }

        // Xử lý thông tin người dùng
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']); //hàm này trả về mảng thông tin người dùng
            $_SESSION['user'] = $user ?: []; // Nếu $user là false/null, gán mảng rỗng
        } else {
            $_SESSION['user'] = []; // Người dùng chưa đăng nhập
        }

        // Chuyển hướng đến trang checkout
        header("Location: /baocao/checkout");
        exit();
    }

    //Khi nhấn thanh toán trong giỏ hàng, tách ra thành checekout-form1 vì bị xung đột dữ liệu cart
    if (isset($_POST['thanhtoan1'])) {
        // Xử lý dữ liệu giỏ hàng
        if (isset($_POST['cart_data1'])) {
            $cartData = json_decode($_POST['cart_data1'], true);
            // print_r($cartData);
            $_SESSION['cart'] = $cartData['items'] ?? []; // Lưu giỏ hàng vào session
            if (isset($cartData['appliedVoucher'])) {
                $_SESSION['appliedVoucher'] = $cartData['appliedVoucher'];
            } else {
                $_SESSION['appliedVoucher'] = null;
            }
        } else {
            error_log("No cart_data received in POST");
            http_response_code(400); // Trả mã lỗi
            echo json_encode(['error' => 'Không tìm thấy dữ liệu giỏ hàng!']);
            exit();
        }

        // Xử lý thông tin người dùng
        if (isset($_SESSION['mySession'])) {
            $user = getUserInfo($_SESSION['mySession']); //hàm này trả về mảng thông tin người dùng
            $_SESSION['user'] = $user ?: []; // Nếu $user là false/null, gán mảng rỗng
        } else {
            $_SESSION['user'] = []; // Người dùng chưa đăng nhập
        }

        // Chuyển hướng đến trang checkout
        header("Location: /baocao/checkout");
        exit();
    }

    //// NÚT XÁC NHẬN ĐẶT HÀNG
    if (isset($_POST['dathang'])) {
        $id_user = $_POST['id_user'] ?? '';
        $namevoucher = $_POST['namevoucher'] ?? '';
        $username = $_POST['username'] ?? '';
        $email = $_POST['email'] ?? '';
        $fullname = $_POST['fullname'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $address = $_POST['address'] ?? '';
        $note = $_POST['note'] ?? '';
        $nameProduct = $_POST['nameProduct'] ?? [];
        $imageProduct = $_POST['imageProduct'] ?? [];
        $size = $_POST['size'] ?? [];
        $quantity = $_POST['quantity'] ?? [];
        $priceDetail = $_POST['priceDetail'] ?? [];
        $totalAll = $_POST['totalAll'] ?? '';
        $tienship = $_POST['tienship'] ?? '';
        $sale = $_POST['sale'] ?? '';
        $freeship = $_POST['freeship'] ?? '';
        $grandtotal = $_POST['grandtotal'] ?? '';
        $paymentmethod = $_POST['payment-method'] ?? '';

        $iddonhang = themDonHang($username, $fullname, $phone, $address, $totalAll, $sale, $tienship, $freeship, $grandtotal, $paymentmethod, $note);
        themDonHangChiTiet($nameProduct, $imageProduct, $size, $quantity, $priceDetail, $iddonhang);
        $_SESSION['success_msg'] = "Đặt hàng thành công!";
        $_SESSION['clear_cart'] = true;

        updateVoucher($namevoucher, $id_user);
        updateQuantityProduct($nameProduct, $quantity);
        if (!empty($size)) {
            updateSizeProduct($nameProduct, $quantity, $size);
        }

        $subject = "Đặt hàng thành công!";
        $message = "Xin chào " . $username . " ! Cảm ơn bạn đã lựa chọn chúng tôi, đơn hàng của bạn đã được đặt thành công tại NHL SPORTS. Chúc bạn 1 ngày vui vẻ!";
        sendMail($email, $subject, $message);

        header("location: /baocao/trangchu");
        exit();
    }

    //////TIẾP THEO
    if (isset($_POST['tieptheo'])) {
        $nameProduct = $_POST['nameProduct'] ?? [];
        $size = $_POST['size'] ?? [];
        $quantity = $_POST['quantity'] ?? [];

        // Chia sản phẩm thành hai danh sách: có size và không có size
        $productsWithSize = [];
        $productsWithoutSize = [];

        for ($i = 0; $i < count($nameProduct); $i++) {
            $name = $nameProduct[$i];
            $qty = (int)$quantity[$i];
            $sizeValue = trim($size[$i] ?? '');

            if (!empty($sizeValue) && $sizeValue !== 'N/A') {
                // Sản phẩm có kích thước hợp lệ
                $productsWithSize[] = [
                    'name' => $name,
                    'size' => $sizeValue,
                    'quantity' => $qty
                ];
            } else {
                // Sản phẩm không có kích thước hoặc kích thước là 'N/A'
                $productsWithoutSize[] = [
                    'name' => $name,
                    'quantity' => $qty
                ];
            }
        }

        // Thu thập tất cả thông báo lỗi
        $errorMessages = [];


        // Kiểm tra sản phẩm có kích thước
        if (!empty($productsWithSize)) {
            $namesWithSize = array_column($productsWithSize, 'name');
            $sizes = array_column($productsWithSize, 'size');
            $quantitiesWithSize = array_column($productsWithSize, 'quantity');

            $quantityCheckSize = checkProductQuantitySize($namesWithSize, $quantitiesWithSize, $sizes);

            if (!empty($quantityCheckSize)) {
                foreach ($quantityCheckSize as $error) {
                    if ($error['error'] === 'insufficient_quantity') {
                        $errorMessages[] = "{$error['name']} (size {$error['size']}) không đủ số lượng";
                    } elseif ($error['error'] === 'product_not_found') {
                        $errorMessages[] = "{$error['name']} (size {$error['size']}) đang được cập nhật, vui lòng xóa khỏi giỏ hàng của bạn.";
                    }
                }
            }
        }

        // Kiểm tra sản phẩm không có kích thước
        if (!empty($productsWithoutSize)) {
            $namesWithoutSize = array_column($productsWithoutSize, 'name');
            $quantitiesWithoutSize = array_column($productsWithoutSize, 'quantity');

            $quantityCheck = checkProductQuantity($namesWithoutSize, $quantitiesWithoutSize);

            if (!empty($quantityCheck)) {
                foreach ($quantityCheck as $error) {
                    if ($error['error'] === 'insufficient_quantity') {
                        $errorMessages[] = "{$error['name']} không đủ số lượng";
                    } elseif ($error['error'] === 'product_not_found') {
                        $errorMessages[] = "{$error['name']} đang được cập nhật, vui lòng xóa khỏi giỏ hàng của bạn.";
                    }
                }
            }
        }

        // Nếu có lỗi, trả về thông báo lỗi
        if (!empty($errorMessages)) {
            echo json_encode([
                'status' => 'error',
                'message' => implode('---', $errorMessages) . '!'
            ]);
            exit();
        }

        // Nếu không có lỗi, trả về trạng thái thành công
        echo json_encode([
            'status' => 'success'
        ]);
        exit();
    }

    if (isset($_POST['clear_cart']) && isset($_POST['id_user'])) {
        $id_user = (int)$_POST['id_user'];
        $success = xoaGioHang($id_user);
        if ($success) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Không thể xóa giỏ hàng trong cơ sở dữ liệu']);
        }
        exit;
    }


    if (isset($_POST["get_order_details"]) && isset($_POST["order_id"])) {
        $order_id = intval($_POST["order_id"]);
        $response = ["success" => false, "message" => "", "details" => []];

        // Gọi hàm lấy chi tiết đơn hàng
        $details = donHangChiTiet($order_id);
        $money = moneyFormDonHangChiTiet($order_id);

        if (!empty($details)) {
            $response["success"] = true;
            $response["details"] = $details;
            $response["money"] = $money;
        } else {
            $response["message"] = "Không tìm thấy chi tiết đơn hàng!";
        }

        // Trả về JSON
        header("Content-Type: application/json");
        echo json_encode($response);
        exit;
    }

    if (isset($_POST['filter_products'])) {
        // Debug: Ghi log yêu cầu nhận được
        error_log("filter_products: Received POST request");
        error_log("POST data: " . print_r($_POST, true));

        $typeFilter = $_POST['type_filter'] ?? '';
        $brandFilter = $_POST['brand_filter'] ?? '';

        // Debug: Ghi log giá trị của typeFilter và brandFilter
        error_log("type_filter: " . ($typeFilter ?: 'empty'));
        error_log("brand_filter: " . ($brandFilter ?: 'empty'));

        // Lấy sản phẩm theo bộ lọc
        $products = filterProductsByTypeAndBrand($typeFilter, $brandFilter);

        // Debug: Ghi log số lượng sản phẩm trả về
        error_log("filterProductsByTypeAndBrand: Returned " . count($products) . " products");
        error_log("Products: " . print_r($products, true));

        // Lưu vào session
        $_SESSION['products'] = $products;

        // Trả về JSON để frontend cập nhật
        $response = [
            'success' => true,
            'products' => $products
        ];

        // Debug: Ghi log phản hồi JSON
        error_log("Response JSON: " . json_encode($response));

        header("Content-Type: application/json");
        echo json_encode($response);
        exit();
    }


    //qwert
    if (isset($_POST['xoataikhoan'])) {
        $id_user = $_POST['id_user'];
        global $conn;

        // Check if the user is admin
        $stmt = $conn->prepare("SELECT username FROM khachhang WHERE id_user = ? AND username = 'admin'");
        $stmt->bind_param("i", $id_user);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $_SESSION['error_msg'] = "Không thể xóa tài khoản admin!";
            header("Location: /baocao/quanlytaikhoan");
            exit();
        }

        // Start transaction
        $conn->begin_transaction();

        try {
            // 1. Check if user exists
            if (!check_id_user($id_user)) {
                throw new Exception("Tài khoản không tồn tại!");
            }

            // 2. Delete user's vouchers
            if (!deleteUserVouchers($id_user)) {
                throw new Exception("Lỗi khi xóa voucher của người dùng!");
            }

            // 3. Delete user's cart
            if (!deleteUserCart($id_user)) {
                throw new Exception("Lỗi khi xóa giỏ hàng!");
            }

            // 4. Delete user
            if (!deleteUser($id_user)) {
                throw new Exception("Lỗi khi xóa tài khoản!");
            }

            // Commit if successful
            $conn->commit();
            $_SESSION['success_msg'] = "Xóa tài khoản và voucher thành công!";
        } catch (Exception $e) {
            // Rollback on error
            $conn->rollback();
            error_log("Error deleting user $id_user: " . $e->getMessage());
            $_SESSION['error_msg'] = "Có lỗi xảy ra. Vui lòng thử lại sau.";
        }

        header("Location: /baocao/quanlytaikhoan");
        exit();
    }

    //zxcvb
    if (isset($_POST['addUser'])) {
        try {
            // Kiểm tra dữ liệu
            $username = trim($_POST['username']);
            $password = $_POST['password'];
            $email = trim($_POST['email'] ?? '');
            $fullname = trim($_POST['fullname'] ?? '');
            $phone = trim($_POST['phone'] ?? '');
            $address = trim($_POST['address'] ?? '');

            // Kiểm tra các trường bắt buộc
            if (empty($username) || empty($password)) {
                throw new Exception("Tên đăng nhập và mật khẩu không được để trống!");
            }

            // Kiểm tra độ dài mật khẩu
            if (strlen($password) < 8) {
                throw new Exception("Mật khẩu phải có ít nhất 8 ký tự!");
            }

            // Kiểm tra định dạng email
            if (!empty($email) && !preg_match("/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i", $email)) {
                throw new Exception("Email không đúng định dạng!");
            }

            // Kiểm tra số điện thoại
            if (!empty($phone) && !preg_match("/^\d{10}$/", $phone)) {
                throw new Exception("Số điện thoại phải có đúng 10 chữ số!");
            }
            // Trong phần addUser của AccountController.php, thêm các kiểm tra này:

            if (checkUsernameExists($username)) {
                throw new Exception("Tên đăng nhập đã tồn tại!");
            }

            if (!empty($email) && checkEmailExists($email)) {
                throw new Exception("Email đã được sử dụng bởi tài khoản khác!");
            }

            // Mã hóa mật khẩu
            $password = password_hash($password, PASSWORD_BCRYPT);

            // Gọi model để thêm tài khoản
            if (addUser($username, $password, $email, $fullname, $phone, $address)) {
                $_SESSION['success_msg'] = "Thêm tài khoản thành công!";
            } else {
                throw new Exception("Không thể thêm tài khoản!");
            }
        } catch (Exception $e) {
            $_SESSION['error_msg'] = $e->getMessage();
        }
        header("Location: /baocao/quanlytaikhoan");
        exit();
    }
     //zxcvb
    if (isset($_POST['editUser'])) {
        try {
            $id_user = $_POST['id_user'];
            $username = trim($_POST['username']);
            $email = trim($_POST['email'] ?? '');
            $fullname = trim($_POST['fullname'] ?? '');
            $phone = trim($_POST['phone'] ?? '');
            $address = trim($_POST['address'] ?? '');
            $password = !empty($_POST['password']) ? $_POST['password'] : null;

            if (empty($username)) {
                throw new Exception("Tên đăng nhập không được để trống!");
            }

            // Kiểm tra email nếu có nhập
            if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Email không đúng định dạng! Ví dụ: example@domain.com");
            }

            // Kiểm tra số điện thoại nếu có nhập
            if (!empty($phone) && !preg_match("/^\d{10}$/", $phone)) {
                throw new Exception("Số điện thoại phải có đúng 10 chữ số, không bao gồm ký tự khác!");
            }

            // Kiểm tra mật khẩu mới nếu có nhập
            if ($password && strlen($password) < 8) {
                throw new Exception("Mật khẩu mới phải có ít nhất 8 ký tự!");
            }

            // Yêu cầu mật khẩu admin cho mọi tài khoản
            if (empty($_POST['admin_password'])) {
                throw new Exception("Vui lòng nhập mật khẩu admin để xác nhận thay đổi!");
            }
            if (strlen($_POST['admin_password']) < 8) {
                throw new Exception("Mật khẩu admin phải có ít nhất 8 ký tự!");
            }
            // Trong phần editUser của AccountController.php, thêm các kiểm tra này:

            if (checkUsernameExists($username, $id_user)) {
                throw new Exception("Tên đăng nhập đã tồn tại!");
            }

            if (!empty($email) && checkEmailExists($email, $id_user)) {
                throw new Exception("Email đã được sử dụng bởi tài khoản khác!");
            }
            // Kiểm tra mật khẩu admin
            $admin_id = getAdminId(); // Hàm này cần được thêm vào AccountModel.php
            if (!verifyAdminPassword($admin_id, $_POST['admin_password'])) {
                throw new Exception("Mật khẩu admin không đúng!");
            }

            // Mã hóa mật khẩu mới nếu có
            $password = $password ? password_hash($password, PASSWORD_BCRYPT) : null;

            if (updateUser($id_user, $username, $email, $fullname, $phone, $address, $password)) {
                $_SESSION['success_msg'] = "Cập nhật tài khoản thành công!";
            } else {
                throw new Exception("Không thể cập nhật tài khoản. Vui lòng thử lại!");
            }
        } catch (Exception $e) {
            $_SESSION['error_msg'] = $e->getMessage();
        }
        header("Location: /baocao/quanlytaikhoan");
        exit();
    }

    if (isset($_POST['update_top_viewed_session'])) {
        $_SESSION['topViewedProducts'] = json_decode($_POST['data'], true);
        echo json_encode(['success' => true]);
        exit();
    }

    // Xử lý thêm head banner (từ POST)
    if (isset($_POST['add_banner'])) {
        try {
            $imageValidation = validateImageFile($_FILES['banner_image'], 'banner chính');
            if (!$imageValidation['success']) {
                throw new Exception($imageValidation['error']);
            }
            $image_name = $imageValidation['filename'];
            $mb_image_name = null;
            if (isset($_FILES['mb_image']) && $_FILES['mb_image']['error'] == UPLOAD_ERR_OK) {
                $mbValidation = validateImageFile($_FILES['mb_image'], 'banner mobile');
                if (!$mbValidation['success']) {
                    throw new Exception($mbValidation['error']);
                }
                $mb_image_name = $mbValidation['filename'];
            }
            $result = addHeadBanner($image_name, $mb_image_name);
            if ($result['success']) {
                $target_dir = "../view/img/";
                move_uploaded_file($_FILES['banner_image']['tmp_name'], $target_dir . $image_name);
                if ($mb_image_name) {
                    move_uploaded_file($_FILES['mb_image']['tmp_name'], $target_dir . $mb_image_name);
                }
                $_SESSION['message'] = $result['message'];
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception($result['error']);
            }
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý thêm mid banner (từ POST)
    if (isset($_POST['add_mid_banner'])) {
        try {
            $required_images = ['image1', 'image2', 'image3'];
            $uploaded_images = [];
            foreach ($required_images as $image) {
                $validation = validateImageFile($_FILES[$image], $image);
                if (!$validation['success']) {
                    throw new Exception($validation['error']);
                }
                $uploaded_images[$image] = $validation['filename'];
            }
            $result = addMidBanner($uploaded_images['image1'], $uploaded_images['image2'], $uploaded_images['image3']);
            if ($result['success']) {
                $target_dir = "../view/img/";
                foreach ($uploaded_images as $key => $image_name) {
                    move_uploaded_file($_FILES[$key]['tmp_name'], $target_dir . $image_name);
                }
                $_SESSION['message'] = $result['message'];
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception($result['error']);
            }
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý thêm foot banner (từ POST)
    if (isset($_POST['add_foot_banner'])) {
        try {
            $validation = validateImageFile($_FILES['foot_image'], 'foot banner');
            if (!$validation['success']) {
                throw new Exception($validation['error']);
            }
            $image_name = $validation['filename'];
            $result = addFootBanner($image_name);
            if ($result['success']) {
                $target_dir = "../view/img/";
                move_uploaded_file($_FILES['foot_image']['tmp_name'], $target_dir . $image_name);
                $_SESSION['message'] = $result['message'];
                $_SESSION['message_type'] = 'success';
            } else {
                throw new Exception($result['error']);
            }
        } catch (Exception $e) {
            $_SESSION['message'] = $e->getMessage();
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    ///2fa
    if (isset($_POST['update_2fa']) && $_POST['update_2fa'] === 'update_2fa') {
        $response = ['success' => false, 'message' => ''];

        // Lấy dữ liệu từ yêu cầu AJAX
        $user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
        $two_fa_active = isset($_POST['two_fa_active']) ? (int)$_POST['two_fa_active'] : 0;

        // Kiểm tra user_id hợp lệ
        if ($user_id <= 0) {
            $response['message'] = 'ID người dùng không hợp lệ.';
            echo json_encode($response);
            exit;
        }

        // Cập nhật trạng thái 2FA trong cơ sở dữ liệu
        $success = update_2fa($two_fa_active, $user_id);

        if ($success) {
            $response['success'] = true;
            // Cập nhật session nếu cần
            $_SESSION['info']['active_2fa'] = $two_fa_active;
        } else {
            $response['message'] = 'Không thể cập nhật trạng thái xác thực hai yếu tố.';
        }

        echo json_encode($response);
        exit;
    }

    //thêm bài viết
    if (isset($_POST['thembaiviet'])) {
        $title = $_POST['title'];
        $content = $_POST['content'];
        $tag_ids = isset($_POST['tags']) ? $_POST['tags'] : []; // Lấy danh sách tag được chọn
        $result = themTinTuc($title, $content, $tag_ids);
        if ($result) {
            $_SESSION['success_msg'] = "Thêm bài viết thành công!";
            header("Location: /baocao/add_news");
            exit();
        } else {
            echo "<script>alert('Thêm bài viết thất bại!');</script>";
        }
    }

    //quản lý tin tức
    if (isset($_POST['hide_news'])) {
        $news_id = $_POST['id'];
        hide_News($news_id);
        $_SESSION['success_msg'] = "Ẩn tin thành công!";
        header("Location: /baocao/quanlytintuc");
        exit();
    }

    if (isset($_POST['delete_news'])) {
        $news_id = $_POST['id'];
        delete_News($news_id);
        $_SESSION['success_msg'] = "Xóa tin thành công!";
        header("Location: /baocao/quanlytintuc");
        exit();
    }

    if (isset($_POST['show_news'])) {
        $news_id = $_POST['id'];
        show_News($news_id);
        $_SESSION['success_msg'] = "Đã hiển thị lại tin!";
        header("Location: /baocao/quanlytintuc");
        exit();
    }
    //Nhấn nút edit
    if (isset($_POST['edit_news'])) {
        $news_id = $_POST['id'];
        $_SESSION['id'] = $news_id;
        header("Location: /baocao/edit_news");
        exit();
    }

    if (isset($_POST['capnhatbaiviet']) && $_POST['capnhatbaiviet']) {
        $news_id = $_POST['id'];
        $title = $_POST['title'];
        $content = $_POST['content'];
        $tag_ids = isset($_POST['tags']) ? $_POST['tags'] : [];
        $result = updateNews($news_id, $title, $content, $tag_ids);
        if ($result) {
            $_SESSION['success_msg'] = "Cập nhật bài viết thành công!";
            header("Location: /baocao/quanlytintuc");
            exit();
        } else {
            echo "<script>alert('Cập nhật bài viết thất bại!');</script>";
        }
    }

    if (isset($_POST['increment_view'])) {
        $table = $_POST['table'] ?? '';
        $product_id = $_POST['product_id'] ?? 0;
        if (!empty($table) && $product_id > 0) {
            $success = incrementProductView($table, $product_id);
            if (!$success) {
                error_log("Failed to increment view count for table: $table, product_id: $product_id");
            }
        } else {
            error_log("Invalid parameters for increment_view: table=$table, product_id=$product_id");
        }
        exit();
    }
}



// Xử lý GET requests cho banner GET GET GET GET GET GET GET GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Xử lý xóa head banner
    if (isset($_GET['delete_id'])) {
        $delete_id = intval($_GET['delete_id']);
        $banners = getHeadBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteHeadBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            if ($banner && file_exists($target_dir . $banner['image'])) {
                unlink($target_dir . $banner['image']);
            }
            if ($banner && !empty($banner['mb_image']) && file_exists($target_dir . $banner['mb_image'])) {
                unlink($target_dir . $banner['mb_image']);
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý xóa mid banner
    if (isset($_GET['delete_mid_id'])) {
        $delete_id = intval($_GET['delete_mid_id']);
        $banners = getMidBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteMidBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            foreach (['image1', 'image2', 'image3'] as $img) {
                if ($banner && !empty($banner[$img]) && file_exists($target_dir . $banner[$img])) {
                    unlink($target_dir . $banner[$img]);
                }
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Xử lý xóa foot banner
    if (isset($_GET['delete_foot_id'])) {
        $delete_id = intval($_GET['delete_foot_id']);
        $banners = getFootBanners();
        $banner = array_filter($banners, function ($b) use ($delete_id) {
            return $b['id'] == $delete_id;
        });
        $banner = reset($banner);
        $result = deleteFootBanner($delete_id);
        if ($result['success']) {
            $target_dir = "/baocao/view/img/";
            if ($banner && file_exists($target_dir . $banner['image'])) {
                unlink($target_dir . $banner['image']);
            }
            $_SESSION['message'] = $result['message'];
            $_SESSION['message_type'] = 'success';
        } else {
            $_SESSION['message'] = $result['error'];
            $_SESSION['message_type'] = 'danger';
        }
        header("Location: /baocao/banner");
        exit();
    }

    // Lấy danh sách banner khi tải trang lần đầu
    if (!isset($_GET['delete_id']) && !isset($_GET['delete_mid_id']) && !isset($_GET['delete_foot_id'])) {
        $_SESSION['head_banners'] = getHeadBanners();
        $_SESSION['mid_banners'] = getMidBanners();
        $_SESSION['foot_banners'] = getFootBanners();
        header("Location: /baocao/banner");
        exit();
    }
}
