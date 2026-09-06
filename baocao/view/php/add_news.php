<?php
include "../../model/config/connect.php";
session_start();
require_once "xacThucAdmin.php";
$success_msg = $_SESSION['success_msg'] ?? '';
unset($_SESSION['success_msg']);

// Lấy danh sách tag từ bảng tags
$sql_tags = "SELECT id, name FROM tags ORDER BY name";
$result_tags = mysqli_query($conn, $sql_tags);
$tags = [];
if ($result_tags && mysqli_num_rows($result_tags) > 0) {
    while ($row = mysqli_fetch_assoc($result_tags)) {
        $tags[] = $row;
    }
}
mysqli_free_result($result_tags);
?>

<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thêm tin tức</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="thêm tin tức, thể thao, NHL Sports, thời trang thể thao">
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/baocao/view/css/add_news.css">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdn.tiny.cloud/1/74ye4k5vaazwaxu37ena5dnjquo46ifrutydgjwlm5dr3mco/tinymce/7/tinymce.min.js" referrerpolicy="origin"></script>
    <script>
        tinymce.init({
            selector: '.tinymce',
            plugins: [
                'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
                'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable',
                'advcode', 'editimage', 'advtemplate', 'ai', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss',
                'markdown', 'importword', 'exportword', 'exportpdf', 'preview'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | link image media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat| preview',
            tinycomments_mode: 'embedded',
            tinycomments_author: 'Author name',
            mergetags_list: [{
                    value: 'First.Name',
                    title: 'First Name'
                },
                {
                    value: 'Email',
                    title: 'Email'
                },
            ],
            images_upload_url: '/baocao/upload_image',
            // images_upload_base_path: '../img/upload/news',
            image_caption: true,
            file_picker_types: 'image',
            automatic_uploads: true,
            valid_elements: '*[*]',
            extended_valid_elements: 'img[src|alt|width|height],figure,figcaption',
            entity_encoding: 'raw',
            convert_urls: false,
            ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('See docs to implement AI Assistant')),
        });
    </script>
</head>

<body>
    <?php include "sidebar.php"; ?>
    <div class="main-content">
        <!-- Thông báo khi ấn nút -->
        <?php if (!empty($success_msg)): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <?php echo $success_msg; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        <div class="card">
            <h3>TIN TỨC</h3>
            <form action="/baocao/user/submit" method="post">
                <input type="text" class="title" name="title" placeholder="Nhập tiêu đề..." required>
                <select name="tags[]" class="form-select tags" multiple required>
                    <option value="" disabled>Chọn hashtag</option>
                    <?php foreach ($tags as $tag): ?>
                        <option value="<?php echo $tag['id']; ?>"><?php echo htmlspecialchars($tag['name']); ?></option>
                    <?php endforeach; ?>
                </select>
                <textarea class="tinymce" cols="30" rows="30" name="content" placeholder="Viết nội dung ở đây..."></textarea>
                <input type="submit" value="Thêm bài viết" name="thembaiviet">
            </form>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            if ($(".alert-success").length || $(".alert-danger").length) {
                // Đặt thời gian tự động tắt sau 5 giây (5000 milliseconds)
                setTimeout(function() {
                    $(".alert").alert("close");
                }, 3000);
            }
        });
    </script>
</body>

</html>