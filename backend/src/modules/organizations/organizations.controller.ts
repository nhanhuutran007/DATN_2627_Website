import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CategoriesService } from "../categories/categories.service";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import {
  AdminOrganizationQueryDto,
  CreateOrganizationDto,
  OrganizationQueryDto,
  ReviewOrganizationDto,
  UpdateOrganizationDto,
} from "./dto/organization.dto";
import { OrganizationsService } from "./organizations.service";

/** Danh bạ tổ chức đã xác minh (công khai) và hồ sơ của người đại diện. */
@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  list(@Query() query: OrganizationQueryDto) {
    return this.organizationsService.listPublic(query);
  }

  /** Hồ sơ mình đại diện (mọi trạng thái), kèm ảnh giấy phép và ghi chú của admin. */
  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
  mine(@GetCurrentUser() user: User) {
    return this.organizationsService.listMine(user);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.organizationsService.findPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, NonAdminGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 3_600_000, keyPrefix: "organization-create" })
  @SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
  async create(@Body() dto: CreateOrganizationDto, @GetCurrentUser() user: User) {
    if (dto.category) await this.categoriesService.assertUsable(dto.category);
    return this.organizationsService.create(dto, user);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @GetCurrentUser() user: User,
  ) {
    if (dto.category) await this.categoriesService.assertUsable(dto.category);
    return this.organizationsService.update(id, dto, user);
  }
}

/** Xác minh tổ chức: admin xem giấy phép rồi quyết định (human-in-the-loop). */
@Controller("admin/organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class AdminOrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  list(@Query() query: AdminOrganizationQueryDto) {
    return this.organizationsService.adminList(query);
  }

  @Patch(":id/review")
  review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewOrganizationDto,
    @GetCurrentUser() admin: User,
  ) {
    return this.organizationsService.review(id, dto, admin);
  }
}
