import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, Between, FindOperator, FindOptionsWhere, In, LessThanOrEqual, Like, MoreThanOrEqual, Not, Repository } from "typeorm";

import { AuditLog } from "../entities/audit-log.entity";
import { AUDIT_ACTION_GROUPS, AUDIT_SESSION_ACTIONS, AuditLogQueryDto } from "./audit.dto";
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

/** Bản ghi kèm tên người thực hiện và tên đối tượng (nếu còn tồn tại) để admin đọc được. */
export type AuditLogView = AuditLog & {
  actor: { name: string; email: string } | null;
  entityLabel: string | null;
};

export type AuditLogListResult = {
  items: AuditLogView[];
  total: number;
  limit: number;
  offset: number;
};

const MAX_LOGGED_STRING = 500;

/** Bảng và cột tên để hiển thị đối tượng thay cho mã id. */
const ENTITY_LABEL_SOURCES: Record<string, { table: string; column: string }> = {
  user: { table: "users", column: "name" },
  campaign: { table: "campaigns", column: "title" },
  category: { table: "categories", column: "name" },
  milestone: { table: "milestones", column: "title" },
};

/** "yyyy-mm-dd" theo giờ Việt Nam → mốc thời gian đầu/cuối ngày. */
const vnDayStart = (day: string) => new Date(`${day.slice(0, 10)}T00:00:00.000+07:00`);
const vnDayEnd = (day: string) => new Date(`${day.slice(0, 10)}T23:59:59.999+07:00`);

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
    const base: FindOptionsWhere<AuditLog> = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    if (query.from && query.to) base.createdAt = Between(vnDayStart(query.from), vnDayEnd(query.to));
    else if (query.from) base.createdAt = MoreThanOrEqual(vnDayStart(query.from));
    else if (query.to) base.createdAt = LessThanOrEqual(vnDayEnd(query.to));

    // Điều kiện trên cột action: mã cụ thể, hoặc tiền tố nhóm (OR giữa các tiền tố), có thể kèm ẩn đăng nhập/đăng xuất.
    const hide = query.hideSessions ? Not(In(AUDIT_SESSION_ACTIONS)) : undefined;
    const withHide = (condition: FindOperator<string> | string) => (hide ? And(condition as FindOperator<string>, hide) : condition);
    let where: FindOptionsWhere<AuditLog> | FindOptionsWhere<AuditLog>[];
    if (query.action) {
      where = { ...base, action: query.action };
    } else if (query.group) {
      where = AUDIT_ACTION_GROUPS[query.group].map((prefix) => ({ ...base, action: withHide(Like(`${prefix}%`)) }));
    } else {
      where = hide ? { ...base, action: hide } : base;
    }

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items: await this.describe(items), total, limit, offset };
  }

  /** Gắn tên người thực hiện và tên đối tượng (mỗi loại một truy vấn IN cho cả trang). */
  private async describe(items: AuditLog[]): Promise<AuditLogView[]> {
    const idsByEntity = new Map<string, Set<string>>();
    const addId = (entity: string, id: string | null | undefined) => {
      if (!id || !ENTITY_LABEL_SOURCES[entity]) return;
      if (!idsByEntity.has(entity)) idsByEntity.set(entity, new Set());
      idsByEntity.get(entity)!.add(id);
    };
    for (const item of items) {
      addId("user", item.userId);
      addId(item.entity, item.entityId);
    }

    const labels = new Map<string, string>();
    const actors = new Map<string, { name: string; email: string }>();
    try {
      await Promise.all(
        [...idsByEntity].map(async ([entity, ids]) => {
          const { table, column } = ENTITY_LABEL_SOURCES[entity];
          const extra = entity === "user" ? ", `email`" : "";
          const rows: Array<{ id: string; label: string; email?: string }> = await this.auditRepo.manager.query(
            `SELECT \`id\`, \`${column}\` AS label${extra} FROM \`${table}\` WHERE \`id\` IN (?)`,
            [[...ids]],
          );
          for (const row of rows) {
            labels.set(`${entity}:${row.id}`, row.label);
            if (entity === "user") actors.set(row.id, { name: row.label, email: row.email ?? "" });
          }
        }),
      );
    } catch (error) {
      // Thiếu tên chỉ làm bảng kém dễ đọc, không chặn việc xem nhật ký.
      this.logger.warn(`Không tra được tên cho nhật ký: ${error instanceof Error ? error.message : String(error)}`);
    }

    return items.map((item) =>
      Object.assign(item, {
        actor: item.userId ? actors.get(item.userId) ?? null : null,
        entityLabel: item.entityId ? labels.get(`${item.entity}:${item.entityId}`) ?? null : null,
      }),
    );
  }
}
