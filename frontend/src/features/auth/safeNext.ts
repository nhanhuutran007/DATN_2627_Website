/** Chỉ cho chuyển hướng tới đường dẫn nội bộ ("/..."), chặn "//host" hay "https://..." (open redirect). */
export function safeNext(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
