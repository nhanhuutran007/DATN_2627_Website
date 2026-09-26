import { deepEqual } from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { getMetadataArgsStorage } from "typeorm";

function findEntityFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return findEntityFiles(path);
    }
    return entry.name.endsWith(".entity.js") ? [path] : [];
  });
}

describe("entity column names", () => {
  it("thuộc tính camelCase luôn khai báo tên cột snake_case khớp migration", async () => {
    // Test chạy từ .test-dist/test, entity đã biên dịch nằm ở .test-dist/src
    for (const file of findEntityFiles(join(__dirname, "..", "src"))) {
      await import(file);
    }

    const missing = getMetadataArgsStorage()
      .columns.filter((column) => /[A-Z]/.test(column.propertyName) && !column.options.name)
      .map((column) => {
        const target = column.target;
        const owner = typeof target === "function" ? target.name : String(target);
        return `${owner}.${column.propertyName}`;
      });

    // Vd. BehaviorEvent.eventType thiếu name → SELECT `eventType` lỗi ER_BAD_FIELD_ERROR trên MySQL thật
    deepEqual(missing, []);
  });
});
