import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { CreateRewardTierDto, UpdateRewardTierDto } from "./dto/reward.dto";
import { RewardsService } from "./rewards.service";

@Controller()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  /** Công khai: các mức quà đang nhận. */
  @Get("campaigns/:campaignId/reward-tiers")
  listPublic(@Param("campaignId", ParseUUIDPipe) campaignId: string) {
    return this.rewardsService.listPublic(campaignId);
  }

  /** Chủ dự án/admin: mọi mức quà (kể cả đang tắt). */
  @Get("campaigns/:campaignId/reward-tiers/manage")
  @UseGuards(JwtAuthGuard)
  listForManage(@Param("campaignId", ParseUUIDPipe) campaignId: string, @GetCurrentUser() user: User) {
    return this.rewardsService.listForManage(campaignId, user);
  }

  @Get("campaigns/:campaignId/reward-claims")
  @UseGuards(JwtAuthGuard)
  listClaims(@Param("campaignId", ParseUUIDPipe) campaignId: string, @GetCurrentUser() user: User) {
    return this.rewardsService.listClaims(campaignId, user);
  }

  @Post("campaigns/:campaignId/reward-tiers")
  @UseGuards(JwtAuthGuard)
  create(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateRewardTierDto,
    @GetCurrentUser() user: User,
  ) {
    return this.rewardsService.create(campaignId, dto, user);
  }

  @Patch("reward-tiers/:id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateRewardTierDto, @GetCurrentUser() user: User) {
    return this.rewardsService.update(id, dto, user);
  }

  @Delete("reward-tiers/:id")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    await this.rewardsService.remove(id, user);
    return { deleted: true };
  }
}
