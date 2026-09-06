$(document).ready(function () {
  setTimeout(function () {
    $(".alert").alert("close");
  }, 5000);

  $("#searchInput").keypress(function (e) {
    if (e.which == 13) {
      $("#searchForm").submit();
      return false;
    }
  });

  // Xử lý custom select
    $('.custom-select-trigger').click(function () {
        var $customOptions = $(this).siblings('.custom-options');
        $('.custom-options').not($customOptions).hide(); // Ẩn các danh sách khác
        $customOptions.toggle(); // Hiển thị/ẩn danh sách hiện tại
    });

    $('.option').click(function () {
        var $selectWrapper = $(this).closest('.custom-select-wrapper');
        var value = $(this).data('value');
        var text = $(this).text();

        // Cập nhật giá trị hiển thị
        $selectWrapper.find('#selectedUser').text(text);
        // Cập nhật input ẩn
        $selectWrapper.find('#voucherUserInput').val(value);
        // Cập nhật trạng thái selected
        $selectWrapper.find('.option').removeClass('selected');
        $(this).addClass('selected');
        // Ẩn danh sách
        $(this).closest('.custom-options').hide();
    });

    // Ẩn danh sách khi nhấp ra ngoài
    $(document).click(function (e) {
        if (!$(e.target).closest('.custom-select').length) {
            $('.custom-options').hide();
        }
    });
});
