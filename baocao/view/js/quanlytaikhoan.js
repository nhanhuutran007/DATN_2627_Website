$(document).ready(function() {
    // Xử lý click vào hàng bảng
    $('table tbody tr').on('click', function(e) {
        if (!$(e.target).closest('.btn').length) {
            $(this).find('a[data-bs-toggle="modal"]').click();
        }
    });

    // Tự động đóng thông báo
    setTimeout(function() {
        $(".alert").alert('close');
    }, 5000);

    // Chuyển đổi hiển thị mật khẩu
    $('.toggle-password').click(function() {
        var targetId = $(this).data('target');
        var input = $('#' + targetId);
        var icon = $(this).find('i');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    // Kiểm tra biểu mẫu Bootstrap
    (function () {
        'use strict';
        var forms = document.querySelectorAll('.needs-validation');
        Array.prototype.slice.call(forms).forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    })();

    function validateEmail(email) {
        const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        return re.test(String(email).toLowerCase());
    }

    function validatePhone(phone) {
        return /^\d{10}$/.test(phone);
    }

    // Kiểm tra real-time khi người dùng nhập liệu
    $('input[name="email"]').on('input', function() {
        const email = $(this).val();
        if (email && !validateEmail(email)) {
            $(this).addClass('is-invalid');
            $(this).next('.invalid-feedback').text('Email không đúng định dạng (ví dụ: example@domain.com)').show();
        } else {
            $(this).removeClass('is-invalid');
            $(this).next('.invalid-feedback').hide();
        }
    });

    $('input[name="phone"]').on('input', function() {
        const phone = $(this).val();
        if (phone && !validatePhone(phone)) {
            $(this).addClass('is-invalid');
            $(this).next('.invalid-feedback').text('Số điện thoại phải có đúng 10 chữ số').show();
        } else {
            $(this).removeClass('is-invalid');
            $(this).next('.invalid-feedback').hide();
        }
    });

    $('input[name="password"], input[name="admin_password"]').on('input', function() {
        const password = $(this).val();
        if (password && password.length < 8) {
            $(this).addClass('is-invalid');
            $(this).parent().next('.invalid-feedback').text('Mật khẩu phải có ít nhất 8 ký tự').show();
        } else {
            $(this).removeClass('is-invalid');
            $(this).parent().next('.invalid-feedback').hide();
        }
    });

    // Tự động format số điện thoại (chỉ cho phép nhập số)
    $('input[name="phone"]').on('keypress', function(e) {
        const charCode = (e.which) ? e.which : e.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            return false;
        }
        return true;
    });
    
});