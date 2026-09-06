document.addEventListener("DOMContentLoaded", function () {
  const sortSelect = document.getElementById("sort-select");
  const productsContainer = document.getElementById("productContainer");
  const productCards = Array.from(
    productsContainer.getElementsByClassName("product-card")
  );
  const navItems = document.querySelectorAll(".nav-item");
  const priceFilterDropdown = document.querySelector(
    ".filter-bar select:first-child"
  );
  const productsPerPage = 12;
  let currentPage = 1;
  let filteredCards = [...productCards];

  // Hàm chuyển đổi giá từ chuỗi sang số
  function convertPriceToNumber(priceText) {
    return parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
  }

  // Hàm lọc sản phẩm theo giá
  // Hàm chuyển đổi giá từ chuỗi sang số
  function convertPriceToNumber(priceText) {
    // Lấy giá đầu tiên trong text (loại bỏ giá gạch ngang nếu có)
    const mainPrice = priceText.split("đ")[0].trim();
    // Loại bỏ tất cả ký tự không phải số
    return parseInt(mainPrice.replace(/\D/g, ""));
  }

  // Hàm lọc sản phẩm theo giá
  function filterByPrice(priceRange) {
    filteredCards = productCards.filter((card) => {
      const priceElement = card.querySelector(".product-price");
      const priceText = priceElement.childNodes[0].textContent.trim();
      const price = convertPriceToNumber(priceText);

      console.log(
        "Sản phẩm:",
        card.querySelector(".product-title").textContent
      );
      console.log("Giá trích xuất:", price);

      switch (priceRange) {
        case "500000":
          return price < 500000;
        case "1000000":
          return price >= 500000 && price < 1000000;
        case "1500000":
          return price >= 1000000 && price < 1500000;
        case "2500000":
          return price >= 1500000 && price < 2500000;
        case "2500000+":
          return price >= 2500000;
        default:
          return true;
      }
    });

    currentPage = 1;
    showProductsAndPagination();
  }

  // Gắn sự kiện lọc giá
  priceFilterDropdown.addEventListener("change", function () {
    const selectedPriceRange = this.value;
    filterByPrice(selectedPriceRange);
  });

  // Hàm lọc sản phẩm theo từ khóa từ nav-item
  function filterProducts(keyword) {
    if (!keyword) {
      filteredCards = [...productCards]; // Hiển thị tất cả nếu không có từ khóa
    } else {
      filteredCards = productCards.filter((card) => {
        const title = card
          .querySelector(".product-title")
          .textContent.toLowerCase();
        return title.includes(keyword.toLowerCase());
      });
    }
    currentPage = 1; // Reset về trang 1 khi lọc
    showProductsAndPagination();
  }

  // Hàm hiển thị sản phẩm và phân trang
  function showProductsAndPagination() {
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

  // Xử lý sự kiện click trên nav-item
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const text = this.textContent.trim(); // Lấy nội dung văn bản của nút (ví dụ: "đá thể thao Nam")

      // Xác định từ khóa để lọc dựa trên nội dung nút
      let keyword = "";
      if (text.includes("đá")) keyword = "đá";
      else if (text.includes("lông")) keyword = "lông";
      else if (text.includes("rổ")) keyword = "rổ";
      else if (text.includes("chuyền")) keyword = "chuyền";

      filterProducts(keyword);
    });
  });

  // Xử lý sắp xếp
  sortSelect.addEventListener("change", function () {
    const sortValue = this.value;
    let sortedCards;

    switch (sortValue) {
      case "price-asc":
        sortedCards = filteredCards.sort((a, b) => {
          const priceA = convertPriceToNumber(
            a.querySelector(".product-price").childNodes[0].textContent.trim()
          );
          const priceB = convertPriceToNumber(
            b.querySelector(".product-price").childNodes[0].textContent.trim()
          );
          return priceA - priceB;
        });
        break;
      case "price-desc":
        sortedCards = filteredCards.sort((a, b) => {
          const priceA = convertPriceToNumber(
            a.querySelector(".product-price").childNodes[0].textContent.trim()
          );
          const priceB = convertPriceToNumber(
            b.querySelector(".product-price").childNodes[0].textContent.trim()
          );
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
});
