$(document).ready(function () {
    let total = parseInt($('input[name="grandtotal"]').val()) || 109000;
    let savedFormData = null;
    let currentAjaxRequest = null;
    let debounceTimeout = null;

    function updateTotal() {
        $('.order-detail-row.total span:last-child').text(total.toLocaleString() + 'đ');
    }

    $('.initial-place-order-btn').on('click', function () {
        if ($('.order-items').children().length === 0) {
            alert('Giỏ hàng trống! Vui lòng thêm sản phẩm trước khi đặt hàng.');
            return;
        }

        const email = $('#email').val().trim();
        const fullName = $('#full-name').val().trim();
        const phone = $('#phone').val().trim();
        const street = $('#street').val().trim();

        if (!email || !fullName || !phone || !street) {
            alert('Vui lòng điền đầy đủ thông tin mua hàng!');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Vui lòng nhập địa chỉ email hợp lệ!');
            return;
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            alert('Vui lòng nhập số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)!');
            return;
        }

        const formData = $('#checkout-form').serialize();
        // Gửi yêu cầu AJAX để kiểm tra số lượng
        $.ajax({
            url: '/baocao/user/submit',
            type: 'POST',
            data: formData,
            dataType: 'json',
            success: function (response) {
                if (response.status === 'success') {
                    // Nếu không có lỗi, hiển thị modal
                   $('#payment-modal').addClass('active').fadeIn();
                   // Kiểm tra grandTotal và điều chỉnh phương thức thanh toán
                    if (window.grandTotal == 0) {
                        // Vô hiệu hóa "Chuyển khoản ngân hàng" và chọn "COD"
                        $('input[name="payment-method"][value="bank-transfer"]').prop('disabled', true);
                        $('input[name="payment-method"][value="cod"]').prop('checked', true);
                        $('.bank-info').hide();
                    } else {
                        // Cho phép cả hai phương thức
                        $('input[name="payment-method"][value="bank-transfer"]').prop('disabled', false);
                    }
                } else if (response.status === 'error') {
                    // Nếu có lỗi, hiển thị thông báo lỗi
                    alert(response.message);
                }
            },
            error: function (xhr, status, error) {
                alert('Đã xảy ra lỗi khi kiểm tra số lượng. Vui lòng thử lại!');
                console.error('AJAX Error:', status, error);
            }
        });

        // $('#payment-modal').addClass('active').fadeIn();
    });

    $('.close-modal').on('click', function () {
        $('#payment-modal').removeClass('active').fadeOut();
        if (currentAjaxRequest) {
            currentAjaxRequest.abort();
        }
    });

    function debounce(func, wait) {
        return function () {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(func, wait);
        };
    }

    $('input[name="payment-method"]').on('change', function () {
        const paymentMethod = $(this).val();
        const bankInfo = $('.bank-info');
        const newOrderId = 'webtt' + Math.floor(Math.random() * 900000 + 100000); 
        $('input[name="order_id"]').val(newOrderId);
        // Hủy yêu cầu AJAX trước đó nếu có
        if (currentAjaxRequest) {
            currentAjaxRequest.abort();
        }

        // Xóa nội dung QR trước đó
        $('#payos-checkout').empty();
        if (paymentMethod === 'bank-transfer') {
            bankInfo.fadeIn();
            const formData = $('#checkout-form').serializeArray();
            formData.push({ name: 'payment-method', value: paymentMethod });
            formData.push({ name: 'dathang', value: '1' });
            // Lưu formData vào biến toàn cục
            savedFormData = formData;

            $.ajax({
                url: '/baocao/submit',
                type: 'POST',
                data: formData,
                dataType: 'json',
                success: function (response) {
                    if (response.status === 'success' && response.checkoutUrl) {
                        const payOSConfig = {
                            RETURN_URL: 'https://www.facebook.com/nam.huynhnhat.710/',
                            ELEMENT_ID: 'payos-checkout',
                            CHECKOUT_URL: response.checkoutUrl,
                            embedded: true,
                            onSuccess: function (event) {
                                if (event.status === 'PAID') {
                                    handleSuccess();
                                } else {
                                    alert('Thanh toán thất bại: ' + (event.desc || 'Lỗi không xác định'));
                                }
                            },
                            onCancel: function (event) {
                                if (event.cancel === 'true' || event.status === 'CANCELLED') {
                                    alert('Thanh toán đã bị hủy.');
                                    $('#payment-modal').removeClass('active').fadeOut();
                                }
                            },
                            onExit: function (event) {
                                $('#payment-modal').removeClass('active').fadeOut();
                            }
                        };
                        try {
                            const payOS = PayOSCheckout.usePayOS(payOSConfig);
                            payOS.open(true);

                            // Bắt đầu kiểm tra trạng thái thanh toán định kỳ
                            const checkStatusInterval = setInterval(function () {
                                $.ajax({
                                    url: '/baocao/view/php/check_payment_status.php',
                                    type: 'GET',
                                    dataType: 'json',
                                    success: function (statusResponse) {
                                        if (statusResponse.status === 'success') {
                                            if (statusResponse.paymentStatus === 'PAID') {
                                                clearInterval(checkStatusInterval);
                                                handleSuccess();
                                            } else if (statusResponse.paymentStatus === 'CANCELLED') {
                                                clearInterval(checkStatusInterval);
                                                alert('Thanh toán đã bị hủy.');
                                                $('#payment-modal').removeClass('active').fadeOut();
                                            }
                                        }
                                    },
                                    error: function () {
                                        console.error('Lỗi khi kiểm tra trạng thái thanh toán.');
                                    }
                                });
                            }, 5000); // Kiểm tra mỗi 5 giây
                        } catch (e) {
                            console.error('PayOSCheckout.usePayOS error:', e);
                            $('#payos-checkout').html(
                                '<p>Lỗi: Không thể khởi tạo mã QR. Vui lòng sử dụng liên kết thanh toán:</p>' +
                                '<a href="' + response.checkoutUrl + '" target="_blank">Mở liên kết thanh toán PayOS</a>'
                            );
                            alert('Lỗi: Không thể khởi tạo mã QR. Vui lòng sử dụng liên kết thanh toán.');
                        }
                    } else {
                        $('#payos-checkout').html('<p>Không thể tạo mã QR PayOS.</p>');
                        alert(response.message || 'Không thể tạo mã QR PayOS.');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('AJAX Error:', status, error, 'Response:', xhr.responseText);
                    $('#payos-checkout').html('<p>Lỗi khi tạo mã QR.</p>');
                    alert('Lỗi khi tạo mã QR. Vui lòng thử lại!');
                }
            });
        } else {
            bankInfo.fadeOut();
        }
    });

    function handleSuccess() {
        const modalContent = $('.modal-content');
        modalContent.html(`
            <span class="close-modal">×</span>
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <img src="/baocao/view/img/tickxanh.webp" alt="Success Icon" style="width: 10vw; height: auto; margin-right: 10px; animation: bounce 1.5s infinite;">
                <h2 style="font-size: 2em; color: #ff6200; margin: 0;">Thanh toán thành công!</h2>
            </div>
            <p>Đơn hàng của bạn đã được xác nhận. Cảm ơn bạn đã mua sắm tại NHL SPORTS.</p>
            <p>Đang chuyển hướng trong <span id="countdown">3</span> giây...</p>
            <style>
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            </style>
        `);

        // Vô hiệu hóa toàn bộ giao diện
        disableInterface();

        const form = $('<form>')
            .attr({
                method: 'POST',
                action: '/baocao/user/submit',
                style: 'display: none;'
            });

        if (savedFormData) {
            savedFormData.forEach(function (field) {
                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: field.name,
                        value: field.value
                    })
                    .appendTo(form);
            });
        }
        $('body').append(form);

        let countdown = 3;
        const countdownElement = $('#countdown');
        const interval = setInterval(function () {
            countdown--;
            countdownElement.text(countdown);
            if (countdown <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        enableInterface();
        form.submit();

        // $('.close-modal').on('click', function () {
        //     $('#payment-modal').removeClass('active').fadeOut();
        //     form.remove();
        // });
        // Ngăn sự kiện đóng modal
        $('.close-modal').off('click'); // Xóa mọi sự kiện click trước đó
        $('.close-modal').on('click', function (e) {
            e.preventDefault(); // Ngăn hành động đóng
        });
    }

    // Hàm vô hiệu hóa giao diện
    function disableInterface() {
        // Thêm lớp disabled-overlay vào modal và body
        $('#payment-modal').addClass('disabled-overlay');
        $('body').addClass('disabled-overlay');

        // Vô hiệu hóa tất cả nút và liên kết
        $('button, input[type="button"], input[type="submit"]').prop('disabled', true);
        $('a').addClass('disabled').on('click.disabled', function (e) {
            e.preventDefault(); // Ngăn click liên kết
        });

        // Vô hiệu hóa các input và textarea
        $('input, textarea').prop('disabled', true);

        // Ngăn chuyển trang
        $(window).on('beforeunload.disabled', function () {
            return 'Đang xử lý thanh toán, vui lòng không rời trang!';
        });
    }

    // Hàm gỡ vô hiệu hóa giao diện
    function enableInterface() {
        $('#payment-modal').removeClass('disabled-overlay');
        $('body').removeClass('disabled-overlay');

        $('button, input[type="button"], input[type="submit"]').prop('disabled', false);
        $('a').removeClass('disabled').off('click.disabled');
        $('input, textarea').prop('disabled', false);

        $(window).off('beforeunload.disabled');
    }

    $('.place-order-btn').on('click', function (e) {
        e.preventDefault();

        const paymentMethod = $('input[name="payment-method"]:checked').val();
        if (!paymentMethod) {
            alert('Vui lòng chọn phương thức thanh toán!');
            return;
        }

        const form = $('#checkout-form');

        if (paymentMethod === 'bank-transfer') {
            alert('Vui lòng quét mã QR để hoàn tất thanh toán.');
        } else if (paymentMethod === 'cod') {
            // Cập nhật action của form và submit trực tiếp
            form.attr('action', '/baocao/user/submit');
            // Đảm bảo payment-method và dathang được gửi
            $('<input>').attr({
                type: 'hidden',
                name: 'payment-method',
                value: paymentMethod
            }).appendTo(form);
            $('<input>').attr({
                type: 'hidden',
                name: 'dathang',
                value: '1'
            }).appendTo(form);
            form.submit();
        }
    });

    setTimeout(() => {
        const alertBox = $('.alert-error');
        if (alertBox.length) {
            alertBox.fadeOut(500, () => alertBox.remove());
        }
    }, 3000);
});