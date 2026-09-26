import { deepEqual, equal, throws } from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { getDatabaseConfig, readDatabaseSsl } from "../src/config/database.config";

const originalSsl = process.env.DB_SSL;
const originalCaPath = process.env.DB_SSL_CA_PATH;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("readDatabaseSsl", () => {
  afterEach(() => {
    restoreEnv("DB_SSL", originalSsl);
    restoreEnv("DB_SSL_CA_PATH", originalCaPath);
  });

  it("tắt TLS khi không đặt DB_SSL (MySQL local/compose)", () => {
    delete process.env.DB_SSL;
    equal(readDatabaseSsl(), undefined);

    process.env.DB_SSL = "false";
    equal(readDatabaseSsl(), undefined);
  });

  it("bật TLS nhưng không xác minh chứng chỉ khi thiếu CA", () => {
    process.env.DB_SSL = "TRUE";
    delete process.env.DB_SSL_CA_PATH;
    deepEqual(readDatabaseSsl(), { rejectUnauthorized: false });
  });

  it("xác minh chứng chỉ bằng CA bundle khi có DB_SSL_CA_PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "db-ssl-"));
    try {
      const caPath = join(dir, "ca.pem");
      writeFileSync(caPath, "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n");
      process.env.DB_SSL = "true";
      process.env.DB_SSL_CA_PATH = caPath;

      const ssl = readDatabaseSsl();
      equal(ssl?.rejectUnauthorized, true);
      equal(ssl?.ca?.includes("BEGIN CERTIFICATE"), true);
      deepEqual((getDatabaseConfig() as { ssl?: unknown }).ssl, ssl);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("báo lỗi ngay khi CA bundle không tồn tại thay vì kết nối không xác minh", () => {
    process.env.DB_SSL = "true";
    process.env.DB_SSL_CA_PATH = join(tmpdir(), "khong-ton-tai", "ca.pem");
    throws(() => readDatabaseSsl(), /ENOENT/);
  });
});
