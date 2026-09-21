import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { User } from "../users/entities/user.entity";
import {
  ConfirmDonationDto,
  CreateDonationDto,
  WebhookDonationDto,
} from "./dto/donation.dto";
import { DonationsService } from "./donations.service";

@Controller("donations")
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateDonationDto, @GetCurrentUser() user: User) {
    return this.donationsService.create(dto, user);
  }

  @Post("webhook")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "donation-webhook" })
  webhook(
    @Body() dto: WebhookDonationDto,
    @Headers("x-signature") signature?: string,
  ) {
    return this.donationsService.handleWebhook(dto, signature);
  }

  @Post(":id/confirm")
  @UseGuards(JwtAuthGuard)
  confirm(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfirmDonationDto,
    @GetCurrentUser() user: User,
  ) {
    return this.donationsService.confirmDemoPayment(id, dto.status, user);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  findMine(@GetCurrentUser() user: User) {
    return this.donationsService.findMine(user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.donationsService.findById(id);
  }
}
