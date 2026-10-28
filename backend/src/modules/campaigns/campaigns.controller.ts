import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { CategoriesService } from "../categories/categories.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { User } from "../users/entities/user.entity";
import { CampaignsService } from "./campaigns.service";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";

@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly categoriesService: CategoriesService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  findAll(@Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(query);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  findMine(@Query() query: CampaignQueryDto, @GetCurrentUser() user: User) {
    return this.campaignsService.findAll(query, user.id);
  }

  /** Thống kê công khai toàn nền tảng (tính từ dữ liệu thật, không số mô phỏng). */
  @Get("stats")
  stats() {
    return this.campaignsService.getPlatformStats();
  }

  /** Nút "Liên hệ": phải đăng nhập và giới hạn tần suất để hạn chế dò quét thông tin liên hệ. */
  @Get(":id/contact")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyPrefix: "campaign-contact" })
  contact(@Param("id", ParseUUIDPipe) id: string) {
    return this.campaignsService.getContact(id);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.campaignsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  async create(@Body() dto: CreateCampaignDto, @GetCurrentUser() user: User) {
    await this.categoriesService.assertUsable(dto.category);
    if (dto.organizationId) await this.organizationsService.assertCanReceiveCampaigns(dto.organizationId);
    return this.campaignsService.create(dto, user);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    if (dto.category !== undefined) {
      await this.categoriesService.assertUsable(dto.category);
    }
    if (dto.organizationId) await this.organizationsService.assertCanReceiveCampaigns(dto.organizationId);
    return this.campaignsService.update(id, dto, user);
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  submit(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.campaignsService.submitForReview(id, user);
  }

  @Patch(":id/moderate")
  @UseGuards(JwtAuthGuard)
  moderate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ModerateCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    return this.campaignsService.moderate(id, dto, user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.campaignsService.remove(id, user);
  }
}