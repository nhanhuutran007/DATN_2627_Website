import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { requestContextMiddleware } from "./common/audit/request-context";
import { readAppConfig } from "./config/app.config";

async function bootstrap(): Promise<void> {
  const config = readAppConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Tin đúng `trustProxyHops` hop reverse-proxy để `req.ip` (audit log, rate
  // limit theo IP) đọc đúng IP thật của client thay vì IP của Nginx/ALB.
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet());
  app.use(requestContextMiddleware);
  app.setGlobalPrefix("api/v1");
  // Không có middleware CSRF: xác thực dùng Bearer JWT trong header
  // Authorization, lưu ở localStorage phía FE (frontend/src/lib/api.ts),
  // không dùng cookie — trình duyệt không tự đính token nên không có tấn
  // công CSRF theo mô hình dựa trên cookie truyền thống.
  app.enableCors({
    credentials: true,
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Signature"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  // Áp dụng @Exclude/@Expose của entity khi trả response (vd. không bao giờ
  // trả passwordHash, ẩn email/phone của owner trong API công khai).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
