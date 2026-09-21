import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { requestContextMiddleware } from "./common/audit/request-context";
import { readAppConfig } from "./config/app.config";

async function bootstrap(): Promise<void> {
  const config = readAppConfig();
  const app = await NestFactory.create(AppModule);

  app.use(requestContextMiddleware);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    credentials: true,
    origin: config.corsOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
