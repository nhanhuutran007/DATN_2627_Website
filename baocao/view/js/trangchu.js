document.addEventListener('DOMContentLoaded', function() {
    // Truyền trạng thái đăng nhập từ PHP
    const isLoggedIn = window.isLoggedIn || false;
    const userId = window.userId || null;

    // Xử lý banner carousel
    const slides = document.querySelectorAll('.banner-slide');
    let currentSlide = 0;

    // Hàm chuyển slide
    function showNextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    if (slides.length > 0) {
        setInterval(showNextSlide, 5000); // Chuyển slide mỗi 5 giây
    } else {
        console.error('Không tìm thấy banner slides');
    }

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

    // Danh sách bảng thuộc giày và quần áo
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

    addToCartButtons.forEach(button => {
        button.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();

            const productCard = this.closest(".product-card");
            const tableName = productCard.getAttribute("data-table");
            const productName = productCard.querySelector(".product-name").childNodes[0].textContent.trim();
            const productPrice = productCard.querySelector(".price").textContent;
            const productPrice2 = parseInt(productPrice.replace('đ', '').replaceAll(',', ''));
            const productImage = productCard.querySelector('.product-image img').src;

            currentProduct = { name: productName, price: productPrice2, image: productImage };

            // Kiểm tra nếu sản phẩm thuộc bảng giày hoặc quần áo
            if (shoeTables.includes(tableName) || clothingTables.includes(tableName)) {
                // Hiển thị modal chọn size
                sizeModal.style.display = "block";

                // Cập nhật thông tin sản phẩm trong modal
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

                // Reset số lượng về 1
                quantityInput.value = "1";
                selectedSize = null;
            } else {
                // Nếu không phải giày hoặc quần áo, thêm trực tiếp vào giỏ hàng
                addToCart(productName, productPrice2, null, 1, productImage);
            }
        });
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
                image: imageFileName,
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
                alert(`Lỗi khi thêm vào giỏ hàng. Vui lòng thử lại.`);
            }
        });
    }
}

    // Hàm setupPagination
    function setupPagination(containerId, paginationId, filterCategory = 'all', paginationType = 'dots') {
        const productCards = Array.from(document.querySelectorAll(`#${containerId} .product-card`)).filter(card => {
            const category = card.getAttribute('data-category');
            return filterCategory === 'all' || category === filterCategory;
        });
        const paginationContainer = document.getElementById(paginationId);
        let itemsPerPage = 5;
        let currentPage = 1;

        if (productCards.length === 0 || !paginationContainer) {
            console.error(`Không tìm thấy product-card hoặc pagination container cho ${containerId}`);
            paginationContainer.innerHTML = '<p>Không có sản phẩm nào trong danh mục này.</p>';
            return;
        }

        function updateItemsPerPage() {
            const width = window.innerWidth;
            if (width <= 768) {
                itemsPerPage = 2;
            } else if (width <= 1024) {
                itemsPerPage = 4;
            } else {
                itemsPerPage = 5;
            }
            currentPage = 1;
            renderProducts();
            renderPagination();
        }

        function renderProducts() {
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;

            document.querySelectorAll(`#${containerId} .product-card`).forEach(card => {
                const category = card.getAttribute('data-category');
                const shouldShow = filterCategory === 'all' || category === filterCategory;
                if (shouldShow) {
                    if (productCards.indexOf(card) >= start && productCards.indexOf(card) < end) {
                        card.classList.add('visible');
                    } else {
                        card.classList.remove('visible');
                    }
                } else {
                    card.classList.remove('visible');
                }
            });
        }

        function renderPagination() {
            const totalPages = Math.ceil(productCards.length / itemsPerPage) || 1;
            paginationContainer.innerHTML = '';

            if (totalPages <= 0) {
                console.error(`Không có trang nào để hiển thị cho ${containerId}`);
                return;
            }

            if (paginationType === 'dots') {
                for (let i = 1; i <= totalPages; i++) {
                    const span = document.createElement('span');
                    span.setAttribute('data-page', i);
                    if (i === currentPage) span.classList.add('active');
                    paginationContainer.appendChild(span);

                    span.addEventListener('click', function() {
                        currentPage = parseInt(this.getAttribute('data-page'));
                        renderProducts();
                        renderPagination();
                    });
                }
            } else if (paginationType === 'nav-buttons') {
                const prevButton = document.createElement('button');
                prevButton.className = 'nav-button prev';
                prevButton.textContent = 'Trước';
                prevButton.disabled = currentPage === 1;

                const nextButton = document.createElement('button');
                nextButton.className = 'nav-button next';
                nextButton.textContent = 'Tiếp theo';
                nextButton.disabled = currentPage === totalPages;

                const pageButtonsContainer = document.createElement('div');
                pageButtonsContainer.className = 'page-buttons';

                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);

                if (endPage - startPage < 4) {
                    if (startPage === 1) endPage = Math.min(5, totalPages);
                    else if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
                }

                for (let i = startPage; i <= endPage; i++) {
                    const pageButton = document.createElement('button');
                    pageButton.className = 'nav-button page';
                    pageButton.textContent = i;
                    if (i === currentPage) pageButton.classList.add('active');
                    pageButtonsContainer.appendChild(pageButton);

                    pageButton.addEventListener('click', function() {
                        currentPage = parseInt(this.textContent);
                        renderProducts();
                        renderPagination();
                    });
                }

                paginationContainer.appendChild(prevButton);
                paginationContainer.appendChild(pageButtonsContainer);
                paginationContainer.appendChild(nextButton);

                prevButton.addEventListener('click', function() {
                    if (currentPage > 1) {
                        currentPage--;
                        renderProducts();
                        renderPagination();
                    }
                });

                nextButton.addEventListener('click', function() {
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderProducts();
                        renderPagination();
                    }
                });
            }
        }

       // Xóa sự kiện resize cũ trước khi thêm mới
        window.removeEventListener('resize', updateItemsPerPage);
        window.addEventListener('resize', updateItemsPerPage);

        updateItemsPerPage();
    }

    // Khởi tạo pagination cho các section
    setupPagination('products-list', 'pagination', 'all', 'dots');
    let activeCategory = 'balo-tui-mu';
    const navButtons = document.querySelectorAll('.accessories-container .nav-button');
    const productCards = document.querySelectorAll('#accessories-list .product-card');

    navButtons.forEach(button => {
        if (button.hasAttribute('data-category')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const category = this.getAttribute('data-category');

                navButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                activeCategory = category;

                productCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    if (activeCategory === 'all' || cardCategory === activeCategory) {
                        card.classList.add('visible');
                    } else {
                        card.classList.remove('visible');
                    }
                });

                setupPagination('accessories-list', 'accessories-pagination', activeCategory, 'nav-buttons');
            });
        }
    });

    setupPagination('accessories-list', 'accessories-pagination', activeCategory, 'nav-buttons');
    setupPagination('mens-fashion-list', 'mens-fashion-pagination', 'mens-fashion', 'nav-buttons');
    setupPagination('womens-fashion-list', 'womens-fashion-pagination', 'womens-fashion', 'nav-buttons');


    
// });

    // $(document).ready(function() {
    $(".nav-button").on("click", function(event) {
      event.preventDefault(); // Ngăn chặn điều hướng mặc định

      let selectedId = $(this).attr("id"); // Lấy id của thẻ <a> được nhấn
      
      // Nếu thẻ <a> không có id, không làm gì cả
      if (!selectedId) return;

      // Xóa input ẩn cũ nếu có
      $(".sportsForm input[name='selected_sport']").remove();

      // Tạo input ẩn mới để gửi id
      let hiddenInput = $("<input>")
        .attr("type", "hidden")
        .attr("name", "selected_sport")
        .val(selectedId);

      $(".sportsForm").append(hiddenInput);

      $(".sportsForm").submit();
    });

    $(".banner-slide").on("click", function(event) {
        event.preventDefault(); // Ngăn chặn điều hướng mặc định
  
        let selectedId = $(this).attr("id"); // Lấy id của thẻ <a> được nhấn
        
        // Nếu thẻ <a> không có id, không làm gì cả
        if (!selectedId) return;
  
        // Xóa input ẩn cũ nếu có
        $(".sportsForm input[name='all-product']").remove();
  
        // Tạo input ẩn mới để gửi id
        let hiddenInput = $("<input>")
          .attr("type", "hidden")
          .attr("name", "all-product")
          .val(selectedId);
  
        $(".sportsForm").append(hiddenInput);
  
        $(".sportsForm").submit();
    });

    $(".sports-banners a").on("click", function(event) {
        event.preventDefault(); // Ngăn chặn điều hướng mặc định
  
        let selectedId = $(this).attr("id"); // Lấy id của thẻ <a> được nhấn
        
        // Nếu thẻ <a> không có id, không làm gì cả
        if (!selectedId) return;
  
        // Xóa input ẩn cũ nếu có
        $(".sportsForm input[name='selected_sport']").remove();
  
        // Tạo input ẩn mới để gửi id
        let hiddenInput = $("<input>")
          .attr("type", "hidden")
          .attr("name", "selected_sport")
          .val(selectedId);
  
        $(".sportsForm").append(hiddenInput);
  
        $(".sportsForm").submit();
      });

    $(".product-card").click(function (e) {
        if ($(e.target).closest('.add-to-cart-btn').length) {
            return; // Ngăn chuyển hướng khi nhấn nút
        }
        const productName = $(this).find(".product-info .product-name").get(0).childNodes[0].textContent.trim();

        const $form = $(this).find("form.productForm");

        // Xóa input ẩn trước đó trong form này (nếu có)
        $form.find("input[name='product_name']").remove();

        // Tạo input ẩn mới với tên sản phẩm
        let hiddenInput = $("<input>")
            .attr("type", "hidden")
            .attr("name", "product_name")
            .val(productName);

        // Thêm input vào form và submit form đó
        $form.append(hiddenInput);
        $form.submit();
    });

        const alertBox = document.getElementById("success-alert");
        if (alertBox) {
            setTimeout(function() {
                alertBox.style.opacity = "0";
                setTimeout(function() {
                    alertBox.style.display = "none";
                }, 500); // Đợi hiệu ứng mờ xong mới ẩn
            }, 3000); // Hiển thị 3 giây
        }
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