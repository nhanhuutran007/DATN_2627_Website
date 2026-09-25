import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { USER_PRIVATE_GROUP, User, UserRole } from "./entities/user.entity";
import { UpdateUserDto, UpdateRoleDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
// Mọi route ở đây chỉ dành cho chính chủ hoặc admin → được thấy email/phone
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get("me")
  getMe(@GetCurrentUser() user: User) {
    return user;
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @GetCurrentUser() currentUser: User,
  ) {
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only update your own profile");
    }
    return this.usersService.update(id, dto, currentUser);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN)
  updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @GetCurrentUser() currentUser: User,
  ) {
    return this.usersService.updateRole(id, dto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() currentUser: User) {
    return this.usersService.remove(id, currentUser);
  }
}
