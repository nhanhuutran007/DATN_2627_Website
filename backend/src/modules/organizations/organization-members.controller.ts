import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { User } from "../users/entities/user.entity";
import { InviteMemberDto, UpdateMemberDto } from "./dto/organization-member.dto";
import { OrganizationMembersService } from "./organization-members.service";

/** Cộng tác viên của tổ chức: đội ngũ công khai, quản lý của người đại diện, lời mời. */
@Controller()
export class OrganizationMembersController {
  constructor(private readonly membersService: OrganizationMembersService) {}

  /** Đội ngũ công khai trên trang tổ chức đã xác minh. */
  @Get("organizations/:slug/team")
  team(@Param("slug") slug: string) {
    return this.membersService.publicTeam(slug);
  }

  @Get("organizations/:id/members")
  @UseGuards(JwtAuthGuard)
  list(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.membersService.list(id, user);
  }

  @Post("organizations/:id/members")
  @UseGuards(JwtAuthGuard, NonAdminGuard, RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 3_600_000, keyPrefix: "organization-invite" })
  invite(@Param("id", ParseUUIDPipe) id: string, @Body() dto: InviteMemberDto, @GetCurrentUser() user: User) {
    return this.membersService.invite(id, dto, user);
  }

  @Patch("organizations/:id/members/:memberId")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
    @GetCurrentUser() user: User,
  ) {
    return this.membersService.update(id, memberId, dto, user);
  }

  /** Người đại diện gỡ cộng tác viên/thu hồi lời mời, hoặc cộng tác viên tự rời. */
  @Delete("organizations/:id/members/:memberId")
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @GetCurrentUser() user: User,
  ) {
    await this.membersService.remove(id, memberId, user);
    return { removed: true };
  }

  /** Lời mời đang chờ và các tổ chức mình đang cộng tác. */
  @Get("users/me/organization-collaborations")
  @UseGuards(JwtAuthGuard)
  mine(@GetCurrentUser() user: User) {
    return this.membersService.myCollaborations(user);
  }

  @Post("organization-invitations/:memberId/accept")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, NonAdminGuard)
  accept(@Param("memberId", ParseUUIDPipe) memberId: string, @GetCurrentUser() user: User) {
    return this.membersService.accept(memberId, user);
  }

  @Post("organization-invitations/:memberId/decline")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async decline(@Param("memberId", ParseUUIDPipe) memberId: string, @GetCurrentUser() user: User) {
    await this.membersService.decline(memberId, user);
    return { declined: true };
  }
}
