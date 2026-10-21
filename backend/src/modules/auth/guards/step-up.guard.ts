import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { StepUpPurpose } from "../entities/step-up-code.entity";
import { StepUpService } from "../step-up.service";

export const STEP_UP_KEY = "stepUpPurpose";
export const STEP_UP_HEADER = "x-step-up-token";

/** Đánh dấu endpoint cần mã OTP qua email (dùng kèm `StepUpGuard`). */
export const RequireStepUp = (purpose: StepUpPurpose) => SetMetadata(STEP_UP_KEY, purpose);

/**
 * Chặn thao tác nhạy cảm khi chưa xác minh bổ sung. Đặt sau JwtAuthGuard để request.user đã có;
 * step-up token gửi ở header `X-Step-Up-Token`.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly stepUpService: StepUpService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const purpose = this.reflector.getAllAndOverride<StepUpPurpose | undefined>(STEP_UP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!purpose) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.[STEP_UP_HEADER];
    const token = Array.isArray(header) ? header[0] : header;
    this.stepUpService.assertToken(request.user, purpose, token);
    return true;
  }
}
