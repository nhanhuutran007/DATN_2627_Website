export type AppConfig = {
  corsOrigins: string[];
  port: number;
  /**
   * Số hop reverse-proxy đáng tin (Express `trust proxy`), dùng để đọc đúng
   * `req.ip` từ `X-Forwarded-For` khi có Nginx/ALB đứng trước. Chỉ tin đúng số
   * hop đã biết, không dùng `true` (tin mọi hop) để tránh giả mạo IP.
   */
  trustProxyHops: number;
};

const DEFAULT_PORT = 4000;
const DEFAULT_TRUST_PROXY_HOPS = 1;

export function readAppConfig(): AppConfig {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin");
  }

  const trustProxyHops = Number(
    process.env.TRUST_PROXY_HOPS ?? DEFAULT_TRUST_PROXY_HOPS,
  );
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }

  return { corsOrigins, port, trustProxyHops };
}
