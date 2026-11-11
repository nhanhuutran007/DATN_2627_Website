/** Ký tự phải thoát khi nhúng JSON vào thẻ script: `<`, `>`, `&` và hai dấu xuống dòng U+2028/U+2029. */
const UNSAFE_IN_SCRIPT = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, "g");

/**
 * Chuỗi JSON-LD an toàn để nhúng vào `<script type="application/ld+json">`.
 *
 * `JSON.stringify` không thoát ký tự `<`, nên dữ liệu chứa `</script>` (tên lĩnh vực, tên tổ
 * chức, tiêu đề do người dùng nhập) sẽ đóng thẻ script sớm và chèn được HTML vào trang. Các ký
 * tự nguy hiểm được đổi thành dạng `\uXXXX`, JSON vẫn giữ nguyên nghĩa.
 */
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(
    UNSAFE_IN_SCRIPT,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
