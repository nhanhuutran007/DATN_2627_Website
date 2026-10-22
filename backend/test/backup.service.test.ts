import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { Reflector } from "@nestjs/core";

import { AdminController } from "../src/modules/admin/admin.controller";
import { BackupService, MAX_BACKUP_BYTES } from "../src/modules/admin/backup.service";
import { StepUpPurpose } from "../src/modules/auth/entities/step-up-code.entity";
import { STEP_UP_KEY } from "../src/modules/auth/guards/step-up.guard";
import { makeAuditRecorder } from "./helpers/audit";

/** DataSource giả: trả kết quả theo câu SQL (migrations hoặc audit_logs). */
function makeService(lastExport: unknown[]): BackupService {
  const dataSource = {
    query: async (sql: string) => {
      if (sql.includes("`migrations`")) return [{ name: "AddStepUpCodes1760000000000" }];
      if (sql.includes("`audit_logs`")) return lastExport;
      return [];
    },
  };
  return new BackupService(dataSource as never, makeAuditRecorder().service);
}

describe("BackupService.status", () => {
  it("trả phiên bản cấu trúc và lần sao lưu gần nhất", async () => {
    const service = makeService([
      { createdAt: new Date("2026-10-20T07:02:00Z"), newValues: { tables: 30, rows: 12430, bytes: 512000 }, email: "admin@gopmam.com" },
    ]);
    deepEqual(await service.status(), {
      schemaVersion: "AddStepUpCodes1760000000000",
      maxBytes: MAX_BACKUP_BYTES,
      lastBackup: { createdAt: "2026-10-20T07:02:00.000Z", by: "admin@gopmam.com", rows: 12430, bytes: 512000 },
    });
  });

  it("chấp nhận new_values dạng chuỗi JSON và trả null khi chưa từng sao lưu", async () => {
    const stringValues = makeService([{ createdAt: "2026-10-20T07:02:00Z", newValues: "{\"rows\":5}", email: null }]);
    deepEqual((await stringValues.status()).lastBackup, {
      createdAt: "2026-10-20T07:02:00.000Z",
      by: null,
      rows: 5,
      bytes: null,
    });
    equal((await makeService([]).status()).lastBackup, null);
  });
});

describe("AdminController backup", () => {
  it("bắt buộc OTP khi tải và khôi phục bản sao lưu", () => {
    const reflector = new Reflector();
    const proto = AdminController.prototype;
    equal(reflector.get(STEP_UP_KEY, proto.exportBackup), StepUpPurpose.ADMIN_BACKUP);
    equal(reflector.get(STEP_UP_KEY, proto.restoreBackup), StepUpPurpose.ADMIN_BACKUP);
    equal(reflector.get(STEP_UP_KEY, proto.backupStatus), undefined);
  });
});
