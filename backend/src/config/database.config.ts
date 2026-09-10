import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_DATABASE ?? "crowdfunding",
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env.NODE_ENV !== "production",
  };
}
