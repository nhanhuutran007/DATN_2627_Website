document.addEventListener("DOMContentLoaded", function () {
  const sortSelect = document.getElementById("sort-select");
  const priceFilterDropdown = document.getElementById("price-filter");
  const typeFilterDropdown = document.getElementById("type-filter");
  const brandFilterDropdown = document.getElementById("brand-filter");
  const productsContainer = document.getElementById("productContainer");
  const productCards = Array.from(
    productsContainer.getElementsByClassName("product-card")
  );
  const navItems = document.querySelectorAll(".nav-item");
  const productsPerPage = 12;
  let currentPage = 1;
  let filteredCards = [...productCards];
  let initialProductCards = [...productCards];

  function convertPriceToNumber(priceText) {
    const text = typeof priceText === 'string' ? priceText.trim() : priceText.textContent.trim();
    if (!text) return 0; // Xử lý trường hợp chuỗi rỗng
    return parseInt(text.replace('đ', '').replace(/,/g, '')) || 0;
  }
  // const productPrice2 = parseInt(productPrice.replace('đ', '').replaceAll(',', ''));

  function applyFilters() {
    const priceRange = priceFilterDropdown.value;
    const typeFilter = typeFilterDropdown.value;
    const brandFilter = brandFilterDropdown.value;

    // Debug: Ghi log các giá trị bộ lọc
    console.log("Applying filters:", {
        priceRange,
        typeFilter,
        brandFilter
    });
    // Nếu tất cả bộ lọc đều rỗng, khôi phục danh sách sản phẩm ban đầu
    if (!priceRange && !typeFilter && !brandFilter) {
      console.log("All filters are empty, restoring initial products");
      filteredCards = [...initialProductCards];
      currentPage = 1;
      showProductsAndPagination();
      return;
    }

    // Kiểm tra nếu cần gửi AJAX (ví dụ: không có sản phẩm phù hợp)
    if (typeFilter || brandFilter) {
        console.log("Sending AJAX request with data:", {
            filter_products: true,
            type_filter: typeFilter,
            brand_filter: brandFilter
        });

        $.ajax({
            url: "/baocao/user/submit",
            type: "POST",
            dataType: "json",
            data: {
                filter_products: true,
                type_filter: typeFilter,
                brand_filter: brandFilter
            },
            success: function(response) {
                // Debug: Ghi log phản hồi từ server
                console.log("AJAX success response:", response);

                if (response.success) {
                    // Cập nhật productCards với dữ liệu mới
                    productsContainer.innerHTML = "";
                    productCards.length = 0;
                    response.products.forEach(product => {
                        const card = document.createElement("div");
                        card.className = "product-card";
                        card.setAttribute("data-title", product.name);
                        card.setAttribute("data-table", product.table_name);
                        card.setAttribute("data-brand", product.brand);
                        card.innerHTML = `
                            <form class="productForm" action="/baocao/user/submit" method="POST" style="display: inline;">
                                <input type="hidden" name="product_name" id="productNameInput">
                                <img src="/baocao/view/img/${product.image}" alt="Sản phẩm">
                                <div class="product-title">${product.name}</div>
                               <div class="product-footer">
                                  <div class="price-container">
                                    <div class="product-price">${new Intl.NumberFormat('en-US').format(product.price)}đ</div>
                                    <div class="old-price">${product.oprice > 0 ? new Intl.NumberFormat('en-US').format(product.oprice)+ "đ": ""}</div>
                                  </div>
                                  <button class="add-to-cart-btn" title="Thêm vào giỏ hàng" data-product-name="${product.name}">
                                    <i class="bi bi-cart-plus"></i>
                                  </button>
                                </div>
                            </form>
                        `;
                        productsContainer.appendChild(card);
                        productCards.push(card);
                    });

                    // Debug: Ghi log số lượng productCards sau khi cập nhật
                    console.log("Updated productCards:", productCards.length);

                    // Áp dụng lại bộ lọc giá
                    filteredCards = productCards.filter((card) => {
                        const priceElement = card.querySelector(".product-price");
                        const priceText = priceElement.textContent.trim();
                        const price = convertPriceToNumber(priceText);

                        let passPriceFilter = true;
                        if (priceRange) {
                            switch (priceRange) {
                                case "500000":
                                    passPriceFilter = price < 500000;
                                    break;
                                case "1000000":
                                    passPriceFilter = price >= 500000 && price < 1000000;
                                    break;
                                case "1500000":
                                    passPriceFilter = price >= 1000000 && price < 1500000;
                                    break;
                                case "2500000":
                                    passPriceFilter = price >= 1500000 && price < 2500000;
                                    break;
                                case "2500000+":
                                    passPriceFilter = price >= 2500000;
                                    break;
                            }
                        }
                        return passPriceFilter;
                    });

                    // Debug: Ghi log số lượng filteredCards sau khi lọc giá
                    console.log("Filtered cards after price filter:", filteredCards.length);

                    // Kiểm tra nếu không có sản phẩm nào sau khi lọc
                    if (filteredCards.length === 0) {
                      console.log("No products match the filters");
                      productsContainer.innerHTML = "<p>Không tìm thấy sản phẩm phù hợp.</p>";
                      // Ẩn phân trang nếu không có sản phẩm
                      const pagination = document.querySelector(".pagination");
                      if (pagination) pagination.style.display = "none";
                  } else {
                      currentPage = 1;
                      showProductsAndPagination();
                  }
                } else {
                  console.error("Lỗi khi lấy sản phẩm:", response.message);
                  productsContainer.innerHTML = "<p>Không tìm thấy sản phẩm phù hợp.</p>";
                  // Ẩn phân trang nếu không có sản phẩm
                  const pagination = document.querySelector(".pagination");
                  if (pagination) pagination.style.display = "none";
                }
            },
            error: function(xhr, status, error) {
                // Debug: Ghi log lỗi AJAX
                console.error("AJAX error:", {
                    status,
                    error,
                    responseText: xhr.responseText
                });
                productsContainer.innerHTML = "<p>Lỗi khi tải sản phẩm.</p>";
                // Ẩn phân trang nếu không có sản phẩm
                const pagination = document.querySelector(".pagination");
                if (pagination) pagination.style.display = "none";
            }
        });
    } else {
        // Lọc client-side nếu không cần AJAX
        console.log("Applying client-side price filter:", priceRange);

        filteredCards = productCards.filter((card) => {
            const priceElement = card.querySelector(".product-price");
            const priceText = priceElement.textContent.trim();
            const price = convertPriceToNumber(priceText);

            let passPriceFilter = true;
            if (priceRange) {
                switch (priceRange) {
                    case "500000":
                        passPriceFilter = price < 500000;
                        break;
                    case "1000000":
                        passPriceFilter = price >= 500000 && price < 1000000;
                        break;
                    case "1500000":
                        passPriceFilter = price >= 1000000 && price < 1500000;
                        break;
                    case "2500000":
                        passPriceFilter = price >= 1500000 && price < 2500000;
                        break;
                    case "2500000+":
                        passPriceFilter = price >= 2500000;
                        break;
                }
            }
            return passPriceFilter;
        });

        // Debug: Ghi log số lượng filteredCards sau khi lọc client-side
        console.log("Filtered cards (client-side):", filteredCards.length);

        // Kiểm tra nếu không có sản phẩm nào sau khi lọc
        if (filteredCards.length === 0) {
          console.log("No products match the price filter");
          productsContainer.innerHTML = "<p>Không tìm thấy sản phẩm phù hợp.</p>";
          // Ẩn phân trang nếu không có sản phẩm
          const pagination = document.querySelector(".pagination");
          if (pagination) pagination.style.display = "none";
      } else {
          currentPage = 1;
          showProductsAndPagination();
      }
    }
}

  // Gắn sự kiện lọc
  priceFilterDropdown.addEventListener("change", applyFilters);
  typeFilterDropdown.addEventListener("change", applyFilters);
  brandFilterDropdown.addEventListener("change", applyFilters);

  // Hàm hiển thị sản phẩm và phân trang
  function showProductsAndPagination() {
    // Kiểm tra nếu không có sản phẩm
    if (filteredCards.length === 0) {
      console.log("No products to display in showProductsAndPagination");
      productsContainer.innerHTML = "<p>Không tìm thấy sản phẩm phù hợp.</p>";
      const pagination = document.querySelector(".pagination");
      if (pagination) pagination.style.display = "none";
      return;
    }
    
    
    productsContainer.innerHTML = ""; // Xóa nội dung hiện tại

    // Hiển thị sản phẩm đã lọc
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    filteredCards.slice(startIndex, endIndex).forEach((card) => {
      productsContainer.appendChild(card);
    });

    // Hiển thị phân trang
    showPagination();
  }

  // Hàm phân trang
  function showPagination() {
    const existingPagination = document.querySelector(".pagination");
    if (existingPagination) {
      existingPagination.remove();
    }

    const totalPages = Math.ceil(filteredCards.length / productsPerPage);

    // Hiển thị các liên kết phân trang
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination";

    if (currentPage > 1) {
      const prevLink = document.createElement("a");
      prevLink.href = "#";
      prevLink.textContent = "«";
      prevLink.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage--;
        showProductsAndPagination();
      });
      paginationContainer.appendChild(prevLink);
    }

    for (let i = 1; i <= totalPages; i++) {
      const pageLink = document.createElement("a");
      pageLink.href = "#";
      pageLink.textContent = i;

      if (i === currentPage) {
        pageLink.classList.add("active");
      }

      pageLink.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = i;
        showProductsAndPagination();
      });

      paginationContainer.appendChild(pageLink);
    }

    if (currentPage < totalPages) {
      const nextLink = document.createElement("a");
      nextLink.href = "#";
      nextLink.textContent = "»";
      nextLink.classList.add("next");
      nextLink.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage++;
        showProductsAndPagination();
      });
      paginationContainer.appendChild(nextLink);
    }

    productsContainer.appendChild(paginationContainer);
  }

  sortSelect.addEventListener("change", function () {
    const sortValue = this.value;
    let sortedCards;

    switch (sortValue) {
        case "price-asc":
            sortedCards = filteredCards.sort((a, b) => {
                const priceA = convertPriceToNumber(a.querySelector(".product-price"));
                const priceB = convertPriceToNumber(b.querySelector(".product-price"));
                return priceA - priceB;
            });
            break;
        case "price-desc":
            sortedCards = filteredCards.sort((a, b) => {
                const priceA = convertPriceToNumber(a.querySelector(".product-price"));
                const priceB = convertPriceToNumber(b.querySelector(".product-price"));
                return priceB - priceA;
            });
            break;
        default:
            sortedCards = [...filteredCards];
    }

    filteredCards = sortedCards; // Cập nhật mảng đã lọc
    showProductsAndPagination();
});

  // Khởi tạo hiển thị tất cả sản phẩm
  showProductsAndPagination();

  function setupProductTooltips() {
    document.querySelectorAll(".product-card").forEach((card) => {
      const titleElement = card.querySelector(".product-title");
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



  // Xử lý nút thêm vào giỏ hàng
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  const sizeModal = document.getElementById("sizeModal");
  const sizeButtonsContainer = document.getElementById("sizeButtons");
  const quantityInput = document.getElementById("quantityInput");
  const decreaseQtyBtn = document.getElementById("decreaseQty");
  const increaseQtyBtn = document.getElementById("increaseQty");
  const confirmSizeBtn = document.getElementById("confirmSizeBtn");
  const closeModal = document.querySelector(".close");
  const modalProductName = document.getElementById("modalProductName");
  const modalProductImage = document.getElementById("modalProductImage");
  const modalProductPrice = document.getElementById("modalProductPrice");

  const shoeTables = [
    "giaybongro",
    "giaybongda",
    "giaybongchuyen",
    "giaycaulong",
    "giaychaybo",
    "giaypickleball",
    "giaytapgym"
  ];
  const clothingTables = [
    "quanaobongro",
    "quanaobongchuyen",
    "quanaobongda",
    "quanaogym",
    "quanaochaybo",
    "quanaocaulong",
    "aobia"
  ];

  let selectedSize = null;
  let currentProduct = null;

  document.addEventListener("click", function (e) {
    if (e.target.closest('.add-to-cart-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const button = e.target.closest('.add-to-cart-btn');
        const productCard = button.closest('.product-card');
        const tableName = productCard.getAttribute("data-table");
        const productName = productCard.querySelector('.product-title').textContent;
        const productPrice = productCard.querySelector(".product-price").textContent;
        const productPrice2 = parseInt(productPrice.replace('đ', '').replaceAll(',', ''));
        const productImage = productCard.querySelector('img').src;

        currentProduct = { name: productName, price: productPrice2, image: productImage };

        // Logic hiển thị modal chọn size (nếu cần)
        if (shoeTables.includes(tableName) || clothingTables.includes(tableName)) {
            sizeModal.style.display = "block";
            modalProductName.textContent = productName;
            modalProductImage.src = productImage;
            modalProductPrice.textContent = productPrice;

             // Gọi API để lấy danh sách kích thước
                fetch('/baocao/model/config/get_sizes.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `table_name=${encodeURIComponent(tableName)}&product_name=${encodeURIComponent(productName)}`
                })
                .then(response => response.json())
                .then(data => {
                    sizeButtonsContainer.innerHTML = "";
                    if (data.success) {
                        const sizes = data.sizes;
                        sizes.forEach(size => {
                            const button = document.createElement("button");
                            button.type = "button";
                            button.textContent = size;
                            button.addEventListener("click", function() {
                                // Xóa trạng thái selected của các nút khác
                                document.querySelectorAll(".size-buttons button").forEach(btn => {
                                    btn.classList.remove("selected");
                                });
                                // Thêm trạng thái selected cho nút được chọn
                                this.classList.add("selected");
                                selectedSize = size;
                            });
                            sizeButtonsContainer.appendChild(button);
                        });
                    } else {
                        sizeButtonsContainer.innerHTML = "<p>Không có kích thước khả dụng</p>";
                        console.warn(data.message);
                    }
                })
                .catch(error => {
                    console.error('Lỗi khi lấy kích thước:', error);
                    sizeButtonsContainer.innerHTML = "<p>Lỗi khi tải kích thước</p>";
                });


            quantityInput.value = "1";
            selectedSize = null;
        } else {
            addToCart(productName, productPrice2, null, 1, productImage);
        }
    }
});
  // Xử lý tăng/giảm số lượng
  decreaseQtyBtn.addEventListener("click", function() {
    let qty = parseInt(quantityInput.value);
    if (qty > 1) {
        quantityInput.value = qty - 1;
    }
});

increaseQtyBtn.addEventListener("click", function() {
    let qty = parseInt(quantityInput.value);
    quantityInput.value = qty + 1;
});

// Xử lý khi nhấn nút "Thêm vào giỏ hàng"
confirmSizeBtn.addEventListener("click", function() {
    if (!selectedSize) {
        alert("Vui lòng chọn kích thước!");
        return;
    }
    const quantity = parseInt(quantityInput.value);
    addToCart(currentProduct.name, currentProduct.price, selectedSize, quantity, currentProduct.image);
    sizeModal.style.display = "none";
});

// Đóng modal khi nhấp vào nút "X"
closeModal.onclick = function() {
    sizeModal.style.display = "none";
};

// Đóng modal khi nhấp ra ngoài
window.onclick = function(event) {
    if (event.target === sizeModal) {
        sizeModal.style.display = "none";
    }
};


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
                image: imageFileName
            });
        }

        localStorage.setItem("cart", JSON.stringify(cart));

        if (typeof window.updateCart === 'function') {
            window.updateCart(); // Cập nhật giỏ hàng trong header
        }
        if (typeof window.renderCart === 'function') {
            window.renderCart(); // Cập nhật giỏ hàng trong trang cart.php
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

  $(document).ready(function (e) {
    $(document).on("click", ".product-card", function (e) {
        if ($(e.target).closest('.add-to-cart-btn').length) {
          return; // Ngăn chuyển hướng khi nhấn nút
        }
        let productName = $(this).find(".product-title").text().trim();

        $(".productForm input[name='product_name']").remove();

        let hiddenInput = $("<input>")
            .attr("type", "hidden")
            .attr("name", "product_name")
            .val(productName);

        $(".productForm").append(hiddenInput);
        $(".productForm").submit();
    });
  });

});
