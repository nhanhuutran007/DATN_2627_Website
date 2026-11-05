import { createHash } from "node:crypto";

import sharp = require("sharp");

/**
 * Dấu vân ảnh để phát hiện chứng từ dùng lại. `contentHash` khớp đúng từng byte.
 * `perceptualHash` là dHash chỉ giữ các ô có nét: nền giấy trắng cho bit gần như
 * ngẫu nhiên nên dHash chuẩn coi hai hóa đơn khác nhau còn giống hơn một ảnh lưu lại.
 */
export type ImageFingerprint = {
  contentHash: string;
  perceptualHash: string | null;
};

const GRID = 32;
/** Chênh lệch độ sáng giữa hai ô liền kề dưới mức này coi như nền trống. */
const INK_MIN_DIFF = 8;
/** Ít ô có nét hơn mức này thì không đủ căn cứ để so sánh (ảnh trắng, ảnh quá mờ). */
const MIN_INK_CELLS = 20;

/**
 * Tỷ lệ ô khác nhau tối đa để coi là gần trùng. Đo trên hóa đơn mẫu: bản sao bị nén,
 * đổi kích thước, đổi định dạng hay độ sáng lệch tối đa 0,10; hóa đơn khác cùng mẫu
 * lệch từ 0,18. Không bắt được ảnh bị cắt, xoay hay chụp lại (lệch khoảng 0,5).
 */
export const NEAR_DUPLICATE_MAX_RATIO = 0.14;

/** Đưa mọi ảnh về cùng kích thước và làm mờ để nét chữ không phụ thuộc độ phân giải gốc. */
const SMOOTH_WIDTH = 660;
const SMOOTH_HEIGHT = 640;
const SMOOTH_SIGMA = 3;

const CELL_BLANK = 0;
const CELL_RISING = 1;
const CELL_FALLING = 2;

/** `pixels` là ảnh xám (GRID + 1) x GRID; mỗi ký tự hex chứa hai ô. */
export function perceptualHashFromPixels(pixels: Uint8Array): string {
  const cells: number[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const offset = y * (GRID + 1) + x;
      const diff = pixels[offset] - pixels[offset + 1];
      if (Math.abs(diff) <= INK_MIN_DIFF) cells.push(CELL_BLANK);
      else cells.push(diff > 0 ? CELL_FALLING : CELL_RISING);
    }
  }
  let hash = "";
  for (let index = 0; index < cells.length; index += 2) {
    hash += ((cells[index] << 2) | cells[index + 1]).toString(16);
  }
  return hash;
}

function unpackCells(hash: string): number[] {
  const cells: number[] = [];
  for (const char of hash) {
    const value = parseInt(char, 16);
    cells.push(value >> 2, value & 3);
  }
  return cells;
}

/** Tỷ lệ ô khác nhau trong các ô có nét, 0-1; trả 1 khi không đủ căn cứ để so. */
export function perceptualDistance(first: string, second: string): number {
  const a = unpackCells(first);
  const b = unpackCells(second);
  let inked = 0;
  let different = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] === CELL_BLANK && b[index] === CELL_BLANK) continue;
    inked += 1;
    if (a[index] !== b[index]) different += 1;
  }
  return inked < MIN_INK_CELLS ? 1 : different / inked;
}

async function perceptualHash(image: Buffer): Promise<string | null> {
  try {
    // Hai bước vì sharp luôn resize trước blur. Tắt shrink-on-load: bước này làm cùng một
    // ảnh cho kết quả khác nhau giữa JPEG và PNG.
    const smoothed = await sharp(image)
      .rotate()
      .greyscale()
      .resize(SMOOTH_WIDTH, SMOOTH_HEIGHT, { fit: "fill", fastShrinkOnLoad: false })
      .blur(SMOOTH_SIGMA)
      .png()
      .toBuffer();
    const pixels = await sharp(smoothed)
      .resize(GRID + 1, GRID, { fit: "fill", kernel: "cubic" })
      .normalise()
      .raw()
      .toBuffer();
    return perceptualHashFromPixels(pixels);
  } catch {
    // Ảnh hợp lệ theo magic bytes nhưng không giải mã được: vẫn nhận, chỉ không so gần trùng.
    return null;
  }
}

export async function fingerprintImage(image: Buffer): Promise<ImageFingerprint> {
  return {
    contentHash: createHash("sha256").update(image).digest("hex"),
    perceptualHash: await perceptualHash(image),
  };
}
