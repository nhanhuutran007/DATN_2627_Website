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
import { Roles } from "../auth/decorators/roles.decorator";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CategoriesService } from "../categories/categories.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { User, UserRole } from "../users/entities/user.entity";
import { CampaignsService } from "./campaigns.service";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  CancelCampaignDto,
  PublishCampaignDto,
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

  /** Đăng nhập tùy chọn: chiến dịch chưa phát hành chỉ chủ dự án và admin xem được. */
  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user?: User | null) {
    return this.campaignsService.findVisible(id, user ?? null);
  }

  @Post()
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  async create(@Body() dto: CreateCampaignDto, @GetCurrentUser() user: User) {
    await this.categoriesService.assertUsable(dto.category);
    if (dto.organizationId) await this.organizationsService.assertCanReceiveCampaigns(dto.organizationId, user);
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
    if (dto.organizationId) await this.organizationsService.assertCanReceiveCampaigns(dto.organizationId, user);
    return this.campaignsService.update(id, dto, user);
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  submit(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.campaignsService.submitForReview(id, user);
  }

  /** Chủ dự án tự phát hành sau khi được duyệt (approved → active); có thể chọn lại ngày kết thúc. */
  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PublishCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    return this.campaignsService.publish(id, user, dto.endDate);
  }

  /** Chủ dự án tự hủy (không xóa): lý do bắt buộc, công khai; cam kết chưa trả được nhả tự động. */
  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelCampaignDto,
    @GetCurrentUser() user: User,
  ) {
    return this.campaignsService.cancelByOwner(id, dto, user);
  }

  @Patch(":id/moderate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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