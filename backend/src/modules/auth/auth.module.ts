import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { createEmailGateway } from "../../integrations/email/email.gateway";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailVerificationService } from "./email-verification.service";
import { EmailVerificationToken } from "./entities/email-verification-token.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { RevokedToken } from "./entities/revoked-token.entity";
import { PasswordResetService } from "./password-reset.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Global()
@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken, EmailVerificationToken, RevokedToken]),
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
    JwtStrategy,
    {
      provide: "EmailGateway",
      useFactory: () => createEmailGateway(),
    },
  ],
  // EmailGateway dùng chung (vd. NotificationsService gửi email thông báo)
  exports: [AuthService, PassportModule, "EmailGateway"],
})
export class AuthModule {}
