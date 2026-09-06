<?php
// Đảm bảo file này không tạo ra output không mong muốn trước khi bao gồm
?>

<!-- Biểu tượng Zalo cố định -->
<div class="zalo-icon">
    <a href="https://zalo.me/0777566324" target="_blank" rel="noopener noreferrer" title="Chat với chúng tôi qua Zalo">
        <img src="/baocao/view/img/zaloicon.webp" alt="Zalo Icon" class="zalo-img">
    </a>
</div>
<!-- Biểu tượng Messenger cố định (góc trái)
<div class="messenger-icon">
    <a href="https://www.facebook.com/nam.huynhnhat.710" target="_blank" rel="noopener noreferrer" title="Chat với chúng tôi qua Messenger">
        <img src="../img/faceicon.png" alt="Messenger Icon" class="messenger-img">
    </a>
</div> -->

<style>
    /* CSS cho biểu tượng Zalo */
    .zalo-icon {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        transition: opacity 0.3s ease;
        /* Đảm bảo biểu tượng nằm trên các phần tử khác */
    }

    .zalo-img {
        width: 60px;
        height: 60px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        animation: pulse 2s infinite;
    }

    .zalo-img:hover {
        transform: scale(1.1);
        /* Phóng to nhẹ khi hover */
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        /* Hiệu ứng bóng */
    }







    /* Responsive: Giảm kích thước trên màn hình nhỏ */
    @media (max-width: 768px) {

        .zalo-img,
        .messenger-img {
            width: 50px;
            height: 50px;
        }
    }

    @media (max-width: 480px) {

        .zalo-img,
        .messenger-img {
            width: 40px;
            height: 40px;
        }

        .zalo-icon {
            bottom: 15px;
            right: 15px;
        }

        .messenger-icon {
            bottom: 15px;
            left: 15px;
        }
    }


    @keyframes pulse {
        0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7);
        }

        50% {
            transform: scale(1.05);
            box-shadow: 0 0 20px 10px rgba(0, 123, 255, 0);
        }

        100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
        }
    }
</style>