import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import { AuditLogQueryDto } from "../../common/audit/audit.dto";
import { AuditService } from "../../common/audit/audit.service";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { DonationsService } from "../donations/donations.service";
import { USER_PRIVATE_GROUP, User, UserRole, UserStatus } from "../users/entities/user.entity";
import { AdminService } from "./admin.service";
import { BackupService, MAX_BACKUP_BYTES } from "./backup.service";
import { ContentService } from "./content.service";
import {
  AdminCampaignQueryDto,
  AdminDonationQueryDto,
  AdminUserQueryDto,
  ExportRangeQueryDto,
  PledgeResetDto,
  VoidSuspectPledgesDto,
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
    private readonly backupService: BackupService,
    private readonly donationsService: DonationsService,
  ) {}

  /** Lần sao lưu gần nhất và phiên bản cấu trúc CSDL hiện tại (để kiểm tra file trước khi khôi phục). */
  @Get("backup/status")
  backupStatus() {
    return this.backupService.status();
  }

  /** Tải về bản sao lưu toàn bộ dữ liệu (JSON nén gzip); chứa dữ liệu cá nhân nên cần OTP. */
  @Get("backup/export")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_BACKUP)
  async exportBackup(@GetCurrentUser() currentUser: User, @Res() res: Response): Promise<void> {
    const file = await this.backupService.exportBackup(currentUser);
    res.set({
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    });
    res.send(file.content);
  }

  /** Ghi đè toàn bộ dữ liệu bằng file sao lưu; bắt buộc gửi kèm chuỗi xác nhận. */
  @Post("backup/restore")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_BACKUP)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BACKUP_BYTES, files: 1 } }))
  restoreBackup(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body("confirm") confirm: string | undefined,
    @GetCurrentUser() currentUser: User,
  ) {
    if (!file) {
      throw new BadRequestException("Chưa chọn file sao lưu.");
    }
    return this.backupService.restoreBackup(file.buffer, confirm, currentUser);
  }

  @Get("overview")
  overview() {
    return this.adminService.getOverview();
  }

  /** Số việc cần xử lý cho badge trên sidebar. */
  @Get("nav-counts")
  navCounts() {
    return this.adminService.navCounts();
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

  @Get("users/:id")
  userDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
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
    return this.riskAlertService.generateWarnings(currentUser, 50);
  }

  /** Tài khoản nghi là clone cam kết thổi phồng chiến dịch, kèm dấu hiệu của từng tài khoản. */
  @Get("campaigns/:id/pledge-suspects")
  pledgeSuspects(@Param("id", ParseUUIDPipe) id: string) {
    return this.riskAlertService.pledgeSuspects(id);
  }

  /** Hủy cam kết chưa trả của các tài khoản đã chọn (tùy chọn khóa luôn): cần OTP. */
  @Post("campaigns/:id/pledge-suspects/void")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_USERS)
  async voidSuspectPledges(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VoidSuspectPledgesDto,
    @GetCurrentUser() currentUser: User,
  ) {
    const reason = dto.reason.trim();
    const result = await this.donationsService.voidSuspectPledges(id, dto.userIds, currentUser, reason);
    let locked = 0;
    if (dto.lockAccounts) {
      for (const userId of dto.userIds) {
        // Bỏ qua tài khoản không khóa được (admin, chính mình, không tồn tại).
        const done = await this.adminService
          .updateUserStatus(userId, { status: UserStatus.BANNED, reason: `Nghi tài khoản clone: ${reason}` }, currentUser)
          .then(() => true, () => false);
        if (done) locked += 1;
      }
    }
    return { ...result, locked };
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

  /** Mở lại quyền cam kết trả sau cho tài khoản đã bị giới hạn/chặn vì bỏ cam kết. */
  @Post("users/:id/pledge-reset")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_USERS)
  resetPledgeStanding(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PledgeResetDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.adminService.resetPledgeStanding(id, dto.reason, currentUser);
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