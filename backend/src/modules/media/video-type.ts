/**
 * Video giới thiệu dự án: giới hạn theo **thời lượng** (tối đa 2 phút, như lời khuyên của Kickstarter
 * "video ngắn dưới 2 phút"), dung lượng chỉ là giới hạn kỹ thuật (đủ cho 2 phút quay 1080p bằng điện thoại).
 */
export const MAX_VIDEO_SECONDS = 120;
/** Lệch vài giây do làm tròn khi xuất video. */
const DURATION_TOLERANCE_SECONDS = 2;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

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

/**
 * Thời lượng (giây) của video MP4/MOV đọc từ hộp `moov/mvhd`; `null` nếu không đọc được
 * (WebM, file lạ) — khi đó chỉ dựa vào kiểm tra ở trình duyệt.
 */
export function mp4DurationSeconds(buffer: Buffer): number | null {
  const moov = findBox(buffer, 0, buffer.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(buffer, moov.start, moov.end, "mvhd");
  if (!mvhd || mvhd.end - mvhd.start < 20) return null;
  const version = buffer.readUInt8(mvhd.start);
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (mvhd.end - mvhd.start < 32) return null;
    timescale = buffer.readUInt32BE(mvhd.start + 20);
    duration = Number(buffer.readBigUInt64BE(mvhd.start + 24));
  } else {
    timescale = buffer.readUInt32BE(mvhd.start + 12);
    duration = buffer.readUInt32BE(mvhd.start + 16);
  }
  return timescale > 0 ? duration / timescale : null;
}

/** Video dài hơn giới hạn 2 phút? (không đọc được thời lượng thì không chặn). */
export function exceedsMaxVideoDuration(buffer: Buffer): boolean {
  const seconds = mp4DurationSeconds(buffer);
  return seconds !== null && seconds > MAX_VIDEO_SECONDS + DURATION_TOLERANCE_SECONDS;
}

/** Tìm hộp ISO BMFF `type` trong đoạn [from, to); trả vùng nội dung (bỏ phần đầu hộp). */
function findBox(buffer: Buffer, from: number, to: number, type: string): { start: number; end: number } | null {
  let offset = from;
  while (offset + 8 <= to) {
    let size = buffer.readUInt32BE(offset);
    const boxType = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    let header = 8;
    if (size === 1) {
      if (offset + 16 > to) return null;
      size = Number(buffer.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }
    if (size < header || offset + size > to) return null;
    if (boxType === type) return { start: offset + header, end: offset + size };
    offset += size;
  }
  return null;
}
