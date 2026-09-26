import { readFileSync } from "node:fs";

import { TypeOrmModuleOptions } from "@nestjs/typeorm";

type DatabaseSslOptions = { ca?: string; rejectUnauthorized: boolean };

/**
 * TLS tới MySQL, bật bằng `DB_SSL=true` (RDS MySQL 8.4 mặc định bắt buộc TLS).
 * `DB_SSL_CA_PATH` trỏ tới CA bundle (image backend có sẵn bundle của RDS) để
 * xác minh chứng chỉ server; thiếu CA thì vẫn mã hóa nhưng không xác minh.
 */
export function readDatabaseSsl(): DatabaseSslOptions | undefined {
  if (process.env.DB_SSL?.trim().toLowerCase() !== "true") {
    return undefined;
  }

  const caPath = process.env.DB_SSL_CA_PATH?.trim();
  if (!caPath) {
    return { rejectUnauthorized: false };
  }

  return { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true };
}

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_DATABASE ?? "crowdfunding",
    ssl: readDatabaseSsl(),
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env.NODE_ENV !== "production",
  };
}
