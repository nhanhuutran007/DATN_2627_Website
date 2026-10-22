import { gunzipSync, gzipSync } from "node:zlib";

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { User } from "../users/entities/user.entity";

export const BACKUP_FORMAT = "gopmam-backup";
export const BACKUP_VERSION = 1;
/** Chuỗi admin phải gõ để xác nhận khôi phục (ghi đè toàn bộ dữ liệu). */
export const RESTORE_CONFIRMATION = "KHÔI PHỤC";
/** Giới hạn file tải lên khi khôi phục (đã nén). */
export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

/** Bảng lịch sử migration mô tả cấu trúc, không phải dữ liệu: không sao lưu/ghi đè. */
const SKIPPED_TABLES = new Set(["migrations", "typeorm_metadata"]);
const INSERT_BATCH = 500;
const DATE_TYPES = new Set(["datetime", "timestamp", "date"]);

type ColumnInfo = { name: string; dataType: string };
type TableSchema = Map<string, ColumnInfo[]>;

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  /** Migration mới nhất lúc sao lưu: chỉ khôi phục vào CSDL cùng cấu trúc. */
  schemaVersion: string | null;
  tables: Record<string, Record<string, unknown>[]>;
};

export type BackupStatus = {
  /** Migration mới nhất của CSDL hiện tại; file sao lưu phải cùng giá trị mới khôi phục được. */
  schemaVersion: string | null;
  maxBytes: number;
  lastBackup: { createdAt: string; by: string | null; rows: number | null; bytes: number | null } | null;
};

export type RestoreResult = {
  tables: number;
  rows: number;
  createdAt: string;
};

/**
 * Sao lưu / khôi phục toàn bộ dữ liệu ở tầng ứng dụng (không cần mysqldump):
 * đọc mọi bảng thành JSON nén gzip, khôi phục bằng cách xóa rồi chèn lại
 * trong một transaction — lỗi giữa chừng thì dữ liệu cũ được giữ nguyên.
 * Ảnh tải lên nằm ở kho lưu trữ (volume/S3), file sao lưu chỉ chứa đường dẫn.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async status(): Promise<BackupStatus> {
    const [schemaVersion, [last]] = await Promise.all([
      this.readSchemaVersion(),
      this.dataSource.query(
        "SELECT a.`created_at` AS createdAt, a.`new_values` AS newValues, u.`email` AS email " +
          "FROM `audit_logs` a LEFT JOIN `users` u ON u.`id` = a.`user_id` " +
          "WHERE a.`action` = 'backup.export' ORDER BY a.`created_at` DESC LIMIT 1",
      ) as Promise<Array<{ createdAt: Date | string; newValues: unknown; email: string | null }>>,
    ]);
    let lastBackup: BackupStatus["lastBackup"] = null;
    if (last) {
      // mysql2 trả cột JSON đã parse; phòng trường hợp driver trả chuỗi.
      const values = (typeof last.newValues === "string" ? JSON.parse(last.newValues) : last.newValues) as
        | { rows?: number; bytes?: number }
        | null;
      lastBackup = {
        createdAt: new Date(last.createdAt).toISOString(),
        by: last.email ?? null,
        rows: typeof values?.rows === "number" ? values.rows : null,
        bytes: typeof values?.bytes === "number" ? values.bytes : null,
      };
    }
    return { schemaVersion, maxBytes: MAX_BACKUP_BYTES, lastBackup };
  }

  async exportBackup(admin: User): Promise<{ filename: string; content: Buffer; rows: number }> {
    const schema = await this.readSchema();
    const tables: BackupFile["tables"] = {};
    let rows = 0;
    for (const table of schema.keys()) {
      const data: Record<string, unknown>[] = await this.dataSource.query(`SELECT * FROM \`${table}\``);
      tables[table] = data;
      rows += data.length;
    }

    const now = new Date();
    const backup: BackupFile = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: now.toISOString(),
      schemaVersion: await this.readSchemaVersion(),
      tables,
    };
    const content = gzipSync(Buffer.from(JSON.stringify(backup), "utf8"));

    await this.auditService.record({
      userId: admin.id,
      action: "backup.export",
      entity: "system",
      newValues: { tables: schema.size, rows, bytes: content.length },
    });

    const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
    return { filename: `gopmam-sao-luu-${stamp}.json.gz`, content, rows };
  }

  async restoreBackup(file: Buffer, confirmation: string | undefined, admin: User): Promise<RestoreResult> {
    if (confirmation?.trim() !== RESTORE_CONFIRMATION) {
      throw new BadRequestException(`Cần gõ "${RESTORE_CONFIRMATION}" để xác nhận khôi phục.`);
    }
    const backup = this.parse(file);
    const schema = await this.readSchema();
    await this.validate(backup, schema);

    let rows = 0;
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // Tắt kiểm tra khóa ngoại trong phiên này để xóa/chèn không phụ thuộc thứ tự bảng.
      await runner.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const table of schema.keys()) {
        await runner.query(`DELETE FROM \`${table}\``);
      }
      for (const [table, columns] of schema) {
        const data = backup.tables[table] ?? [];
        rows += data.length;
        for (let start = 0; start < data.length; start += INSERT_BATCH) {
          const batch = data.slice(start, start + INSERT_BATCH);
          const values = batch.map((row) => columns.map((column) => toDbValue(row[column.name], column)));
          const columnList = columns.map((column) => `\`${column.name}\``).join(", ");
          await runner.query(`INSERT INTO \`${table}\` (${columnList}) VALUES ?`, [values]);
        }
      }
      await runner.query("SET FOREIGN_KEY_CHECKS = 1");
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      this.logger.error(`Khôi phục thất bại: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException("Khôi phục thất bại, dữ liệu hiện tại được giữ nguyên.");
    } finally {
      await runner.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => undefined);
      await runner.release();
    }

    // Ghi sau khi khôi phục (nhật ký cũ đã được thay bằng nhật ký trong bản sao lưu).
    // Tài khoản admin có thể không tồn tại trong bản sao lưu: khi đó không gắn userId.
    const [adminExists] = await this.dataSource.query("SELECT 1 FROM `users` WHERE `id` = ? LIMIT 1", [admin.id]);
    await this.auditService.record({
      userId: adminExists ? admin.id : null,
      action: "backup.restore",
      entity: "system",
      newValues: { backupCreatedAt: backup.createdAt, tables: schema.size, rows, by: admin.email },
    });

    return { tables: schema.size, rows, createdAt: backup.createdAt };
  }

  private parse(file: Buffer): BackupFile {
    let text: string;
    try {
      // File .gz bắt đầu bằng magic bytes 1f 8b; cho phép cả file JSON chưa nén.
      text = (file[0] === 0x1f && file[1] === 0x8b ? gunzipSync(file) : file).toString("utf8");
    } catch {
      throw new BadRequestException("File sao lưu bị hỏng (không giải nén được).");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException("File sao lưu không phải JSON hợp lệ.");
    }
    const backup = parsed as Partial<BackupFile>;
    if (backup?.format !== BACKUP_FORMAT || typeof backup.tables !== "object" || backup.tables === null) {
      throw new BadRequestException("Đây không phải file sao lưu của hệ thống.");
    }
    if (backup.version !== BACKUP_VERSION) {
      throw new BadRequestException(`Phiên bản file sao lưu (${String(backup.version)}) không được hỗ trợ.`);
    }
    return backup as BackupFile;
  }

  private async validate(backup: BackupFile, schema: TableSchema): Promise<void> {
    const current = await this.readSchemaVersion();
    if (backup.schemaVersion !== current) {
      throw new BadRequestException(
        `Bản sao lưu thuộc cấu trúc CSDL khác (${backup.schemaVersion ?? "không rõ"}, hiện tại ${current ?? "không rõ"}).`,
      );
    }
    for (const [table, rows] of Object.entries(backup.tables)) {
      const columns = schema.get(table);
      if (!columns) {
        throw new BadRequestException(`Bảng "${table}" không có trong CSDL hiện tại.`);
      }
      if (!Array.isArray(rows)) {
        throw new BadRequestException(`Dữ liệu bảng "${table}" không hợp lệ.`);
      }
      const known = new Set(columns.map((column) => column.name));
      for (const row of rows) {
        if (typeof row !== "object" || row === null) {
          throw new BadRequestException(`Dữ liệu bảng "${table}" không hợp lệ.`);
        }
        const unknown = Object.keys(row).find((key) => !known.has(key));
        if (unknown) {
          throw new BadRequestException(`Cột "${table}.${unknown}" không có trong CSDL hiện tại.`);
        }
      }
    }
    for (const table of schema.keys()) {
      if (!(table in backup.tables)) {
        throw new BadRequestException(`Bản sao lưu thiếu bảng "${table}".`);
      }
    }
  }

  /** Các bảng dữ liệu và cột ghi được (bỏ cột sinh tự động), theo thứ tự cột của CSDL. */
  private async readSchema(): Promise<TableSchema> {
    const rows: Array<{ table_name: string; column_name: string; data_type: string }> = await this.dataSource.query(
      `SELECT c.TABLE_NAME AS table_name, c.COLUMN_NAME AS column_name, c.DATA_TYPE AS data_type
         FROM information_schema.COLUMNS c
         JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE' AND c.EXTRA NOT IN ('VIRTUAL GENERATED', 'STORED GENERATED')
        ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`,
    );
    const schema: TableSchema = new Map();
    for (const row of rows) {
      if (SKIPPED_TABLES.has(row.table_name)) continue;
      const columns = schema.get(row.table_name) ?? [];
      columns.push({ name: row.column_name, dataType: row.data_type.toLowerCase() });
      schema.set(row.table_name, columns);
    }
    return schema;
  }

  private async readSchemaVersion(): Promise<string | null> {
    try {
      const [latest] = await this.dataSource.query("SELECT `name` FROM `migrations` ORDER BY `id` DESC LIMIT 1");
      return latest?.name ?? null;
    } catch {
      return null;
    }
  }
}

/** Chuyển giá trị JSON trong file sao lưu về dạng mysql2 ghi đúng kiểu cột. */
function toDbValue(value: unknown, column: ColumnInfo): unknown {
  if (value === undefined || value === null) return null;
  if (column.dataType === "json") return JSON.stringify(value);
  // Ngày giờ được xuất dạng ISO (UTC); Date để driver ghi theo múi giờ kết nối ("Z").
  if (DATE_TYPES.has(column.dataType) && typeof value === "string") return new Date(value);
  return value;
}
