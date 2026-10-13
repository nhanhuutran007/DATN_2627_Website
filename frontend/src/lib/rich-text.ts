/** Có thẻ HTML hay không — mô tả cũ là văn bản thuần, mô tả mới từ trình soạn thảo là HTML. */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/** Chuyển HTML thành văn bản thuần: mỗi khối (đoạn, tiêu đề, mục danh sách…) một dòng. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote|figcaption|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
