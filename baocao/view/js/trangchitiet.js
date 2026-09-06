// Product Image Gallery with enhanced zoom functionality
function changeImage(element) {
  const mainImage = document.getElementById("mainImage");

  // Add fade transition
  mainImage.style.opacity = 0.6;

  setTimeout(() => {
    mainImage.src = element.src;

    // Reset thumbnails and set active
    const thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb) => thumb.classList.remove("active"));
    element.classList.add("active");

    // Update current index for arrow navigation
    const thumbArray = Array.from(thumbnails);
    currentIndex = thumbArray.indexOf(element);

    // Restore opacity
    mainImage.style.opacity = 1;

    // Initialize zoom after image change
    setTimeout(imageZoom, 200);
  }, 200);
}

// Size Selector
function selectSize(element, size) {
  const sizeOptions = document.querySelectorAll(".size-btn");
  sizeOptions.forEach((option) => option.classList.remove("active"));
  element.classList.add("active");
  document.getElementById("selectedSize").textContent = size;
}

// Quantity Controls
function increaseQuantity() {
  const quantityInput = document.getElementById("quantity");
  const currentQuantity = parseInt(quantityInput.value);
  // Set reasonable upper limit
  if (currentQuantity < 99) {
    quantityInput.value = currentQuantity + 1;
  }
}

function decreaseQuantity() {
  const quantityInput = document.getElementById("quantity");
  const currentQuantity = parseInt(quantityInput.value);
  if (currentQuantity > 1) {
    quantityInput.value = currentQuantity - 1;
  }
}

function imageZoom() {
  const mainImage = document.getElementById("mainImage");
  const zoomLens = document.querySelector(".zoom-lens");
  const zoomResult = document.querySelector(".zoom-result");

  if (!mainImage || !zoomLens || !zoomResult) return;

  // Cấu hình kích thước
  const lensSize = 100;
  const resultSize = 300;
  zoomLens.style.width = `${lensSize}px`;
  zoomLens.style.height = `${lensSize}px`;
  zoomResult.style.width = `${resultSize}px`;
  zoomResult.style.height = `${resultSize}px`;

  // Tính tỉ lệ zoom
  const cx = resultSize / lensSize;
  const cy = resultSize / lensSize;

  // Xóa event listeners cũ
  mainImage.removeEventListener("mousemove", moveLens);
  mainImage.removeEventListener("mouseenter", showZoom);
  mainImage.removeEventListener("mouseleave", hideZoom);
  mainImage.removeEventListener("touchmove", handleTouchMove);
  mainImage.removeEventListener("touchstart", showZoom);
  mainImage.removeEventListener("touchend", hideZoom);

  // Khởi tạo khi ảnh đã load
  function setupZoom() {
    zoomResult.style.backgroundImage = `url('${mainImage.src}')`;
    zoomResult.style.backgroundSize = `${mainImage.width * cx}px ${
      mainImage.height * cy
    }px`;

    // Thêm event listeners - đảm bảo mouseenter trigger ngay khi hover
    mainImage.addEventListener("mousemove", moveLens);
    mainImage.addEventListener("mouseenter", showZoom); // This event shows zoom on hover
    mainImage.addEventListener("mouseleave", hideZoom);

    // Thêm support cho touch devices
    mainImage.addEventListener("touchmove", handleTouchMove);
    mainImage.addEventListener("touchstart", showZoom);
    mainImage.addEventListener("touchend", hideZoom);
  }

  if (mainImage.complete) {
    setupZoom();
  } else {
    mainImage.onload = setupZoom;
  }

  function showZoom(e) {
    if (window.innerWidth <= 992) return; // Không hiển thị trên mobile
    zoomLens.style.display = "block";
    zoomResult.style.display = "block";
    moveLens(e); // Gọi ngay moveLens để zoom hiển thị tức thì khi rê chuột
  }

  function hideZoom() {
    zoomLens.style.display = "none";
    zoomResult.style.display = "none";
  }

  function moveLens(e) {
    e.preventDefault();
    if (window.innerWidth <= 992) return;

    const pos = getCursorPos(e);
    const imgRect = mainImage.getBoundingClientRect();

    // Tính vị trí của zoom lens
    let lensX = pos.x - lensSize / 2;
    let lensY = pos.y - lensSize / 2;

    lensX = Math.max(0, Math.min(lensX, imgRect.width - lensSize));
    lensY = Math.max(0, Math.min(lensY, imgRect.height - lensSize));

    zoomLens.style.left = `${lensX}px`;
    zoomLens.style.top = `${lensY}px`;

    // Tính vị trí nền của zoom result
    const bgX = lensX * cx;
    const bgY = lensY * cy;
    zoomResult.style.backgroundPosition = `-${bgX}px -${bgY}px`;

    // Tính toán vị trí động cho zoom result
    const resultX = pos.x + 20;
    const resultY = pos.y + 20;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = resultX;
    let adjustedY = resultY;

    if (resultX + resultSize > viewportWidth) {
      adjustedX = resultX - resultSize - 40;
    }
    if (resultY + resultSize > viewportHeight) {
      adjustedY = viewportHeight - resultSize - 10;
    }
    if (adjustedX < 0) adjustedX = 10;
    if (adjustedY < 0) adjustedY = 10;

    zoomResult.style.left = `${adjustedX}px`;
    zoomResult.style.top = `${adjustedY}px`;
  }

  function handleTouchMove(e) {
    if (e.touches.length > 0) {
      moveLens(e.touches[0]);
    }
  }

  function getCursorPos(e) {
    const rect = mainImage.getBoundingClientRect();
    const x = e.pageX - rect.left - window.pageXOffset;
    const y = e.pageY - rect.top - window.pageYOffset;
    return { x, y };
  }
}

// Single DOMContentLoaded Event Listener
document.addEventListener("DOMContentLoaded", function () {
  // Main image navigation
  const prev = document.querySelector(".nav-arrow.prev");
  const next = document.querySelector(".nav-arrow.next");
  const thumbnails = document.querySelectorAll(".thumbnail");
  let currentIndex = 0;

  prev.addEventListener("click", function () {
    currentIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
    changeImage(thumbnails[currentIndex]);
  });

  next.addEventListener("click", function () {
    currentIndex = (currentIndex + 1) % thumbnails.length;
    changeImage(thumbnails[currentIndex]);
  });

  // Validate quantity input
  const quantityInput = document.getElementById("quantity");
  quantityInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
    if (this.value === "" || parseInt(this.value) < 1) {
      this.value = "1";
    }
  });

  // Add to cart button
  const addToCartBtn = document.querySelector(".add-to-cart");
  addToCartBtn.addEventListener("click", function () {
    // console.log("CLick add to cart");
    const sizeSelector = document.querySelector(".size-selector");
    let selectedSize = null;
    let quantity = document.getElementById("quantity").value;

    // Chỉ lấy selectedSize nếu size-selector tồn tại
    if (sizeSelector) {
      selectedSize = document.getElementById("selectedSize").textContent;
      if (!selectedSize) {
        alert("Vui lòng chọn kích thước!");
        return;
      }
    }

    // Lấy thông tin sản phẩm từ DOM
    const productName = document.querySelector(".product-title").textContent.trim();
    const productPrice = document.querySelector(".price").textContent;
    const productPrice2 = parseInt(productPrice.replace('đ', '').replace(',', ''));
    const productImage = document.getElementById("mainImage").src;

    // Thêm vào giỏ hàng
    addToCart(productName, productPrice2, selectedSize, parseInt(quantity), productImage);
  });

  // Initialize image zoom
  imageZoom();

  // Cập nhật zoom khi thay đổi kích thước cửa sổ
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(imageZoom, 250);
  });

  // Gửi yêu cầu tăng lượt xem
  const productHeader = document.querySelector(".product-header");
  if (productHeader) {
    const table = productHeader.dataset.table;
    const productId = productHeader.dataset.productId;

    if (table && productId) {
      fetch("/baocao/user/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `increment_view=1&table=${table}&product_id=${productId}`,
      });
    }
  }
  //hiện tên đầy đủ sản phẩm
  function setupProductTooltips() {
    document.querySelectorAll(".product-card").forEach((card) => {
      const titleElement = card.querySelector(".related-name");
      if (!titleElement) return;

      const fullTitle = titleElement.textContent.trim();

      const tooltip = document.createElement("div");
      tooltip.className = "full-title-tooltip";
      tooltip.textContent = fullTitle;

      // titleElement.appendChild(tooltip);
      titleElement.setAttribute("title", fullTitle);
    });
  }

  setupProductTooltips();

  // Lấy top sản phẩm được quan tâm
  fetch("/baocao/user/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "get_top_viewed_products=1&limit=4",
  })
    .then((response) => response.json())
    .then((data) => {
      // Cập nhật session và hiển thị sản phẩm mới
      fetch("/baocao/user/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body:
          "update_top_viewed_session=1&data=" +
          encodeURIComponent(JSON.stringify(data)),
      });
    })
    .catch((error) => console.error("Error:", error));
  // Thêm sự kiện click cho các sản phẩm liên quan
  document.querySelectorAll(".related-items .product-card").forEach((card) => {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      const form = this.querySelector(".product-form");
      if (form) form.submit();
    });
  });
});

function addToCart(name, price, size, quantity, image) {
    // Chuẩn hóa size
    const normalizedSize = (size && size.trim() !== "") ? size : "N/A";
    const imageFileName = image.split('/').pop();

    if (!window.isLoggedIn) {
        // Chưa đăng nhập: Lưu vào localStorage
        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        // Chuẩn hóa size của các mục hiện có trong giỏ hàng
        cart = cart.map(item => ({
            ...item,
            size: (item.size && item.size.trim() !== "") ? item.size : "N/A"
        }));

        const existingItem = cart.find(item => item.name === name && item.size === normalizedSize);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                name: name,
                price: price,
                size: normalizedSize,
                quantity: quantity,
                image: image
            });
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        if (typeof window.updateCart === 'function') {
            window.updateCart();
            console.log("Đã gọi window.updateCart");
        }
        if (typeof window.renderCart === 'function') {
            window.renderCart();
        }
        alert(`Đã thêm "${name}" ${normalizedSize !== "N/A" ? `(Size: ${normalizedSize})` : ""} (Số lượng: ${quantity}) vào giỏ hàng!`);
    } else {
        // Đã đăng nhập: Thêm vào database
        $.ajax({
            url: "/baocao/user/submit",
            type: "POST",
            dataType: "json",
            data: {
                add_to_cart: true,
                product_name: name,
                price: price,
                size: normalizedSize,
                quantity: quantity,
                image: imageFileName
            },
            success: function(response) {
                if (response.success) {
                    const newItem = {
                        name: name,
                        price: price,
                        size: normalizedSize,
                        quantity: quantity,
                        image: imageFileName
                    };
                    if (!Array.isArray(window.cartFromDatabase)) {
                        window.cartFromDatabase = [];
                    }
                    // Chuẩn hóa size của các mục hiện có trong window.cartFromDatabase
                    window.cartFromDatabase = window.cartFromDatabase.map(item => ({
                        ...item,
                        size: (item.size && item.size.trim() !== "") ? item.size : "N/A"
                    }));

                    const existingItem = window.cartFromDatabase.find(
                        item => item.name === name && item.size === normalizedSize
                    );
                    if (existingItem) {
                        existingItem.quantity += quantity;
                    } else {
                        window.cartFromDatabase.push(newItem);
                    }
                    console.log("window.cartFromDatabase sau khi thêm:", window.cartFromDatabase);
                    alert(`Đã thêm "${name}" ${normalizedSize !== "N/A" ? `(Size: ${normalizedSize})` : ""} (Số lượng: ${quantity}) vào giỏ hàng!`);
                    if (typeof window.updateCart === 'function') {
                        window.updateCart();
                        console.log("Đã gọi window.updateCart");
                    }
                    if (typeof window.renderCart === 'function') {
                        window.renderCart();
                    }
                } else {
                    console.warn("Thất bại:", response.message);
                    alert(`Lỗi khi thêm vào giỏ hàng: ${response.message}`);
                }
            },
            error: function(xhr, status, error) {
                console.error("Lỗi AJAX:", status, error);
                alert(`Đã thêm vào giỏ hàng tạm thời. Vui lòng kiểm tra kết nối.`);
            }
        });
    }
}
