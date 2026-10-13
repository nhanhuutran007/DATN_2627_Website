import sanitizeHtml = require("sanitize-html");

/** Có thẻ HTML hay không — mô tả cũ là văn bản thuần, mô tả mới từ trình soạn thảo là HTML. */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a",
    "ul", "ol", "li", "blockquote", "figure", "figcaption", "img",
    "table", "thead", "tbody", "tr", "th", "td", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    figure: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedClasses: {
    figure: ["image", "table", "image-style-side", "image-style-align-left", "image-style-align-right", "image-style-block-align-left", "image-style-block-align-right"],
  },
  // Ảnh chỉ từ http(s) hoặc đường dẫn tương đối của kho media; chặn data: và javascript:.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

/**
 * Làm sạch nội dung từ trình soạn thảo trước khi lưu. Văn bản thuần (dữ liệu cũ/API)
 * giữ nguyên vì frontend hiển thị nó dưới dạng text, không phải HTML.
 */
export function sanitizeRichText(value: string): string {
  return looksLikeHtml(value) ? sanitizeHtml(value, OPTIONS).trim() : value;
}
