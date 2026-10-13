import sanitizeHtml from "sanitize-html";

// Giữ khớp với backend/src/common/html/rich-text.ts.
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
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

/** Làm sạch lần nữa khi hiển thị: backend đã lọc lúc lưu, nhưng dữ liệu cũ thì chưa. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
