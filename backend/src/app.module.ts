import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { getDatabaseConfig } from "./config/database.config";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { DonationsModule } from "./modules/donations/donations.module";
import { HealthModule } from "./modules/health/health.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    RateLimitModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    DonationsModule,
    ProgressModule,
    HealthModule,
  ],
})
export class AppModule {}
