<?php
include "../../model/config/connect.php";
session_start();
require_once "xacThucAdmin.php";

function getNewsDetails($news_id)
{
    global $conn;
    $sql = "SELECT t.*, GROUP_CONCAT(nt.tag_id) as tag_ids 
            FROM tintuc t 
            LEFT JOIN news_tags nt ON t.id = nt.news_id 
            WHERE t.id = ? 
            GROUP BY t.id";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $news_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $news = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    // Lấy hình ảnh
    $sql_images = "SELECT image_url, caption, is_primary FROM news_images WHERE news_id = ?";
    $stmt_images = mysqli_prepare($conn, $sql_images);
    mysqli_stmt_bind_param($stmt_images, "i", $news_id);
    mysqli_stmt_execute($stmt_images);
    $result_images = mysqli_stmt_get_result($stmt_images);
    $images = [];
    while ($row = mysqli_fetch_assoc($result_images)) {
        $images[] = $row;
    }
    mysqli_stmt_close($stmt_images);

    $news['images'] = $images;
    $news['tag_ids'] = explode(',', $news['tag_ids'] ?? '');
    return $news;
}


$news_id = $_SESSION['id'] ?? '';


if ($news_id) {
    $news = getNewsDetails($news_id);
    if (!$news) {
        die("Không tìm thấy tin tức.");
    }
}

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
    <title>Chỉnh sửa tin tức</title>
    <link rel="icon" type="image/png" href="/baocao/view/img/logo3.webp">
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="chỉnh sửa tin tức, thể thao, NHL Sports, thời trang thể thao">
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
                'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 'ai', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown', 'importword', 'exportword', 'exportpdf'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | link image media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
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
        <div class="card">
            <h3>CHỈNH SỬA TIN TỨC</h3>
            <?php if ($news_id && $news): ?>
                <form action="/baocao/user/submit" method="post" enctype="multipart/form-data">
                    <input type="hidden" name="id" value="<?php echo $news_id; ?>">
                    <input type="text" class="title" name="title" value="<?php echo htmlspecialchars($news['title']); ?>" required>
                    <select name="tags[]" class="form-select tags" multiple required>
                        <option value="" disabled>Chọn hashtag</option>
                        <?php foreach ($tags as $tag): ?>
                            <option value="<?php echo $tag['id']; ?>" <?php echo in_array($tag['id'], $news['tag_ids']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($tag['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <textarea class="tinymce" cols="30" rows="30" name="content" required><?php echo htmlspecialchars($news['content']); ?></textarea>
                    <input type="submit" value="Cập nhật" name="capnhatbaiviet">
                </form>
            <?php else: ?>
                <p>Không tìm thấy tin tức để chỉnh sửa.</p>
            <?php endif; ?>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script>
        $(document).ready(function() {
            $('.tags').select2();
        });
    </script>
</body>

</html>