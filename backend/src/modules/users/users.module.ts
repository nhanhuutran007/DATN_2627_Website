import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RiskAlert } from "../admin/entities/risk-alert.entity";
import { BehaviorEvent } from "../ai/entities/behavior-event.entity";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountTombstone } from "./entities/account-tombstone.entity";
import { UserBankAccount } from "./entities/user-bank-account.entity";
import { User } from "./entities/user.entity";
import { UserBankAccountService } from "./user-bank-account.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserBankAccount, BehaviorEvent, AccountTombstone, RiskAlert])],
  controllers: [UsersController],
  providers: [UsersService, UserBankAccountService, AccountDeletionService],
  exports: [UsersService, AccountDeletionService],
})
export class UsersModule {}
