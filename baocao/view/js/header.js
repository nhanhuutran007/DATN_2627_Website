function addHyphen(string) {
    // Từ điển ánh xạ các danh mục
    const categoryMap = {
        // Môn thể thao
        'bongro': 'bong-ro',
        'bongchuyen': 'bong-chuyen',
        'bongda': 'bong-da',
        'tapgym': 'tap-gym',
        'chaybo': 'chay-bo',
        'caulong': 'cau-long',
        'pickleball': 'pickle-ball',
        'bia': 'bia',
        'saleoutlet40': 'sale-outlet'
    };

    // Chuyển thành chữ thường
    string = string.toLowerCase();

    // Kiểm tra nếu chuỗi tồn tại trong từ điển
    if (categoryMap[string]) {
        return categoryMap[string];
    }

    // Nếu không có trong từ điển, tách bằng biểu thức chính quy
    // Thêm dấu gạch ngang trước chữ cái in hoa và chuyển thành chữ thường
    const result = string
        .replace(/([a-z])([A-Z])/g, '$1-$2') // Thêm dấu gạch ngang giữa chữ thường và chữ hoa
        .toLowerCase();
    
    return result;
}


$(document).ready(function () {
  // Hàm cập nhật dropdown menu người dùng
  function updateUserMenu() {
    const dropdownMenu = $("#user-dropdown-menu");
    dropdownMenu.empty();

    if (isUserLoggedIn) {
      dropdownMenu.append(`
                    <li><a href="#" id="taikhoan" class="taikhoan"><img src="/baocao/view/img/loginicon.png">Tài khoản</a></li>
                    <li>
                        <a href="#" id="logout" class="logout-btn"><img src="/baocao/view/img/dangxuaticon.jpg">Đăng xuất</a>
                    </li>
                `);
    } else {
      dropdownMenu.append(`
                    <li><a href="/baocao/login"><img src="/baocao/view/img/loginicon.png">Đăng nhập</a></li>
                `);
    }
  }

  // Cập nhật menu người dùng khi trang tải
  updateUserMenu();
  const userInfo = window.userInfo || null;
  // Hàm cập nhật avatar trong header
  function updateHeaderAvatar() {
    if (isUserLoggedIn) {
          const avatarElement = $("#header-avatar-link");
          if (userInfo.avatar) {
            avatarElement.html(
              `<img src="/baocao/view/img/upload/avatar/${userInfo.avatar}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%;">`
            );
          } else {
            avatarElement.html(`<img src="/baocao/view/img/upload/avatar/loginicon.png" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%;">`);
          }
    } else {
      $("#header-avatar-link").html(`<i class="bi bi-person" ></i>`);
    }
  }

  // Gọi hàm cập nhật avatar khi trang tải
  updateHeaderAvatar();

  // Hiển thị/ẩn dropdown menu người dùng
  $(".user-menu .dropdown-toggle").click(function (event) {
    event.preventDefault();
    event.stopPropagation();
    const dropdownMenu = $(this).siblings(".dropdown-menu");
    $(".dropdown-menu").not(dropdownMenu).slideUp();
    dropdownMenu.slideToggle();
  });

  // Ẩn dropdown khi click ra ngoài
  $(document).click(function (event) {
    if (!$(event.target).closest(".user-menu").length) {
      $(".dropdown-menu").slideUp();
    }
  });

  // Xử lý đăng xuất
  $(document).on("click", ".logout-btn", function (e) {
    e.preventDefault();
    const $form = $(`
      <form id="logout" action="/baocao/user/submit" method="POST" style="display: none;">
        <input type="hidden" name="logout" value="1">
      </form>
    `);
  
    // Thêm form vào body
    $("body").append($form);
  
    // Gửi form
    $form.submit();
    
    // Kiểm tra trạng thái phiên tư vấn
    $.ajax({
        url: '/baocao/chatbot',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
            action: 'load_history',
            last_id: 0
        }),
        dataType: 'json',
        success: function(response) {
            let isWaitingForAdmin = false;
            if (response.type === 'history' && response.history && response.history.length > 0) {
                isWaitingForAdmin = response.history.some(msg => msg.status === 'waiting_for_admin');
            }

            if (isWaitingForAdmin) {
                // Gửi yêu cầu kết thúc phiên tư vấn
                $.ajax({
                    url: '/baocao/chatbot',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        action: 'end_consultation'
                    }),
                    dataType: 'json',
                    success: function(endResponse) {
                        if (endResponse.status === 'success') {
                            console.log('Phiên tư vấn đã kết thúc');
                            // Không cần thông báo vì người dùng đang đăng xuất
                        } else {
                            console.warn('Lỗi khi kết thúc phiên tư vấn:', endResponse.message);
                        }
                        // Tiếp tục đăng xuất dù có lỗi hay không
                        submitLogoutForm();
                    },
                    error: function(xhr, status, error) {
                        console.error('Lỗi khi kết thúc phiên tư vấn:', { status, error, responseText: xhr.responseText });
                        // Tiếp tục đăng xuất dù có lỗi
                        submitLogoutForm();
                    }
                });
            } else {
                // Không có phiên tư vấn cần kết thúc, đăng xuất ngay
                submitLogoutForm();
            }
        },
        error: function(xhr, status, error) {
            console.error('Lỗi khi kiểm tra trạng thái phiên tư vấn:', { status, error, responseText: xhr.responseText });
            // Tiếp tục đăng xuất nếu không thể kiểm tra trạng thái
            submitLogoutForm();
        }
    });
  });

  // Xử lý khi ấn vào tài khoản
  $(document).on("click", ".taikhoan", function (e) {
    e.preventDefault();
    const $form = $(`
      <form id="taikhoan" action="/baocao/user/submit" method="POST" style="display: none;">
        <input type="hidden" name="taikhoan">
      </form>
    `);
  
    // Thêm form vào body
    $("body").append($form);
  
    // Gửi form
    $form.submit();
  });




  // // Menu danh mục sản phẩm
  $(".big-menu .list").click(function () {
    $(".menu-dropdown, .menu-overlay").addClass("active");
    const defaultCategory = "monthethao";
    $(".menu-dropdown-left-top button").removeClass("active");
    $(
      `.menu-dropdown-left-top button[data-category="${defaultCategory}"]`
    ).addClass("active");
    $(".menu-item").hide();
    $(`.menu-item[data-category="${defaultCategory}"]`).fadeIn();
  });

  $(".menu-overlay").click(function () {
    $(".menu-dropdown, .menu-overlay").removeClass("active");
  });

  $(".menu-dropdown-left-top button").click(function () {
    const category = $(this).data("category");
    $(".menu-dropdown-left-top button").removeClass("active");
    $(this).addClass("active");
    $(".menu-item").hide();
    $(`.menu-item[data-category="${category}"]`).fadeIn();
  });

  // // Responsive menu
  // function updateMenuButton() {
  //   if ($(window).width() <= 768) {
  //     if (!$(".menu-in-dropdown").find(".plus-icon").length) {
  //       $(".menu-in-dropdown").append('<span class="plus-icon">+</span>');
  //     }
  //     if (
  //       !$(".menu-dropdown-left-bot .menu-item .item:first-child").find(
  //         ".plus-icon"
  //       ).length
  //     ) {
  //       $(".menu-dropdown-left-bot .menu-item .item:first-child").append(
  //         '<span class="plus-icon">+</span>'
  //       );
  //     }
  //   } else {
  //     $(".menu-in-dropdown .plus-icon").remove();
  //     $(
  //       ".menu-dropdown-left-bot .menu-item .item:first-child .plus-icon"
  //     ).remove();
  //   }
  // }
  function updateMenuButton() {
    if ($(window).width() <= 768) {
        // Thêm plus-icon cho .menu-in-dropdown
        if (!$(".menu-in-dropdown").find(".plus-icon, .minus-icon").length) {
            $(".menu-in-dropdown").append('<span class="plus-icon"></span>');
        }
        // Thêm plus-icon cho .menu-item .item:first-child
        if (!$(".menu-dropdown-left-bot .menu-item .item:first-child").find(".plus-icon, .minus-icon").length) {
            $(".menu-dropdown-left-bot .menu-item .item:first-child").append('<span class="plus-icon"></span>');
        }
    } else {
        // Xóa cả plus-icon và minus-icon khi màn hình lớn hơn 768px
        $(".menu-in-dropdown .plus-icon, .menu-in-dropdown .minus-icon").remove();
        $(".menu-dropdown-left-bot .menu-item .item:first-child .plus-icon, .menu-dropdown-left-bot .menu-item .item:first-child .minus-icon").remove();
    }
  }
  updateMenuButton();
  $(window).resize(updateMenuButton);


// Xử lý click vào plus-icon/minus-icon trong .menu-in-dropdown
$(document).on("click", ".menu-in-dropdown .plus-icon, .menu-in-dropdown .minus-icon", function (event) {
  if ($(window).width() > 768) return;
  event.stopPropagation();

  const $icon = $(this);
  if ($icon.hasClass("plus-icon")) {
      // Mở menu và chuyển sang minus-icon
      $icon.removeClass("plus-icon").addClass("minus-icon");
      $(".back-button").fadeIn();
      $(".menu-dropdown-left-top").removeClass("active").hide();
      $(".menu-dropdown-right-bot").removeClass("active").hide();
      $(".menu-dropdown-left-bot").addClass("active").fadeIn();
      if (!$(".menu-dropdown-left-bot").find(".back-button").length) {
          $(".menu-dropdown-left-bot").prepend('<button class="back-button"> ← BACK </button>');
      }
  } else {
      // Thu gọn menu và chuyển về plus-icon
      $icon.removeClass("minus-icon").addClass("plus-icon");
      $(".menu-dropdown-left-bot").removeClass("active").hide();
      $(".menu-dropdown-left-top").addClass("active").fadeIn();
      $(".menu-dropdown-right-bot").addClass("active").fadeIn();
      $(".back-button").hide();
  }
});

// Xử lý click vào plus-icon/minus-icon trong .menu-item .item:first-child
$(document).on("click", ".menu-dropdown-left-bot .menu-item .item:first-child .plus-icon, .menu-dropdown-left-bot .menu-item .item:first-child .minus-icon", function (event) {
  if ($(window).width() > 768) return;
  event.preventDefault();
  event.stopPropagation();

  const $icon = $(this);
  const $parentMenuItem = $icon.closest(".menu-item");
  if ($icon.hasClass("plus-icon")) {
      // Mở menu con và chuyển sang minus-icon
      $icon.removeClass("plus-icon").addClass("minus-icon");
      $(".back-button").hide();
      $(".sub-back-button").fadeIn();
      $parentMenuItem.find(".item:not(:first-child)").addClass("active").fadeIn();
      if (!$(".menu-dropdown-left-bot").find(".sub-back-button").length) {
          $(".menu-dropdown-left-bot").prepend('<button class="sub-back-button"> ← BACK </button>');
      }
  } else {
      // Thu gọn menu con và chuyển về plus-icon
      $icon.removeClass("minus-icon").addClass("plus-icon");
      $parentMenuItem.find(".item:not(:first-child)").removeClass("active").hide();
      $(".sub-back-button").hide();
      $(".back-button").fadeIn();
  }
});

// Xử lý nút Back
$(document).on("click", ".menu-dropdown-left-bot .back-button", function (event) {
  event.preventDefault();
  event.stopPropagation();
  if ($(window).width() > 768) return;

  // Chuyển minus-icon về plus-icon cho .menu-in-dropdown
  $(".menu-in-dropdown .minus-icon").removeClass("minus-icon").addClass("plus-icon");
  $(".menu-dropdown-left-bot").removeClass("active").hide();
  $(".menu-dropdown-left-top").addClass("active").fadeIn();
  $(".menu-dropdown-right-bot").addClass("active").fadeIn();
  $(".back-button").hide();
});

// Xử lý nút Sub-back
$(document).on("click", ".menu-dropdown-left-bot .sub-back-button", function (event) {
  event.preventDefault();
  event.stopPropagation();
  if ($(window).width) return;

  // Chuyển minus-icon về plus-icon cho .menu-item .item:first-child
  const $activeMenuItem = $(".menu-dropdown-left-bot .menu-item .item:first-child .minus-icon");
  $activeMenuItem.removeClass("minus-icon").addClass("plus-icon");
  $(".menu-dropdown-left-bot .menu-item .item:first-child").removeClass("active");
  $(".menu-dropdown-left-bot .menu-item").find(".item:not(:first-child)").removeClass("active").hide();
  $(".sub-back-button").hide();
  $(".back-button").fadeIn();
});

  function htmlEscape(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
  }

  // Load header
  window.updateCart = function() {
          let cart = window.isLoggedIn ? window.cartFromDatabase : JSON.parse(localStorage.getItem("cart")) || [];
          console.log("updateCart:", { isLoggedIn: window.isLoggedIn, cart, cartFromDatabase: window.cartFromDatabase }); // Debug
          const cartItems = $('#cart-popup-items');
          const cartTotal = $('#cart-popup-total');
          const cartCount = $('.cart-count'); // Sử dụng lại .cart-count
          const checkoutButton = $('.cart-popup-content .checkout-btn');
          let total = 0;
          let itemCount = 0;
          if (cartItems.length && cartTotal.length) {
            cartItems.empty();
    
            if (cart.length === 0) {
                cartItems.append('<li style="padding: 10px; text-align: center;">Giỏ hàng trống!</li>');
                cartTotal.text('0đ');
                cartCount.text('0');
                checkoutButton.hide();
            } else {
                // checkoutButton.fadeIn();
                if (checkoutButton.length) {
                  checkoutButton.fadeIn();
                }
                cart.forEach((item, index) => {
                    const price = parseFloat(item.price.toString().replace(/,/g, ""));
                    // const itemTotal = item.price * item.quantity;
                    const itemTotal = price * item.quantity;
                    total += itemTotal;
                    itemCount += item.quantity;
                    // const imageSrc = window.isLoggedIn ? `../img/${item.image}` : item.image;
                    // const imageSrc = `../img/${item.image}`;
                    // Hàm lấy tên file từ đường dẫn
                    const getBaseName = (path) => {
                      return path.split('/').pop();
                    };
                    // Mã hóa item.name cho thuộc tính data-name
                    const escapedName = htmlEscape(item.name);

                    // Tạo imageSrc với tên file
                    const imageSrc = `/baocao/view/img/${getBaseName(item.image)}`;
                    cartItems.append(`
                        <li data-index="${index}">
                            <img src="${imageSrc}" alt="${item.name}">
                            <div class="cart-item-info">
                                <span class="cart-item-name" data-name="${escapedName}" style="cursor: pointer;">${item.name}</span>
                                <span class="cart-item-size">Size: ${item.size || 'N/A'}</span>
                                <div class="cart-item-quantity">
                                    <button class="decrease-quantity">-</button>
                                    <span>${item.quantity}</span>
                                    <button class="increase-quantity">+</button>
                                </div>
                            </div>
                            <span class="item-price">${itemTotal.toLocaleString()}đ</span>
                            <button class="cart-item-remove">×</button>
                        </li>
                    `);
                });
                cartTotal.text(total.toLocaleString() + 'đ');
                cartCount.text(itemCount);
            }

            if (typeof window.renderCart === 'function') {
              window.renderCart();
            }

            // Thêm sự kiện click cho product-name
          document.querySelectorAll('.cart-item-name').forEach(nameElement => {
            nameElement.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Lấy giá trị gốc (không mã hóa) từ textContent
                const productName = this.textContent.trim();
                  // Xóa input cũ
                  $("#productForm input[name='product_name']").remove();

                  let hiddenInput = $("<input>")
                      .attr("type", "hidden")
                      .attr("name", "product_name")
                      .val(productName);

                  $("#productForm").append(hiddenInput);
                  $("#productForm").submit();
                });
            });
        }
  };
  
  window.updateCart();

  // Hàm chung để cập nhật số lượng
function updateQuantity(index, action) {
let cart = window.isLoggedIn ? window.cartFromDatabase : JSON.parse(localStorage.getItem('cart')) || [];
const item = cart[index];
console.log("updateQuantity được gọi:", { index, action });

if (!item) {
    console.error('Không tìm thấy sản phẩm tại index:', index);
    return;
}

if (action === 'increase') {
  cart[index].quantity += 1;
  // cart[index].quantity = newQuantity;
} else if (action === 'decrease') {
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
        // cart[index].quantity = newQuantity;
    } else {
        cart.splice(index, 1);
    }
}

if (cart[index].quantity <= 0) {
    // Nếu số lượng <= 0, xóa sản phẩm
    if (isLoggedIn) {
        $.ajax({
            url: "/baocao/user/submit",
            type: "POST",
            dataType: "json",
            data: {
                remove_from_cart: true,
                product_name: item.name,
                size: item.size || 'N/A'
            },
            success: function (response) {
                if (response.success) {
                    cartFromDatabase.splice(index, 1);
                    window.updateCart();
                    if (typeof window.renderCart === 'function') {
                        window.renderCart();
                    }
                } else {
                    console.warn("Lỗi xóa sản phẩm:", response.message);
                }
            },
            error: function (xhr, status, error) {
                console.warn("Lỗi xóa DB:", status, error);
            }
        });
    } else {
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.updateCart();
        if (typeof window.renderCart === 'function') {
            window.renderCart();
        }
    }
    return;
}

// Cập nhật số lượng
if (isLoggedIn) {
    $.ajax({
        url: "/baocao/user/submit",
        type: "POST",
        dataType: "json",
        data: {
            update_cart: true,
            product_name: item.name,
            size: item.size || 'N/A',
            quantity: item.quantity
        },
        success: function (response) {
          // console.log("Cập nhật DB:", response);
            if (response.success) {
                // cartFromDatabase[index].quantity = newQuantity;
                window.updateCart();
                if (typeof window.renderCart === 'function') {
                    window.renderCart();
                }
            } else {
                console.warn("Lỗi cập nhật số lượng:", response.message);
            }
        },
        error: function (xhr, status, error) {
            console.warn("Lỗi cập nhật số lượng:", status, error);
        }
    });
} else {
    // cart[index].quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCart();
    if (typeof window.renderCart === 'function') {
        window.renderCart();
    }
}
}

// Xử lý sự kiện tăng/giảm số lượng
$('#cart-popup-items').on('click', '.increase-quantity, .decrease-quantity', function (e) {
  e.preventDefault();
  const index = $(this).closest('li').data('index');
  const action = $(this).hasClass('increase-quantity') ? 'increase' : 'decrease';
  updateQuantity(index, action);
});

// Xóa sản phẩm
$('#cart-popup-items').on('click', '.cart-item-remove', function (e) {
  e.preventDefault();
  const index = $(this).closest('li').data('index');
  let cart = isLoggedIn ? cartFromDatabase : JSON.parse(localStorage.getItem('cart')) || [];
  const removedItem = cart[index];

  if (index >= 0 && index < cart.length) {
      if (isLoggedIn) {
          $.ajax({
              url: "/baocao/user/submit",
              type: "POST",
              dataType: "json",
              data: {
                  remove_from_cart: true,
                  product_name: removedItem.name,
                  size: removedItem.size || 'N/A'
              },
              success: function (response) {
                if (response.success) {
                  cartFromDatabase.splice(index, 1);
                  window.updateCart();
                  if (typeof window.renderCart === 'function') {
                      window.renderCart();
                  }
                } else {
                    console.warn("Lỗi xóa sản phẩm:", response.message);
                }
              },
              error: function (xhr, status, error) {
                  console.warn("Lỗi xóa DB:", status, error);
              }
          });
      } else {
          cart.splice(index, 1);
          localStorage.setItem('cart', JSON.stringify(cart));
          window.updateCart();
          if (typeof window.renderCart === 'function') {
              window.renderCart();
          }
      }
  } else {
      console.error('Index không hợp lệ:', index);
  }
});



  function fetchProducts(query = "") {
    return fetch("/baocao/user/submit", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `get_products_for_search=true&query=${encodeURIComponent(query)}`,
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error("Error fetching products:", error);
        return [];
      });
  }

  // Hàm hiển thị gợi ý sản phẩm
  function showSuggestions(products, suggestionsContainer) {
    suggestionsContainer.empty();

    if (products.length === 0) {
      suggestionsContainer.removeClass("active");
      return;
    }

    // Giới hạn tối đa 6 sản phẩm
    const limitedProducts = products.slice(0, 6);
    limitedProducts.forEach((product) => {
      suggestionsContainer.append(`
        <a href="#" class="suggestion-item" data-id="${product.id}">
          <img src="/baocao/view/img/${product.image}" alt="${product.name}">
          <div class="suggestion-info">
            <h4>${product.name}</h4>
            <p>${new Intl.NumberFormat('en-US').format(product.price)}đ</p>
          </div>
        </a>
      `);
    });

    suggestionsContainer.addClass("active");
  }

  // Hiển thị tối đa 6 sản phẩm khi nhấn vào thanh tìm kiếm (cả desktop và mobile)
  $("#search-input, #search-input-mobile").on("focus", function () {
    const suggestionsContainer = $(this).siblings(".search-suggestions");
    fetchProducts().then((products) => {
      showSuggestions(products, suggestionsContainer);
    });
  });

  // Ẩn gợi ý khi nhấn ra ngoài (cả desktop và mobile)
  $(document).on("click", function (event) {
    if (!$(event.target).closest(".search-container").length) {
      $(".search-suggestions").removeClass("active");
    }
  });

  // Lọc sản phẩm khi người dùng nhập ký tự (cả desktop và mobile)
  $("#search-input, #search-input-mobile").on("input", function () {
    const query = $(this).val().toLowerCase();
    const suggestionsContainer = $(this).siblings(".search-suggestions");
    fetchProducts(query).then((products) => {
      showSuggestions(products, suggestionsContainer);
    });
  });

  // Xử lý khi nhấn vào một gợi ý (cả desktop và mobile)
  $(document).on("click", ".suggestion-item", function (e) {
    e.preventDefault(); // Ngăn hành vi mặc định của liên kết (nếu có)

    const productName = $(this).find("h4").text().trim(); // Lấy tên sản phẩm từ <h4>
    console.log(productName);

    // Xóa input cũ (nếu có) để tránh gửi nhiều input cùng tên
    $("#suggestionForm input[name='product_name']").remove();

    // Tạo input ẩn chứa product_name
    const hiddenInput = $("<input>")
        .attr("type", "hidden")
        .attr("name", "product_name")
        .val(productName);

    // Thêm input vào form ẩn
    $("#suggestionForm").append(hiddenInput);

    // Gửi form
    $("#suggestionForm").submit();
  });

  // Nhấn Enter trong thanh tìm kiếm
  $("#search-input, #search-input-mobile").on("keypress", function (e) {
    if (e.which === 13) {
      // Phím Enter
      e.preventDefault();
      handleSearch($(this));
    }
  });

  // Click vào biểu tượng kính lúp
  $(".search-icon").on("click", function () {
    const inputElement = $(this).siblings("input");
    console.log("Search icon clicked, input element:", inputElement); // Debug: Kiểm tra sự kiện click và inputElement
    console.log("Input value before handling:", inputElement.val()); // Debug: Kiểm tra giá trị nhập vào
    handleSearch(inputElement);
  });

  //menu-right-bot
  document.querySelector('.top').addEventListener('click', function(event) {
    event.preventDefault(); // Ngăn hành vi mặc định của thẻ <a>
    document.getElementById('all-product-form').submit(); // Gửi form
  });

  // Hàm handleSearch (đã cải tiến và thêm debug)
  function handleSearch(inputElement) {
    const query = inputElement.val().trim();
    console.log("handleSearch called with query:", query); // Debug: Kiểm tra query sau khi trim

    if (!query) {
        console.log("Query is empty, showing alert"); // Debug: Xác nhận trường hợp query rỗng
        alert("Vui lòng nhập từ khóa tìm kiếm!");
        return;
    }

    const requestBody = `get_products_for_search=true&query=${encodeURIComponent(query)}`;
    console.log("Sending fetch request with body:", requestBody); // Debug: Kiểm tra body của request

    fetch("/baocao/user/submit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: requestBody,
    })
        .then((response) => {
            console.log("Fetch response received:", response); // Debug: Kiểm tra response gốc
            return response.json();
        })
        .then((products) => {
            console.log("Parsed products data:", products); // Debug: Kiểm tra dữ liệu products sau khi parse
            if (products.length === 0) {
                console.log(`No products found for query "${query}"`); // Debug: Xác nhận không tìm thấy sản phẩm
                alert(`Không tìm thấy sản phẩm nào phù hợp với từ khóa "${query}"!`);
            }else{
              console.log(`Found ${products.length} products for query "${query}", redirecting...`); // Debug: Xác nhận tìm thấy sản phẩm
              // Chuyển hướng đến trangchude.php với query trong URL
              window.location.href = `/baocao/trangchude/${encodeURIComponent(query)}`;
            }
        })
        .catch((error) => {
            console.error("Error during search:", error); // Debug: Lỗi nếu fetch thất bại
            alert("Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau!");
        });
  }

  $(".menu-dropdown-right-bot .menu-option .item").on(
    "click",
    function (event) {
      event.preventDefault();
      const category = $(this).data("category");
      const categorySlug = addHyphen(category);

      fetch("/baocao/user/submit", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `selected_sport1=${encodeURIComponent(
          category
        )}&from_category_nav=true`,
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          if (data.success) {
              window.location.href = `/baocao/trangchude/${encodeURIComponent(categorySlug)}`;
          } else {
              console.error("Error fetching products:", data.message); // Debug: Lỗi từ server
          }
        })
        .catch((error) => console.error("Lỗi fetch:", error));
    }
  );

  $(document).ready(function() {
      $(".menu-item a").on("click", function(event) {
        event.preventDefault(); // Ngăn chặn điều hướng mặc định
        // Kiểm tra kích thước màn hình
        const screenWidth = $(window).width();

        // Kiểm tra nếu đây là thẻ <a> đầu tiên trong .menu-item
        const isFirstChild = $(this).is(":first-child");

        // Nếu màn hình nhỏ hơn 1200px và là thẻ <a> đầu tiên, không làm gì cả
        if (screenWidth < 1200 && isFirstChild) {
            return; // Thoát khỏi hàm, không gửi form
        }
        // Đảm bảo không áp dụng cho nút "Back" hoặc "Sub-back"
        if ($(this).hasClass("back-button") || $(this).hasClass("sub-back-button")) {
          return; // Thoát khỏi hàm nếu là nút Back
        }
  
        let selectedId = $(this).attr("id"); // Lấy id của thẻ <a> được nhấn
        
        // Nếu thẻ <a> không có id, không làm gì cả
        if (!selectedId) return;
  
        // Xóa input ẩn cũ nếu có
        $("#sportsForm input[name='selected_sport']").remove();
  
        // Tạo input ẩn mới để gửi id
        let hiddenInput = $("<input>")
          .attr("type", "hidden")
          .attr("name", "selected_sport")
          .val(selectedId);
  
        $("#sportsForm").append(hiddenInput);

        $("#sportsForm").submit();
      });
  });

  $(document).ready(function() {
    $(".hidden").on("click", function(event) {
      event.preventDefault(); // Ngăn chặn điều hướng mặc định

      let selectedId = $(this).attr("id"); // Lấy id của thẻ <a> được nhấn
      
      // Nếu thẻ <a> không có id, không làm gì cả
      if (!selectedId) return;

      // Xóa input ẩn cũ nếu có
      $("#sportsForm input[name='selected_sport']").remove();

      // Tạo input ẩn mới để gửi id
      let hiddenInput = $("<input>")
        .attr("type", "hidden")
        .attr("name", "selected_sport")
        .val(selectedId);

      $("#sportsForm").append(hiddenInput);

      $("#sportsForm").submit();
    });
  });

  document.getElementById('checkout-form1').addEventListener('submit', function(e) {
  e.preventDefault(); // Ngăn chặn gửi form ngay lập tức để xử lý dữ liệu
  e.stopPropagation();
  try {
      console.log('Đã bấm submit');
      // Lấy dữ liệu giỏ hàng từ localStorage
      let cart = isLoggedIn ? cartFromDatabase : JSON.parse(localStorage.getItem('cart')) || [];

      // Tạo object chứa thông tin giỏ hàng và mã giảm giá
      const cartData = {
          items: cart,
          appliedVoucher: window.appliedVoucher || null
      };

      // Lưu dữ liệu vào input ẩn
      const cartDataInput = document.getElementById('cart-data1');
      cartDataInput.value = JSON.stringify(cartData);

      // Debug: In dữ liệu ra console
      console.log('Cart data before submitting form:', cartData);

      // Gửi form
      this.submit();
  } catch (error) {
      console.error('Error preparing cart data:', error);
      alert('Có lỗi xảy ra khi xử lý giỏ hàng. Vui lòng thử lại.');
  }
});

});



  
