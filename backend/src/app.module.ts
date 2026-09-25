import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

import { getDatabaseConfig } from "./config/database.config";
import { AuditModule } from "./common/audit/audit.module";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { DonationsModule } from "./modules/donations/donations.module";
import { HealthModule } from "./modules/health/health.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ScheduleModule.forRoot(),
    RateLimitModule,
    AuditModule,
    AdminModule,
    AiModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    DonationsModule,
    ProgressModule,
    ModerationModule,
    HealthModule,
  ],
})
export class AppModule {}
