/**
 * URL gốc công khai của site, dùng cho canonical, Open Graph và sitemap.
 * Chỉ dùng phía server, đọc lúc chạy (không dùng NEXT_PUBLIC_* vì biến đó bị gắn cứng khi build).
 */
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
