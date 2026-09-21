import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";

import { AuditLog } from "../entities/audit-log.entity";
import { AuditLogQueryDto } from "./audit.dto";
import { requestContext } from "./request-context";

export type AuditEntry = {
  /** Người thực hiện; bỏ trống khi hành động do hệ thống/webhook thực hiện. */
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
};

export type AuditLogListResult = {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

const MAX_LOGGED_STRING = 500;

/** Rút gọn chuỗi dài (mô tả, câu chuyện) để bản ghi audit không phình to. */
export function truncateForAudit(value: unknown): unknown {
  return typeof value === "string" && value.length > MAX_LOGGED_STRING
    ? `${value.slice(0, MAX_LOGGED_STRING)}…`
    : value;
}

/**
 * Ghi nhật ký kiểm toán cho các thay đổi quan trọng (duyệt, đổi trạng thái,
 * thanh toán, đăng nhập, hành động quản trị). Bản ghi chỉ được thêm, không sửa/xóa.
 * IP và user-agent được lấy từ request hiện tại nếu có.
 * Lỗi ghi log được đưa vào logger và không làm hỏng nghiệp vụ chính.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    const meta = requestContext.getStore();
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: entry.userId ?? undefined,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to write audit log ${entry.action} ${entry.entity}:${entry.entityId ?? "-"}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async list(query: AuditLogQueryDto): Promise<AuditLogListResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: FindOptionsWhere<AuditLog> = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, limit, offset };
  }
}
