$(document).ready(function () {
  // Handle sport type selection
  $("#parentSelect").change(function () {
    var parentId = $(this).val();
    var childSelect = $("#childSelect");

    if (parentId) {
      // Show loading
      childSelect
        .prop("disabled", true)
        .html('<option value="">Đang tải danh mục...</option>');

      // AJAX call to get child categories
      $.get(
        "/baocao/add_product",
        {
          parent_id: parentId,
        },
        function (data) {
          if (data.length > 0) {
            var options =
              '<option value="">-- Chọn danh mục sản phẩm --</option>';

            // Add new options
            $.each(data, function (index, table) {
              // Format display name nicely
              var displayName = table
                .replace("quanao", "Quần áo ")
                .replace("giay", "Giày ")
                .replace("phukien", "Phụ kiện ")
                .replace("aobia", "Áo bi-a ")
                .replace("gaybia", "Gậy bi-a ")
                .replace("vot", "Vợt ")
                .replace("qua", "Quả ")
                .replace("cauthidau", "Cầu thi đấu")
                .replace("bongro", "bóng rổ")
                .replace("bongda", "bóng đá")
                .replace("bongchuyen", "bóng chuyền")
                .replace("tap", "tập ")
                .replace("chaybo", "chạy bộ")
                .replace("caulong", "Cầu lông");

              options +=
                '<option value="' + table + '">' + displayName + "</option>";
            });

            childSelect.html(options).prop("disabled", false);
          } else {
            childSelect
              .html('<option value="">Không có danh mục nào</option>')
              .prop("disabled", true);
          }
        },
        "json"
      ).fail(function () {
        childSelect.html('<option value="">Lỗi khi tải danh mục</option>');
      });
    } else {
      childSelect
        .html('<option value="">-- Chọn loại thể thao trước --</option>')
        .prop("disabled", true);
    }
  });

  // Show/hide warranty field based on product category
  $("#childSelect").change(function () {
    var selectedTable = $(this).val();

    // Show/hide warranty field
    if (
      selectedTable &&
      ["votcaulong", "votpickleball", "gaybia"].includes(selectedTable)
    ) {
      $("#warrantyField").show();
    } else {
      $("#warrantyField").hide();
    }

    // Show/hide size management field
    if (
      selectedTable &&
      (selectedTable.includes("giay") ||
        selectedTable.includes("quanao") ||
        selectedTable === "aobia")
    ) {
      $("#sizeField").show();
    } else {
      $("#sizeField").hide();
    }
  });

  // Add size row
  $("#addSizeBtn").click(function () {
    var sizeRow = `
        <div class="row size-row">
            <div class="col-md-5">
                <input type="text" name="sizes[]" class="form-control" placeholder="Size (VD: 39, M, L)">
            </div>
            <div class="col-md-5">
                <input type="number" name="quantities[]" class="form-control" placeholder="Số lượng" min="1" oninput="updateTotalQuantity()">
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm remove-size">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    $("#sizeContainer").append(sizeRow);
  });

  // Khi xóa size, cũng cập nhật tổng
  $(document).on("click", ".remove-size", function () {
    $(this).closest(".size-row").remove();
    updateTotalQuantity();
  });

  // Remove size row
  $(document).on("click", ".remove-size", function () {
    $(this).closest(".size-row").remove();
  });
  $("#descriptionSelect").change(function () {
    var descId = $(this).val();
    if (descId === "custom") {
      $("#descriptionFields").show();
      $("#chatlieu, #thietke, #mausac, #kichthuoc").val("");
    } else {
      $("#descriptionFields").hide();
    }
  });
  if ($(".alert-success").length || $(".alert-danger").length) {
    // Đặt thời gian tự động tắt sau 5 giây (5000 milliseconds)
    setTimeout(function () {
      $(".alert").alert("close");
    }, 3000);
  }
});
//hàm cập nhật số lượng 
function updateTotalQuantity() {
  var total = 0;
  $('input[name="quantities[]"]').each(function () {
    var qty = parseInt($(this).val()) || 0;
    if (qty > 0) {
      total += qty;
    }
  });
  $('input[name="quantity"]').val(total);
}
// Price formatting function
function formatPrice(input) {
  let value = input.value.replace(/\D/g, "");
  
  if (value.length > 0) {
    value = parseInt(value, 10).toLocaleString("vi-VN");
  }
  
  input.value = value + 'đ';
  
  const len = input.value.length;
  input.setSelectionRange(len - 1, len - 1);
}



