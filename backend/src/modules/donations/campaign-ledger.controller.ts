import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";

import { DonationsService } from "./donations.service";

/** Sổ cái giao dịch công khai theo chiến dịch (không cần đăng nhập). */
@Controller("campaigns")
export class CampaignLedgerController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get(":id/donations")
  ledger(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.donationsService.listPublicLedger(id, limit);
  }
}
