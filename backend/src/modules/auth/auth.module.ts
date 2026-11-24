import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { createEmailGateway } from "../../integrations/email/email.gateway";
import { PolicyEmailGateway } from "../../integrations/email/policy-email.gateway";
import { createGoogleIdentityGateway } from "../../integrations/identity/google-identity.gateway";
import { EmailSettingsService } from "../support/email-settings.service";
import { SupportModule } from "../support/support.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailVerificationService } from "./email-verification.service";
import { EmailVerificationToken } from "./entities/email-verification-token.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { RevokedToken } from "./entities/revoked-token.entity";
import { StepUpCode } from "./entities/step-up-code.entity";
import { StepUpGuard } from "./guards/step-up.guard";
import { PasswordResetService } from "./password-reset.service";
import { StepUpService } from "./step-up.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    UsersModule,
    SupportModule,
    TypeOrmModule.forFeature([PasswordResetToken, EmailVerificationToken, RevokedToken, StepUpCode]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    EmailVerificationService,
    StepUpService,
    StepUpGuard,
    JwtStrategy,
    {
      // Mọi email đi qua bộ lọc cài đặt của admin (mục "Cài đặt email").
      provide: "EmailGateway",
      useFactory: (emailSettings: EmailSettingsService) =>
        new PolicyEmailGateway(createEmailGateway(), emailSettings, process.env.NODE_ENV !== "production"),
      inject: [EmailSettingsService],
    },
    {
      provide: "GoogleIdentityGateway",
      useFactory: () => createGoogleIdentityGateway(),
    },
  ],
  // EmailGateway dùng chung (vd. NotificationsService gửi email thông báo)
  // StepUpService/StepUpGuard dùng ở module khác (vd. hoàn tiền) cho thao tác nhạy cảm.
  exports: [AuthService, PassportModule, "EmailGateway", StepUpService, StepUpGuard],
})
export class AuthModule {}
