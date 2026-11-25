import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BehaviorEvent } from "../ai/entities/behavior-event.entity";
import { UserBankAccount } from "./entities/user-bank-account.entity";
import { User } from "./entities/user.entity";
import { UserBankAccountService } from "./user-bank-account.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserBankAccount, BehaviorEvent])],
  controllers: [UsersController],
  providers: [UsersService, UserBankAccountService],
  exports: [UsersService],
})
export class UsersModule {}
