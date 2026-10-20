import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRole } from "../../users/entities/user.entity";

/**
 * Tài khoản quản trị chỉ dùng để quản trị: không tạo chiến dịch, ủng hộ, bình luận, theo dõi,
 * báo cáo hay yêu cầu hoàn tiền — tránh xung đột lợi ích khi chính admin duyệt/xử lý các việc đó.
 * Đặt sau JwtAuthGuard để request.user đã có.
 */
@Injectable()
export class NonAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin accounts cannot perform user actions; use a regular account");
    }
    return true;
  }
}
