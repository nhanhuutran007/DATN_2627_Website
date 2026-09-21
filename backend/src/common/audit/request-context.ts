import { AsyncLocalStorage } from "node:async_hooks";

import type { NextFunction, Request, Response } from "express";

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

/**
 * Lưu thông tin request hiện tại (IP, user-agent) để AuditService tự gắn vào bản ghi
 * mà không phải truyền qua từng service.
 */
export const requestContext = new AsyncLocalStorage<RequestMeta>();

const MAX_IP_LENGTH = 45;
const MAX_USER_AGENT_LENGTH = 500;

/**
 * Middleware Express, đăng ký bằng `app.use()` trong `main.ts`.
 * Lưu ý: sau reverse proxy (Nginx/ALB) `req.ip` là IP của proxy trừ khi bật
 * `trust proxy`; cấu hình đó ảnh hưởng cả rate limit nên chưa bật ở đây.
 */
export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userAgent = req.headers["user-agent"];
  requestContext.run(
    {
      ip: (req.ip ?? req.socket?.remoteAddress)?.slice(0, MAX_IP_LENGTH),
      userAgent:
        typeof userAgent === "string"
          ? userAgent.slice(0, MAX_USER_AGENT_LENGTH)
          : undefined,
    },
    next,
  );
}
