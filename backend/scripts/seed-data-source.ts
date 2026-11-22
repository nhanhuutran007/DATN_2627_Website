import { config } from "dotenv";
import { DataSource } from "typeorm";

import { readDatabaseSsl } from "../src/config/database.config";

config({ path: ".env" });

/** Kết nối dùng chung cho các script seed (cùng cấu hình DB_* với backend). */
export function createSeedDataSource(): DataSource {
  return new DataSource({
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_DATABASE ?? "crowdfunding",
    ssl: readDatabaseSsl(),
    // DATETIME lưu theo UTC như backend.
    timezone: "Z",
    entities: ["src/modules/**/*.entity.ts"],
    synchronize: false,
  });
}
