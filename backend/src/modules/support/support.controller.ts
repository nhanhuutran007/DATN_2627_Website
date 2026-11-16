import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { UpdateSupportContactDto } from "./dto/support-contact.dto";
import { SupportService } from "./support.service";

/** Liên hệ hỗ trợ công khai (trang /lien-he, footer, chính sách quyền riêng tư). */
@Controller("support-contact")
export class SupportContactController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  get() {
    return this.supportService.getContact();
  }
}

/** Admin cập nhật thông tin liên hệ hỗ trợ; mỗi lần lưu ghi nhật ký kiểm toán. */
@Controller("admin/support-contact")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSupportContactController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  get() {
    return this.supportService.getContact();
  }

  @Patch()
  update(@Body() dto: UpdateSupportContactDto, @GetCurrentUser() admin: User) {
    return this.supportService.updateContact(dto, admin);
  }
}
