
// Đặt renderCart vào phạm vi toàn cục
// Hàm mã hóa HTML để xử lý ký tự đặc biệt
function htmlEscape(str) {
  return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
}

// Đặt renderCart vào phạm vi toàn cục
window.renderCart = function() {
  let cart = window.isLoggedIn ? window.cartFromDatabase : JSON.parse(localStorage.getItem("cart")) || [];
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const appliedVoucherSpan = document.getElementById('applied-voucher');
  const voucherButton = $('.summary-actions .voucher-btn');
  const checkoutButton = $('.summary-actions .checkout-btn');

  if (!cartItems || !cartTotal || !appliedVoucherSpan) {
      console.error("Không tìm thấy phần tử DOM cần thiết:", {
          cartItems: !!cartItems,
          cartTotal: !!cartTotal,
          appliedVoucherSpan: !!appliedVoucherSpan
      });
      return;
  }

  cartItems.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
      cartItems.innerHTML = '<tr><td colspan="5">Giỏ hàng trống!</td></tr>';
      cartTotal.textContent = '0đ';
      appliedVoucherSpan.textContent = '';
      voucherButton.hide();
      checkoutButton.hide();
  } else {
      console.log(`Hiển thị ${cart.length} sản phẩm trong giỏ hàng`);
      voucherButton.fadeIn();
      checkoutButton.fadeIn();

      cart.forEach((item, index) => {
          const row = document.createElement('tr');
          const itemTotal = item.price * item.quantity;
          total += itemTotal;
          const getBaseName = (path) => path.split('/').pop();
          const imageSrc = `/baocao/view/img/${getBaseName(item.image)}`;

          // Mã hóa item.name cho thuộc tính data-name
          const escapedName = htmlEscape(item.name);

          row.innerHTML = `
              <td class="product-info">
                  <img src="${imageSrc}" alt="${escapedName}">
                  <span class="product-name" data-name="${escapedName}" style="cursor: pointer;">${item.name}</span>
                  <div class="cart-item-size">Size: ${item.size || 'N/A'}</div>
              </td>
             <td class="price">${new Intl.NumberFormat('en-US').format(item.price)}đ</td>
              <td><input type="number" min="1" value="${item.quantity}" data-index="${index}" ${
                  window.isLoggedIn && item.id ? `data-id="${item.id}"` : ""
              }></td>
              <td class="price">${itemTotal.toLocaleString()}đ</td>
              <td><button class="remove-btn" data-index="${index}" ${
                  window.isLoggedIn && item.id ? `data-id="${item.id}"` : ""
              }><i class="bi bi-trash"></i></button></td>
          `;
          cartItems.appendChild(row);
      });

      let displayTotal = total;
      let discountText = '';

      if (window.appliedVoucher) {
          const discount = window.appliedVoucher.discount || 0;
          const freeship = window.appliedVoucher.freeship || false;

          if (discount > 0) {
              displayTotal = total - discount;
              if(displayTotal < 0){
                displayTotal = 0;
              }
              discountText = `Đã áp dụng: ${window.appliedVoucher.code} (-${discount.toLocaleString()}đ)`;
          } else if (freeship) {
              discountText = `Đã áp dụng: ${window.appliedVoucher.code} (Freeship)`;
          }
      }

      appliedVoucherSpan.textContent = discountText;

      if (displayTotal < total) {
          cartTotal.innerHTML = `
              <span style="text-decoration: line-through; color: gray;">${total.toLocaleString()}đ</span>
              <span style="color: red; margin-left: 8px;">${displayTotal.toLocaleString()}đ</span>
          `;
      } else {
          cartTotal.textContent = total.toLocaleString() + 'đ';
      }

      // Thêm sự kiện click cho product-name
      document.querySelectorAll('.product-name').forEach(nameElement => {
          nameElement.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();

              // Lấy giá trị gốc (không mã hóa) từ textContent
              const productName = this.textContent.trim();

              // Tìm hoặc tạo form #productForm
              let productForm = document.getElementById('productForm');
              if (!productForm) {
                  productForm = document.createElement('form');
                  productForm.id = 'productForm';
                  productForm.method = 'POST';
                  productForm.action = '/baocao/user/submit';
                  document.body.appendChild(productForm);
              }

              // Xóa input cũ
              productForm.querySelectorAll('input[name="product_name"]').forEach(input => input.remove());

              // Tạo input mới với giá trị gốc
              const hiddenInput = document.createElement('input');
              hiddenInput.type = 'hidden';
              hiddenInput.name = 'product_name';
              hiddenInput.value = productName;

              productForm.appendChild(hiddenInput);
              productForm.submit();
          });
      });
  }
};


// Khởi tạo khi trang tải
document.addEventListener('DOMContentLoaded', function() {
    const cartItems = document.getElementById('cart-items');
    const voucherPopup = document.getElementById('voucher-popup');
    if (!cartItems || !voucherPopup) {
      console.error("Không tìm thấy cartItems hoặc voucherPopup:", {
          cartItems: !!cartItems,
          voucherPopup: !!voucherPopup
      });
      return;
    }
    // Cập nhật số lượng
    cartItems.addEventListener('change', function(e) {
      if (e.target.tagName === 'INPUT') {
              console.log("Thay đổi số lượng. Input:", e.target); // Debug input thay đổi
              const index = e.target.getAttribute("data-index");
              const newQuantity = parseInt(e.target.value);
              console.log(`Cập nhật số lượng index ${index} thành ${newQuantity}`); // Debug thông tin cập nhật
              let cart = window.isLoggedIn ? window.cartFromDatabase : JSON.parse(localStorage.getItem("cart")) || [];
        if (newQuantity > 0) {
          if (isLoggedIn) {
            const item = cart[index];
            console.log(item.name);
            console.log(item.size);
            console.log(newQuantity);
            // const id = e.target.getAttribute("data-id");
            // console.log(`isLoggedIn = true. ID sản phẩm: ${id}`); // Debug ID sản phẩm
            // if (id) {
                $.ajax({
                    url: "/baocao/user/submit",
                    type: "POST",
                    dataType: "json",
                    data: {
                        update_cart: true,
                        product_name: item.name,
                        size: item.size,
                        // id: id,
                        quantity: newQuantity,
                    },
                    success: function(response) {
                      console.log("Phản hồi AJAX cập nhật số lượng:", response); // Debug phản hồi AJAX
                      if (response.success) {
                          window.cartFromDatabase[index].quantity = newQuantity;
                          console.log("cartFromDatabase sau cập nhật:", cartFromDatabase); // Debug sau cập nhật
                          window.renderCart();
                          if (typeof window.updateCart === "function") {
                              window.updateCart();
                              console.log("Đã gọi window.updateCart"); // Debug gọi updateCart
                          }
                      } else {
                          console.warn("Lỗi cập nhật số lượng:", response.message);
                      }
                    },
                    error: function(xhr, status, error) {
                        console.warn("Lỗi cập nhật số lượng:", status, error);
                    },
                });
            // }
          } else {
                      console.log("isLoggedIn = false. Cập nhật localStorage"); // Debug cập nhật localStorage
                      cart[index].quantity = newQuantity;
                      localStorage.setItem("cart", JSON.stringify(cart));
                      console.log("localStorage sau cập nhật:", JSON.parse(localStorage.getItem("cart"))); // Debug localStorage
                      window.renderCart();
                      if (typeof window.updateCart === "function") {
                          window.updateCart();
                          console.log("Đã gọi window.updateCart"); // Debug gọi updateCart
                      }
          }
        }else {
          console.warn("Số lượng không hợp lệ:", newQuantity);
          // Khôi phục số lượng cũ
          e.target.value = cart[index].quantity;
        }
      }
  });

  // Xóa sản phẩm
  cartItems.addEventListener('click', function(e) {
    if (e.target.closest('.remove-btn')) {
      const index = e.target.closest('.remove-btn').getAttribute('data-index');
      let cart = isLoggedIn ? cartFromDatabase : JSON.parse(localStorage.getItem("cart")) || [];
      const removedItem = cart[index]; //  Lấy thông tin sản phẩm bị xoá

    // Gửi yêu cầu xoá sản phẩm khỏi database (nếu đã đăng nhập)
    if (isLoggedIn) {
      // const id = e.target.closest(".remove-btn").getAttribute("data-id");
      // if (id) {
          $.ajax({
              url: "/baocao/user/submit",
              type: "POST",
              dataType: "json",
              data: {
                  remove_from_cart: true,
                  product_name: removedItem.name,
                  size: removedItem.size
              },
              success: function(response) {
                  if (response.success) {
                      cartFromDatabase.splice(index, 1);
                      window.renderCart();
                      if (typeof window.updateCart === "function") {
                          window.updateCart();
                      }
                  } else {
                      console.warn("Lỗi xóa sản phẩm:", response.message);
                  }
              },
              error: function(xhr, status, error) {
                  console.warn("Lỗi xóa DB:", status, error);
              },
            });
        // }
    } else {
        cart.splice(index, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        window.renderCart();
        if (typeof window.updateCart === "function") {
            window.updateCart();
        }
    }
    }
  });

  document.querySelector('.voucher-btn').addEventListener('click', function() {
    if (window.isLoggedIn) {
        voucherPopup.style.display = 'block';
    } else {
        alert('Vui lòng đăng nhập để được dùng voucher');
    }
  });

  // Đóng popup
  document.querySelector('.close-btn').addEventListener('click', function() {
    voucherPopup.style.display = 'none';
  });

  // Áp dụng mã giảm giá
  document.querySelectorAll('.apply-btn').forEach(button => {
    button.addEventListener('click', function() {
      const voucherItem = this.parentElement;
      window.appliedVoucher = {
        code: voucherItem.getAttribute('data-code'),
        discount: parseInt(voucherItem.getAttribute('data-discount')) || 0,
        freeship: voucherItem.getAttribute('data-freeship') === 'true'
      };
      voucherPopup.style.display = 'none';
      window.renderCart();
      if (typeof window.updateCart === 'function') {
        window.updateCart(); // Cập nhật header sau khi thay đổi
      }
    });
  });

  // Xử lý submit form thanh toán
  document.getElementById("checkout-form").addEventListener("submit", function(e) {
    e.preventDefault();
    try {
        let cart = isLoggedIn ? cartFromDatabase : JSON.parse(localStorage.getItem("cart")) || [];
        const cartData = {
            items: cart,
            appliedVoucher: window.appliedVoucher || null,
        };

        const cartDataInput = document.getElementById("cart-data");
        cartDataInput.value = JSON.stringify(cartData);

        console.log("Cart data before submitting form:", cartData);

        this.submit();
    } catch (error) {
        console.error("Error preparing cart data:", error);
        alert("Có lỗi xảy ra khi xử lý giỏ hàng. Vui lòng thử lại.");
    }
});

  // Hiển thị giỏ hàng ban đầu
  window.renderCart();
});

if(isLoggedIn){
  function checkSession() {
    fetch('/baocao/model/config/checksession.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'expired') {
                alert('Phiên làm việc đã hết. Vui lòng đăng nhập lại!');
                window.location.href = '/baocao/trangchu';
            }
        });
  }
  setInterval(checkSession, 30000);
}



