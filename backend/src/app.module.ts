import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { getDatabaseConfig } from "./config/database.config";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    UsersModule,
    CampaignsModule,
    HealthModule,
  ],
})
export class AppModule {}
