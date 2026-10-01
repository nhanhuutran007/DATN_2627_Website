/**
 * Một ô CSV an toàn: bọc ngoặc kép, nhân đôi dấu `"`, và chặn CSV/formula
 * injection (ô bắt đầu bằng = + - @ hoặc tab/CR bị Excel hiểu là công thức).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/** CSV UTF-8 có BOM để Excel đọc đúng tiếng Việt; dòng phân cách CRLF. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
