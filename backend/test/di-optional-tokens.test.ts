import { equal, ok } from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import "reflect-metadata";

/**
 * Tham số `@Optional()` khai báo kiểu `X | null` bị TypeScript ghi metadata là `Object`:
 * nếu không có `@Inject(token)`, Nest không tìm được provider và âm thầm truyền `null`
 * (lỗi từng làm ví Góp Mầm và phân quyền cộng tác viên không chạy trên server thật).
 */
function findServiceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findServiceFiles(path);
    return entry.name.endsWith(".service.js") ? [path] : [];
  });
}

describe("DI: tham số @Optional() có token rõ ràng", () => {
  it("không có tham số tùy chọn nào bị suy ra kiểu Object", async () => {
    const offenders: string[] = [];
    let optionalCount = 0;
    // Test chạy từ .test-dist/test, code đã biên dịch nằm ở .test-dist/src
    for (const file of findServiceFiles(join(__dirname, "..", "src"))) {
      const exported = (await import(file)) as Record<string, unknown>;
      for (const value of Object.values(exported)) {
        if (typeof value !== "function") continue;
        const optional: number[] = Reflect.getMetadata("optional:paramtypes", value) ?? [];
        if (optional.length === 0) continue;
        const types: unknown[] = Reflect.getMetadata("design:paramtypes", value) ?? [];
        const explicit: { index: number; param: unknown }[] = Reflect.getMetadata("self:paramtypes", value) ?? [];
        for (const index of optional) {
          optionalCount += 1;
          const token = explicit.find((entry) => entry.index === index)?.param ?? types[index];
          if (token === Object || token === undefined) {
            offenders.push(`${(value as { name: string }).name}#${index}`);
          }
        }
      }
    }
    ok(optionalCount > 0, "phải tìm thấy ít nhất một tham số @Optional()");
    equal(offenders.join(", "), "");
  });
});
