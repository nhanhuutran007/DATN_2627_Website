document.addEventListener("DOMContentLoaded", function () {
  // Tạo modal HTML và thêm vào body
  const modalHtml = `
    <div class="modal" id="address-modal">
      <div class="modal-content">
        <h3 id="modal-title">Thêm địa chỉ mới</h3>
        <div class="form-group">
          <label for="modal-name">Tên người nhận:</label>
          <input type="text" id="modal-name" placeholder="Nhập tên người nhận">
        </div>
        <div class="form-group">
          <label for="modal-phone">Số điện thoại:</label>
          <input type="tel" id="modal-phone" placeholder="Nhập số điện thoại">
        </div>
        <div class="form-group">
          <label for="modal-address">Địa chỉ:</label>
          <textarea id="modal-address" placeholder="Nhập địa chỉ" rows="3"></textarea>
        </div>
        <div class="form-actions">
          <button class="submit-btn" id="modal-submit">Lưu</button>
          <button class="cancel-btn" id="modal-cancel">Hủy</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const userInfo = window.userInfo || null;

  // Hàm hiển thị thông báo tùy chỉnh
  function showNotification(message, isSuccess) {
    const notification = document.createElement("div");
    notification.className = `notification ${isSuccess ? "success" : "error"}`;
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "5px";
    notification.style.background = isSuccess ? "#28a745" : "#dc3545";
    notification.style.color = "#fff";
    notification.style.zIndex = "1000";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Xử lý upload avatar
  const changeAvatarBtn = document.getElementById("change-avatar-btn");
  const avatarUpload = document.getElementById("avatar-upload");
  if (changeAvatarBtn && avatarUpload) {
    changeAvatarBtn.addEventListener("click", function () {
      avatarUpload.click();
    });

    avatarUpload.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) {
        showNotification("Vui lòng chọn một file ảnh.", false);
        return;
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showNotification("Kích thước file không được vượt quá 5MB.", false);
        return;
      }

      const formData = new FormData();
      formData.append("update_avatar", true);
      formData.append("avatar", file);
      formData.append("user_id", userInfo.id_user);

      console.log("Dữ liệu gửi đi:");
      console.log("update_avatar:", true);
      console.log("user_id:", userInfo.id_user);
      console.log("avatar:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        lastModified: new Date(file.lastModified).toLocaleString()
      });

      for (let [key, value] of formData.entries()) {
        console.log(`taiKhoan.js: FormData entry - ${key}:`, value instanceof File ? {
          name: value.name,
          type: value.type,
          size: `${(value.size / 1024).toFixed(2)} KB`
        } : value);
      }

      fetch("/baocao/user/submit", {
        method: "POST",
        body: formData,
      })
        .then(response => {
          console.log("taiKhoan.js: Phản hồi từ server:", {
            status: response.status,
            statusText: response.statusText,
            headers: [...response.headers.entries()]
          });
          return response.text().then(text => {
            console.log("taiKhoan.js: Nội dung phản hồi thô:", text);
            try {
              return JSON.parse(text);
            } catch (error) {
              throw new Error(`Phản hồi không phải JSON: ${text}`);
            }
          });
        })
        .then(data => {
          console.log("Dữ liệu JSON từ server:", data);
          if (data.success) {
            userInfo.avatar = data.avatar;
            const avatarUrl = `/baocao/view/img/upload/avatar/${data.avatar}?t=${new Date().getTime()}`;
            document.getElementById("user-avatar").src = avatarUrl;
            showNotification("Cập nhật ảnh đại diện thành công!", true);
          } else {
            showNotification(data.message || "Lỗi khi cập nhật ảnh đại diện.", false);
          }
        })
        .catch(error => {
          console.error("Lỗi khi upload avatar:", error);
          showNotification("Có lỗi xảy ra khi upload ảnh!", false);
        });
    });
  }

  // Xử lý sự kiện click nút "Chỉnh sửa"
  const editBtn = document.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", function () {
      const isEditing = this.textContent === "Chỉnh sửa";

      if (isEditing) {
        // Chuyển sang chế độ chỉnh sửa
        document.getElementById("user-name").innerHTML = `<input type="text" id="edit-name" value="${userInfo.fullname || ""}">`;
        document.getElementById("user-email").innerHTML = `<input type="email" id="edit-email" value="${userInfo.email || ""}">`;
        document.getElementById("user-phone").innerHTML = `<input type="tel" id="edit-phone" value="${userInfo.phone || ""}">`;
        document.getElementById("user-address").innerHTML = `<input type="text" id="edit-address" value="${userInfo.address || ""}">`;
        const passwordSection = document.getElementById("password-section");
        if (passwordSection) {
          passwordSection.style.display = "block";
        }
        this.textContent = "Lưu";
        this.classList.add("save-btn");

        // Tạo nút "Hủy"
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Hủy";
        cancelBtn.classList.add("cancel-btn");
        this.insertAdjacentElement("afterend", cancelBtn);

        // Xử lý sự kiện "Hủy"
        cancelBtn.addEventListener("click", function () {
          document.getElementById("user-name").innerHTML = userInfo.fullname || "";
          document.getElementById("user-email").innerHTML = userInfo.email || "";
          document.getElementById("user-phone").innerHTML = userInfo.phone || "";
          document.getElementById("user-address").innerHTML = userInfo.address || "";
          if (passwordSection) {
            passwordSection.style.display = "none";
          }
          editBtn.textContent = "Chỉnh sửa";
          editBtn.classList.remove("save-btn");
          cancelBtn.remove();
        });
      } else {
        // Chế độ lưu: Gửi dữ liệu qua AJAX
        const fullname = document.getElementById("edit-name")?.value.trim();
        const email = document.getElementById("edit-email")?.value.trim();
        const phone = document.getElementById("edit-phone")?.value.trim();
        const address = document.getElementById("edit-address")?.value.trim();
        const password = document.getElementById("edit-password")?.value.trim();

        // Kiểm tra dữ liệu
        if (!fullname || !email || !phone || !address || !password) {
          showNotification("Vui lòng điền đầy đủ thông tin, bao gồm mật khẩu.", false);
          return;
        }

        // Kiểm tra định dạng email
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        if (!emailRegex.test(email)) {
          showNotification("Email không hợp lệ.", false);
          return;
        }

        // Kiểm tra định dạng số điện thoại
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
          showNotification("Số điện thoại phải có đúng 10 chữ số.", false);
          return;
        }

        // Gửi AJAX đến UserController.php
        fetch("/baocao/user/submit", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `update_user_info=true&fullname=${encodeURIComponent(fullname)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&address=${encodeURIComponent(address)}&password=${encodeURIComponent(password)}&user_id=${encodeURIComponent(userInfo.id_user)}`
        })
          .then(response => {
            console.log("taiKhoan.js: Phản hồi từ server:", {
              status: response.status,
              statusText: response.statusText,
              headers: [...response.headers.entries()]
            });
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then(text => {
            console.log("taiKhoan.js: Nội dung phản hồi thô:", text);
            try {
              return JSON.parse(text);
            } catch (error) {
              throw new Error(`Phản hồi không phải JSON: ${text}`);
            }
          })
          .then(data => {
            console.log("taiKhoan.js: Dữ liệu JSON từ server:", data);
            if (data.success) {
              userInfo.fullname = fullname;
              userInfo.email = email;
              userInfo.phone = phone;
              userInfo.address = address;

              document.getElementById("user-name").innerHTML = fullname || "";
              document.getElementById("user-email").innerHTML = email || "";
              document.getElementById("user-phone").innerHTML = phone || "";
              document.getElementById("user-address").innerHTML = address || "";
              document.getElementById("password-section").style.display = "none";
              editBtn.textContent = "Chỉnh sửa";
              editBtn.classList.remove("save-btn");

              const cancelBtn = document.querySelector(".cancel-btn");
              if (cancelBtn) cancelBtn.remove();

              showNotification("Cập nhật thông tin thành công!", true);
            } else {
              showNotification(data.message || "Không thể cập nhật thông tin.", false);
            }
          })
          .catch(error => {
            console.error("taiKhoan.js: Lỗi khi gửi AJAX:", error);
            showNotification("Đã xảy ra lỗi khi cập nhật thông tin.", false);
          });
      }
    });
  }

  // Điều hướng sidebar
  const sidebarItems = document.querySelectorAll(".sidebar li");
  const sections = document.querySelectorAll(".content-section");

  function activateTab(sectionId) {
    sidebarItems.forEach((i) => i.classList.remove("active"));
    sections.forEach((s) => s.classList.remove("active"));

    const targetItem = Array.from(sidebarItems).find(
      (item) => item.getAttribute("data-section") === sectionId
    );
    const targetSection = document.getElementById(sectionId);

    if (targetItem && targetSection) {
      targetItem.classList.add("active");
      targetSection.classList.add("active");
    }
  }

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      const sectionId = this.getAttribute("data-section");
      activateTab(sectionId);
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab");
  if (tab) {
    console.log("taiKhoan.js: Activating tab from URL", tab);
    activateTab(tab);
  }

  // Xử lý sự kiện click vào biểu tượng con mắt
  const orderDetailsIcons = document.querySelectorAll(".order-details-icon");
  const orderDetailsModal = document.getElementById("order-details-modal");
  const orderDetailsList = document.getElementById("order-details-list");
  const orderDetailsMoney = document.getElementById("order-details-money");
  const closeModalBtn = document.querySelector("#order-details-modal .close-btn");

  if (orderDetailsIcons && orderDetailsModal && orderDetailsList && orderDetailsMoney && closeModalBtn) {
    orderDetailsIcons.forEach((icon) => {
      icon.addEventListener("click", function () {
        const orderId = this.getAttribute("data-order-id");

        fetch(" /baocao/user/submit", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `get_order_details=true&order_id=${encodeURIComponent(orderId)}`,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then((text) => {
            return JSON.parse(text);
          })
          .then((data) => {
            if (data.success && data.details && data.money && data.details.length > 0) {
              orderDetailsList.innerHTML = "";
              orderDetailsMoney.innerHTML = "";

              data.details.forEach((item) => {
                const row = `
                  <tr>
                    <td><img src="/baocao/view/img/${item.image}" alt="${item.name_product}" style="max-width: 50px;"></td>
                    <td>${item.name_product}</td>
                    <td>${item.size}</td>
                    <td>${item.quantity}</td>
                    <td>${new Intl.NumberFormat('en-US').format(item.price)}đ</td>
                  </tr>
                `;
                orderDetailsList.insertAdjacentHTML("beforeend", row);
              });

              data.money.forEach((item) => {
                const formattedMoney = `
                  <div class="money-row">
                    <span class="money-label">Tổng tiền hàng:</span>
                    <span class="money-value">${new Intl.NumberFormat('en-US').format(item.totalAll)}đ</span>
                  </div>
                  <div class="money-row">
                    <span class="money-label">Giảm giá:</span>
                    <span class="money-value">${item.sale === 0 ? '0đ' : new Intl.NumberFormat('en-US').format(item.sale) + 'đ'}</span>
                  </div>
                  <div class="money-row">
                    <span class="money-label">Phí vận chuyển:</span>
                    <span class="money-value">${new Intl.NumberFormat('en-US').format(item.tienship)}đ</span>
                  </div>
                  <hr class="money-divider">
                  <div class="money-row money-total">
                    <span class="money-label">Tổng thanh toán:</span>
                    <span class="money-value">${new Intl.NumberFormat('en-US').format(item.grandtotal)}đ</span>
                  </div>
                `;
                orderDetailsMoney.insertAdjacentHTML("beforeend", formattedMoney);
              });

              orderDetailsModal.style.display = "flex";
            } else {
              showNotification(data.message || "Không thể tải chi tiết đơn hàng!", false);
            }
          })
          .catch((error) => {
            console.error("taiKhoan.js: Error fetching order details:", error);
            showNotification("Có lỗi xảy ra khi tải chi tiết đơn hàng!", false);
          });
      });
    });

    closeModalBtn.addEventListener("click", function () {
      console.log("taiKhoan.js: Closing order details modal");
      orderDetailsModal.style.display = "none";
    });

    window.addEventListener("click", function (event) {
      if (event.target === orderDetailsModal) {
        console.log("taiKhoan.js: Closing modal by clicking outside");
        orderDetailsModal.style.display = "none";
      }
    });
  }

  // Xử lý đổi mật khẩu
  const changePasswordForm = document.getElementById("change-password-form");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const oldPassword = document.getElementById("old-password")?.value;
      const newPassword = document.getElementById("new-password")?.value;
      const confirmPassword = document.getElementById("confirm-password")?.value;

      if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification("Vui lòng điền đầy đủ các trường!", false);
        return;
      }
      if (newPassword !== confirmPassword) {
        showNotification("Mật khẩu mới và xác nhận mật khẩu không khớp!", false);
        return;
      }
      if (newPassword.length < 8) {
        showNotification("Mật khẩu mới phải có ít nhất 8 ký tự!", false);
        return;
      }

      console.log("taiKhoan.js: Gửi yêu cầu đổi mật khẩu:", {
        old_password: oldPassword,
        new_password: newPassword
      });

      fetch("/baocao/user/submit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `change_password=true&old_password=${encodeURIComponent(oldPassword)}&new_password=${encodeURIComponent(newPassword)}&user_id=${encodeURIComponent(userInfo.id_user)}`,
      })
        .then(response => {
          console.log("taiKhoan.js: Phản hồi từ server (đổi mật khẩu):", {
            status: response.status,
            statusText: response.statusText,
            headers: [...response.headers.entries()]
          });
          return response.text().then(text => {
            console.log("taiKhoan.js: Nội dung phản hồi thô (đổi mật khẩu):", text);
            try {
              return JSON.parse(text);
            } catch (error) {
              throw new Error(`Phản hồi không phải JSON: ${text}`);
            }
          });
        })
        .then((data) => {
          console.log("taiKhoan.js: Dữ liệu JSON từ server (đổi mật khẩu):", data);
          if (data.success) {
            showNotification("Đổi mật khẩu thành công!", true);
            changePasswordForm.reset();
            setTimeout(() => {
              window.location.href = "/baocao/taikhoan";
            }, 1000);
          } else {
            showNotification(data.message || "Lỗi khi đổi mật khẩu!", false);
          }
        })
        .catch(error => {
          console.error("taiKhoan.js: Lỗi khi đổi mật khẩu:", error);
          showNotification("Có lỗi xảy ra khi đổi mật khẩu!", false);
        });
    });
  }

  // Xử lý nút con mắt để hiển thị/ẩn mật khẩu
  document.querySelectorAll(".toggle-password").forEach(icon => {
    let timeoutId = null;
    icon.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) {
        console.error(`taiKhoan.js: Input with ID ${targetId} not found`);
        return;
      }
      console.log("taiKhoan.js: Toggle password visibility for", targetId);

      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log("taiKhoan.js: Cleared previous timeout for", targetId);
      }

      if (input.type === "password") {
        input.type = "text";
        this.classList.remove("bi-eye");
        this.classList.add("bi-eye-slash");
        this.setAttribute("aria-label", `Ẩn ${targetId === "old-password" ? "mật khẩu cũ" : targetId === "new-password" ? "mật khẩu mới" : targetId === "confirm-password" ? "xác nhận mật khẩu" : "mật khẩu xác nhận"}`);
        console.log("taiKhoan.js: Password shown for", targetId);

        timeoutId = setTimeout(() => {
          input.type = "password";
          this.classList.remove("bi-eye-slash");
          this.classList.add("bi-eye");
          this.setAttribute("aria-label", `Hiển thị ${targetId === "old-password" ? "mật khẩu cũ" : targetId === "new-password" ? "mật khẩu mới" : targetId === "confirm-password" ? "xác nhận mật khẩu" : "mật khẩu xác nhận"}`);
          console.log("taiKhoan.js: Password hidden automatically after 1 second for", targetId);
          timeoutId = null;
        }, 1000);
      } else {
        input.type = "password";
        this.classList.remove("bi-eye-slash");
        this.classList.add("bi-eye");
        this.setAttribute("aria-label", `Hiển thị ${targetId === "old-password" ? "mật khẩu cũ" : targetId === "new-password" ? "mật khẩu mới" : targetId === "confirm-password" ? "xác nhận mật khẩu" : "mật khẩu xác nhận"}`);
        console.log("taiKhoan.js: Password hidden manually for", targetId);
        timeoutId = null;
      }
    });
  });

  $(document).ready(function () {
    const toggle2fa = $('#toggle-2fa');
    if (toggle2fa.length) {
      toggle2fa.on('change', function () {
        var isChecked = $(this).is(':checked') ? 1 : 0;
        var userId = window.userInfo.id_user;
        var actionText = isChecked ? 'bật' : 'tắt';

        if (!confirm(`Bạn có chắc chắn muốn ${actionText} xác thực hai yếu tố không?`)) {
          $(this).prop('checked', !isChecked);
          return;
        }

        $.ajax({
          url: '/baocao/user/submit',
          type: 'POST',
          data: {
            update_2fa: 'update_2fa',
            user_id: userId,
            two_fa_active: isChecked
          },
          dataType: 'json',
          success: function (response) {
            if (response.success) {
              toggle2fa.attr('data-2fa-enabled', isChecked ? 'true' : 'false');
              showNotification(`Cập nhật xác thực hai yếu tố thành công!`, true);
            } else {
              showNotification('Lỗi: ' + (response.message || 'Không thể cập nhật xác thực hai yếu tố'), false);
              toggle2fa.prop('checked', !isChecked);
            }
          },
          error: function () {
            showNotification('Đã xảy ra lỗi khi kết nối với server.', false);
            toggle2fa.prop('checked', !isChecked);
          }
        });
      });
    }
  });

  if (userInfo) {
    function checkSession() {
      fetch('/baocao/model/config/checksession.php')
        .then(response => response.json())
        .then(data => {
          if (data.status === 'expired') {
            showNotification('Phiên làm việc đã hết. Vui lòng đăng nhập lại!', false);
            setTimeout(() => {
              window.location.href = '/baocao/trangchu';
            }, 1000);
          }
        })
        .catch(error => {
          console.error("taiKhoan.js: Lỗi khi kiểm tra session:", error);
        });
    }
    setInterval(checkSession, 30000);
  }

  // Trong taikhoan.js, thêm vào cuối khối document.addEventListener("DOMContentLoaded", ...)
const logoutForm = document.getElementById("logout-form");
if (logoutForm) {
    logoutForm.addEventListener("submit", function (e) {
        e.preventDefault(); // Ngăn form submit ngay lập tức

        // Hàm gửi form đăng xuất
        function submitLogoutForm() {
            logoutForm.submit(); // Gửi form gốc
        }

        // Kiểm tra trạng thái phiên tư vấn
        fetch("/baocao/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                action: "load_history",
                last_id: 0
            })
        })
            .then(response => {
                console.log("taiKhoan.js: Phản hồi kiểm tra phiên tư vấn:", {
                    status: response.status,
                    statusText: response.statusText
                });
                return response.json();
            })
            .then(data => {
                let isWaitingForAdmin = false;
                if (data.type === "history" && data.history && data.history.length > 0) {
                    isWaitingForAdmin = data.history.some(msg => msg.status === "waiting_for_admin");
                }

                if (isWaitingForAdmin) {
                    // Gửi yêu cầu kết thúc phiên tư vấn
                    fetch("/baocao/chatbot", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: JSON.stringify({
                            action: "end_consultation"
                        })
                    })
                        .then(response => {
                            console.log("taiKhoan.js: Phản hồi kết thúc phiên tư vấn:", {
                                status: response.status,
                                statusText: response.statusText
                            });
                            return response.json();
                        })
                        .then(endResponse => {
                            if (endResponse.status === "success") {
                                console.log("taiKhoan.js: Phiên tư vấn đã kết thúc");
                            } else {
                                console.warn("taiKhoan.js: Lỗi khi kết thúc phiên tư vấn:", endResponse.message);
                            }
                            submitLogoutForm(); // Đăng xuất sau khi xử lý
                        })
                        .catch(error => {
                            console.error("taiKhoan.js: Lỗi khi kết thúc phiên tư vấn:", error);
                            submitLogoutForm(); // Đăng xuất dù có lỗi
                        });
                } else {
                    // Không có phiên tư vấn, đăng xuất ngay
                    submitLogoutForm();
                }
            })
            .catch(error => {
                console.error("taiKhoan.js: Lỗi khi kiểm tra trạng thái phiên tư vấn:", error);
                submitLogoutForm(); // Đăng xuất nếu không kiểm tra được
            });
    });
}
});