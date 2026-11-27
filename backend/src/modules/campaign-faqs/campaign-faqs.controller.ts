import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { CampaignFaqsService } from "./campaign-faqs.service";
import { CreateCampaignFaqDto, UpdateCampaignFaqDto } from "./dto/campaign-faq.dto";

@Controller()
export class CampaignFaqsController {
  constructor(private readonly faqsService: CampaignFaqsService) {}

  /** Công khai: câu hỏi thường gặp của dự án đã công khai. */
  @Get("campaigns/:campaignId/faqs")
  listPublic(@Param("campaignId", ParseUUIDPipe) campaignId: string) {
    return this.faqsService.listPublic(campaignId);
  }

  /** Chủ dự án/cộng tác viên/admin: FAQ ở mọi trạng thái. */
  @Get("campaigns/:campaignId/faqs/manage")
  @UseGuards(JwtAuthGuard)
  listForManage(@Param("campaignId", ParseUUIDPipe) campaignId: string, @GetCurrentUser() user: User) {
    return this.faqsService.listForManage(campaignId, user);
  }

  @Post("campaigns/:campaignId/faqs")
  @UseGuards(JwtAuthGuard)
  create(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateCampaignFaqDto,
    @GetCurrentUser() user: User,
  ) {
    return this.faqsService.create(campaignId, dto, user);
  }

  @Patch("campaign-faqs/:id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignFaqDto, @GetCurrentUser() user: User) {
    return this.faqsService.update(id, dto, user);
  }

  @Delete("campaign-faqs/:id")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    await this.faqsService.remove(id, user);
    return { deleted: true };
  }
}
