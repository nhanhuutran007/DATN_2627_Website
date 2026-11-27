import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";

/** Phần tối thiểu của DataSource mà khóa cần (test tự fake được). */
export interface LockQueryRunner {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

/**
 * Giành "hợp đồng thuê" nguyên tử: chưa có dòng → tạo; hết hạn → đổi chủ; còn hạn → giữ nguyên.
 * `locked_by` gán trước `locked_until` để vẫn so với hạn cũ. Giờ lấy từ MySQL (UTC_TIMESTAMP) nên
 * đồng hồ lệch giữa các instance không ảnh hưởng.
 *
 * Không dựa vào affectedRows: mysql2 bật cờ CLIENT_FOUND_ROWS nên dòng "giữ nguyên" vẫn trả 1, không
 * phân biệt được với dòng vừa tạo. Thay vào đó mỗi lần thử ghi một mã riêng rồi đọc lại chủ khóa.
 */
const ACQUIRE_SQL = `
  INSERT INTO scheduler_locks (name, locked_until, locked_by)
  VALUES (?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND), ?)
  ON DUPLICATE KEY UPDATE
    locked_by = IF(locked_until <= UTC_TIMESTAMP(3), VALUES(locked_by), locked_by),
    locked_until = IF(locked_until <= UTC_TIMESTAMP(3), VALUES(locked_until), locked_until)
`;
const OWNER_SQL = `SELECT locked_by FROM scheduler_locks WHERE name = ?`;

function lockedBy(result: unknown): string | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  const row: unknown = result[0];
  if (row && typeof row === "object" && "locked_by" in row) {
    const value = (row as { locked_by: unknown }).locked_by;
    return typeof value === "string" ? value : null;
  }
  return null;
}

/**
 * Khóa cho job định kỳ khi chạy nhiều instance backend (ECS sau ALB). Mỗi lượt cron, instance đầu tiên
 * giành được khóa sẽ chạy job; khóa không nhả sớm mà hết hạn sau `leaseSeconds` (ngắn hơn chu kỳ job)
 * để instance chạy chậm vài giây không chạy lại cùng lượt.
 */
@Injectable()
export class SchedulerLockService implements OnModuleInit, OnModuleDestroy {
  private static active: SchedulerLockService | null = null;
  private readonly logger = new Logger(SchedulerLockService.name);
  readonly owner = `${hostname()}:${process.pid}`;

  // Kiểu interface làm metadata thành Object nên phải chỉ rõ token DataSource.
  constructor(@Inject(DataSource) private readonly dataSource: LockQueryRunner) {}

  /** Khóa đang dùng cho `@ExclusiveJob`; null khi chưa khởi động Nest (unit test gọi thẳng job). */
  static current(): SchedulerLockService | null {
    return SchedulerLockService.active;
  }

  onModuleInit(): void {
    SchedulerLockService.active = this;
  }

  onModuleDestroy(): void {
    if (SchedulerLockService.active === this) SchedulerLockService.active = null;
  }

  /**
   * true = instance này được chạy job lượt này. Lỗi CSDL → false (bỏ lượt, lượt sau thử lại) vì chạy
   * trùng job tiền (quyết toán, hoàn tiền) nguy hiểm hơn chạy trễ một chu kỳ.
   */
  async tryAcquire(name: string, leaseSeconds: number): Promise<boolean> {
    const token = `${this.owner}:${randomUUID()}`.slice(0, 120);
    try {
      await this.dataSource.query(ACQUIRE_SQL, [name, Math.max(1, Math.floor(leaseSeconds)), token]);
      return lockedBy(await this.dataSource.query(OWNER_SQL, [name])) === token;
    } catch (error) {
      this.logger.error(
        `Không lấy được khóa job "${name}", bỏ qua lượt này: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
