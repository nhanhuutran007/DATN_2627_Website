import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
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
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  create(@Body() dto: CreateDonationDto, @GetCurrentUser() user: User) {
    return this.donationsService.create(dto, user);
  }

  /** Kênh thanh toán đang bật (công khai, không chứa số tài khoản). */
  @Get("payment-options")
  paymentOptions() {
    return this.donationsService.paymentOptions();
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

  /** Người ủng hộ hủy đơn đang chờ thanh toán. */
  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  cancel(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.donationsService.cancel(id, user);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  findMine(@GetCurrentUser() user: User) {
    return this.donationsService.findMine(user.id);
  }

  /** Hỏi lại SePay trạng thái đơn khi IPN không tới (người ủng hộ của đơn hoặc admin). */
  @Post(":id/sepay-sync")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyPrefix: "sepay-sync" })
  sepaySync(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.donationsService.syncSepayDonation(id, user);
  }

  /** Form có chữ ký để trình duyệt chuyển sang trang thanh toán SePay (chỉ người ủng hộ). */
  @Post(":id/sepay-checkout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  sepayCheckout(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.donationsService.createSepayCheckout(id, user);
  }

  @Get(":id/receipt")
  @UseGuards(JwtAuthGuard)
  receipt(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.donationsService.getReceipt(id, user);
  }

  /** Chỉ người ủng hộ hoặc admin xem được (trước đây mọi người đăng nhập đều xem được). */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.donationsService.findForUser(id, user);
  }
}
