import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { AuditLogQueryDto } from "../../common/audit/audit.dto";
import { AuditService } from "../../common/audit/audit.service";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { AdminService } from "./admin.service";
import {
  AdminCampaignQueryDto,
  AdminDonationQueryDto,
  AdminUserQueryDto,
  RiskQueryDto,
  UpdateRiskStatusDto,
  UpdateUserStatusDto,
} from "./dto/admin.dto";
import { RiskAlertService } from "./risk-alert.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly riskAlertService: RiskAlertService,
    private readonly auditService: AuditService,
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

  @Patch("users/:id/status")
  updateUserStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.adminService.updateUserStatus(id, dto, currentUser);
  }
}