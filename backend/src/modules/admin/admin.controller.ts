import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { AuditLogQueryDto } from "../../common/audit/audit.dto";
import { AuditService } from "../../common/audit/audit.service";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import { AdminService } from "./admin.service";
import { ContentService } from "./content.service";
import {
  AdminCampaignQueryDto,
  AdminDonationQueryDto,
  AdminUserQueryDto,
  ExportRangeQueryDto,
  RiskQueryDto,
  SetFeaturedDto,
  UpdateRiskStatusDto,
  UpdateUserStatusDto,
} from "./dto/admin.dto";
import { type CsvFile, ExportService } from "./export.service";
import { RiskAlertService } from "./risk-alert.service";

function sendCsv(res: Response, file: CsvFile): void {
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${file.filename}"`,
    "Cache-Control": "no-store",
  });
  res.send(file.content);
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly riskAlertService: RiskAlertService,
    private readonly auditService: AuditService,
    private readonly contentService: ContentService,
    private readonly exportService: ExportService,
  ) {}

  @Get("overview")
  overview() {
    return this.adminService.getOverview();
  }

  @Get("campaigns")
  campaigns(@Query() query: AdminCampaignQueryDto) {
    return this.adminService.listCampaigns(query);
  }

  @Get("donations")
  donations(@Query() query: AdminDonationQueryDto) {
    return this.adminService.listDonations(query);
  }

  @Get("users")
  users(@Query() query: AdminUserQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get("audit-logs")
  auditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.list(query);
  }

  @Get("risks")
  risks(@Query() query: RiskQueryDto) {
    return this.riskAlertService.list(query);
  }

  @Post("risks/generate")
  generateRisks(@GetCurrentUser() currentUser: User) {
    return this.riskAlertService.generateWarnings(currentUser);
  }

  @Patch("risks/:id/status")
  updateRiskStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRiskStatusDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.riskAlertService.updateStatus(id, dto, currentUser);
  }

  /** Chọn/bỏ dự án nổi bật ở trang chủ (tối đa 6). */
  @Patch("campaigns/:id/featured")
  setFeatured(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetFeaturedDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.contentService.setFeatured(id, dto.featured, currentUser);
  }

  /** Thống kê theo chiến dịch (CSV, không dữ liệu cá nhân). */
  @Get("exports/campaigns")
  async exportCampaigns(@GetCurrentUser() currentUser: User, @Res() res: Response): Promise<void> {
    sendCsv(res, await this.exportService.exportCampaigns(currentUser));
  }

  /** Ủng hộ theo ngày × lĩnh vực (CSV tổng hợp). */
  @Get("exports/donations-daily")
  async exportDailyDonations(
    @Query() query: ExportRangeQueryDto,
    @GetCurrentUser() currentUser: User,
    @Res() res: Response,
  ): Promise<void> {
    sendCsv(res, await this.exportService.exportDailyDonations(query, currentUser));
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.adminService.updateUserStatus(id, dto, currentUser);
  }
}