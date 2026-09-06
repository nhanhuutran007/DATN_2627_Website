function formatPrice(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 0) {
        value = parseInt(value).toLocaleString('vi-VN');
    }
    input.value = value;
}

// Hàm cập nhật tổng số lượng
function updateTotalQuantity() {
    var total = 0;
    $('input[name="quantities[]"]').each(function() {
        var qty = parseInt($(this).val()) || 0;
        if (qty > 0) {
            total += qty;
        }
    });
    $('input[name="quantity"]').val(total);
}

$(document).ready(function() {
    // Add size row
    $('#addSizeBtn').click(function() {
        var sizeRow = `
            <div class="row size-row">
                <div class="col-md-5">
                    <input type="text" name="sizes[]" class="form-control" placeholder="Size (VD: 39, M, L)">
                </div>
                <div class="col-md-5">
                    <input type="number" name="quantities[]" class="form-control size-quantity" 
                           placeholder="Số lượng" min="1" oninput="updateTotalQuantity()">
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-danger btn-sm remove-size">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        $('#sizeContainer').append(sizeRow);
    });
    
    // Remove size row và cập nhật tổng
    $(document).on('click', '.remove-size', function() {
        $(this).closest('.size-row').remove();
        updateTotalQuantity();
    });

    // Cập nhật tổng khi thay đổi số lượng size
    $(document).on('input', '.size-quantity', function() {
        updateTotalQuantity();
    });
});