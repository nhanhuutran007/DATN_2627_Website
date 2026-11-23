/** Video giới thiệu dự án tối đa 100 MB (đủ cho khoảng 2–3 phút quay bằng điện thoại ở 720p–1080p). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type VideoType = { mimeType: "video/mp4" | "video/webm"; extension: "mp4" | "webm" };

/**
 * Nhận diện video theo magic bytes, không tin `Content-Type` hay đuôi file client gửi.
 * - MP4/M4V/MOV (họ ISO BMFF): hộp `ftyp` ở byte 4–7. MOV quay bằng iPhone cũng là định dạng này
 *   và phát được như MP4 trên trình duyệt khi mã hóa H.264.
 * - WebM (Matroska): mã EBML `1A 45 DF A3` ở đầu file.
 * Trả `null` cho định dạng khác.
 */
export function detectVideoType(buffer: Buffer): VideoType | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return { mimeType: "video/mp4", extension: "mp4" };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { mimeType: "video/webm", extension: "webm" };
  }
  return null;
}
