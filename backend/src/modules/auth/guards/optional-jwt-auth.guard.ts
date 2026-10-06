import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

import type { User } from "../../users/entities/user.entity";

/**
 * Đăng nhập tùy chọn: có token hợp lệ thì gắn `request.user`, không có hoặc
 * token hết hạn/bị thu hồi thì coi như khách (`user = null`) thay vì 401 —
 * trình duyệt còn giữ token cũ vẫn xem/ghi lượt xem/gợi ý như khách.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.headers?.authorization) {
      request.user = null;
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = User | null>(_err: unknown, user: TUser | false): TUser {
    return (user || null) as TUser;
  }
}
