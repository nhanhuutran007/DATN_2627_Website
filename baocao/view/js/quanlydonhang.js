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
});

$(document).ready(function() {
    // Xử lý nút cập nhật trạng thái
    $('.update-status-btn').on('click', function() {
        const orderId = $(this).data('order-id');
        const status = $(this).data('status');
        const $row = $(this).closest('tr');
        const $statusBadge = $row.find('.badge');

        // Gửi yêu cầu AJAX
        $.ajax({
            url: '/baocao/user/submit',
            method: 'POST',
            data: {
                action: 'update_status',
                id: orderId,
                status: status
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    // Cập nhật trạng thái trên UI
                    let newStatusText = '';
                    let newStatusClass = '';
                    if (response.message.includes('Đang giao')) {
                        newStatusText = 'Đang giao';
                        newStatusClass = 'badge bg-primary';
                    } else if (response.message.includes('Đã giao')) {
                        newStatusText = 'Đã giao';
                        newStatusClass = 'badge bg-success';
                    }

                    $statusBadge.text(newStatusText).removeClass().addClass(newStatusClass);

                    // Cập nhật nút thao tác
                    const $actionCell = $row.find('td:last-child');
                    if (newStatusText === 'Đang giao') {
                        $actionCell.find('.update-status-btn').html('<i class="fas fa-check-double"></i>')
                            .attr('title', 'Xác nhận đã giao');
                    } else if (newStatusText === 'Đã giao') {
                        $actionCell.find('.update-status-btn').replaceWith(
                            '<button class="btn btn-sm btn-outline-success me-1" disabled title="Đơn hàng đã hoàn thành">' +
                            '<i class="fas fa-check-circle"></i> Đã hoàn thành</button>'
                        );
                        $actionCell.find('.cancel-order-btn').remove(); // Xóa nút hủy
                    }

                    // Hiển thị thông báo thành công
                    showAlert('success', response.message);
                } else {
                    showAlert('danger', response.error || 'Cập nhật trạng thái thất bại!');
                }
            },
            error: function() {
                showAlert('danger', 'Lỗi kết nối server. Vui lòng thử lại.');
            }
        });
    });

    // Xử lý nút hủy đơn
    $('.cancel-order-btn').on('click', function() {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
            return;
        }

        const orderId = $(this).data('order-id');
        const $row = $(this).closest('tr');
        const $statusBadge = $row.find('.badge');

        // Gửi yêu cầu AJAX
        $.ajax({
            url: '/baocao/user/submit',
            method: 'POST',
            data: {
                action: 'delete_order',
                id: orderId
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    // Cập nhật trạng thái trên UI
                    $statusBadge.text('Đã hủy').removeClass().addClass('badge bg-danger');

                    // Xóa nút hủy và cập nhật nút xác nhận
                    const $actionCell = $row.find('td:last-child');
                    $actionCell.find('.cancel-order-btn').remove();
                    $actionCell.find('.update-status-btn').remove();

                    // Hiển thị thông báo thành công
                    showAlert('success', response.success_message || 'Hủy đơn hàng thành công!');
                } else {
                    showAlert('danger', response.error || 'Hủy đơn hàng thất bại!');
                }
            },
            error: function() {
                showAlert('danger', 'Lỗi kết nối server. Vui lòng thử lại.');
            }
        });
    });

    // Hàm hiển thị thông báo
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('.main-content').prepend(alertHtml);
        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }
});


