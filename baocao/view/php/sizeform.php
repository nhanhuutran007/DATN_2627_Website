<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>sizeform</title>
    <meta name="description" content="NHL Sports - Cửa hàng thời trang thể thao hàng đầu.">
    <meta name="keywords" content="sizeform, thể thao, NHL Sports, thời trang thể thao">
    <link rel="stylesheet" href="/baocao/view/css/sizeform.css">
</head>

<body>
    <div id="sizeModal" class="modal">
        <div class="modal-content">
            <span class="close">×</span>
            <div class="modal-header">
                <h2 id="modalProductName">Tên sản phẩm</h2>
            </div>
            <div class="modal-body">
                <div class="product-preview">
                    <img id="modalProductImage" src="" alt="Hình ảnh sản phẩm" style="max-width: 100px; margin-right: 20px;">
                    <div class="product-details">
                        <p class="modal-price" id="modalProductPrice">Giá sản phẩm</p>
                        <!-- <p>Chính hãng</p> -->
                    </div>
                </div>
                <div class="size-selection">
                    <label>Kích thước:</label>
                    <div class="size-buttons" id="sizeButtons">
                        <!-- Các nút kích thước sẽ được điền động bằng JavaScript -->
                    </div>
                </div>
                <div class="quantity-selection">
                    <label>Số lượng:</label>
                    <div class="quantity-controls">
                        <button type="button" id="decreaseQty">-</button>
                        <input type="text" id="quantityInput" value="1" readonly>
                        <button type="button" id="increaseQty">+</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="confirmSizeBtn" class="add-to-cart-confirm">THÊM VÀO GIỎ HÀNG</button>
            </div>
        </div>
    </div>
</body>

</html>