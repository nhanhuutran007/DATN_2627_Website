import { config } from "dotenv";
import { DataSource } from "typeorm";

import { readDatabaseSsl } from "./src/config/database.config";

config({ path: ".env" });

export default new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE ?? "crowdfunding",
  ssl: readDatabaseSsl(),
  entities: ["src/modules/**/*.entity.ts"],
  migrations: ["database/migrations/*.ts"],
  synchronize: false,
});
