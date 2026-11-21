import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SepayGateway, sepayConfigFromEnv } from "../../integrations/payment/sepay";
import { MediaFile } from "../media/entities/media-file.entity";
import { Wallet, WalletTopup, WalletTransaction, WalletWithdrawal } from "./entities/wallet.entity";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { AdminWithdrawalsController, WithdrawalsController } from "./withdrawals.controller";
import { WithdrawalsService } from "./withdrawals.service";

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, WalletTopup, WalletWithdrawal, MediaFile])],
  controllers: [WalletController, WithdrawalsController, AdminWithdrawalsController],
  providers: [
    WalletService,
    WithdrawalsService,
    {
      // Cùng cấu hình SePay với khoản ủng hộ; null = chưa cấu hình (chỉ nạp thử ở demo).
      provide: "WalletSepayGateway",
      useFactory: () => {
        const config = sepayConfigFromEnv();
        return config ? new SepayGateway(config) : null;
      },
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
