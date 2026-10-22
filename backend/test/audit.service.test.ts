import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";

import { AuditService, truncateForAudit } from "../src/common/audit/audit.service";
import { requestContext } from "../src/common/audit/request-context";

describe("AuditService", () => {
  it("should persist an audit entry", async () => {
    const saved: Record<string, unknown>[] = [];
    const repo: any = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        saved.push(value);
        return value;
      },
    };
    const service = new AuditService(repo);

    await service.record({
      userId: "user-1",
      action: "campaign.moderate",
      entity: "campaign",
      entityId: "campaign-1",
      oldValues: { status: "pending" },
      newValues: { status: "approved" },
    });

    equal(saved.length, 1);
    deepEqual(saved[0], {
      userId: "user-1",
      action: "campaign.moderate",
      entity: "campaign",
      entityId: "campaign-1",
      oldValues: { status: "pending" },
      newValues: { status: "approved" },
      ipAddress: undefined,
      userAgent: undefined,
    });
  });

  it("should store a system action without a user id", async () => {
    let stored: Record<string, unknown> | undefined;
    const repo: any = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        stored = value;
        return value;
      },
    };
    const service = new AuditService(repo);

    await service.record({ action: "donation.webhook.completed", entity: "donation" });

    equal(stored?.userId, undefined);
  });

  it("should attach the IP and user-agent of the current request", async () => {
    let stored: Record<string, unknown> | undefined;
    const repo: any = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        stored = value;
        return value;
      },
    };
    const service = new AuditService(repo);

    await requestContext.run({ ip: "203.0.113.7", userAgent: "jest-agent" }, () =>
      service.record({ action: "auth.login.success", entity: "user" }),
    );

    equal(stored?.ipAddress, "203.0.113.7");
    equal(stored?.userAgent, "jest-agent");
  });

  it("should leave IP empty outside of a request", async () => {
    let stored: Record<string, unknown> | undefined;
    const repo: any = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        stored = value;
        return value;
      },
    };
    await new AuditService(repo).record({ action: "x", entity: "y" });
    equal(stored?.ipAddress, undefined);
  });

  it("should list newest first with only the requested filters", async () => {
    let options: any;
    const repo: any = {
      findAndCount: async (opts: unknown) => {
        options = opts;
        return [[{ id: "1" }], 42];
      },
    };
    const service = new AuditService(repo);

    const result = await service.list({
      action: "campaign.moderate",
      userId: "user-1",
      limit: 10,
      offset: 20,
    });

    deepEqual(options.where, { action: "campaign.moderate", userId: "user-1" });
    deepEqual(options.order, { createdAt: "DESC" });
    equal(options.skip, 20);
    equal(options.take, 10);
    equal(result.total, 42);
    equal(result.limit, 10);
  });

  it("should OR the prefixes of a group, hide sessions and bound dates in Vietnam time", async () => {
    let options: any;
    const repo: any = {
      findAndCount: async (opts: unknown) => {
        options = opts;
        return [[], 0];
      },
    };
    await new AuditService(repo).list({ group: "finance", hideSessions: true, from: "2026-10-01", to: "2026-10-22" });

    equal(options.where.length, 3);
    const range = options.where[0].createdAt.value;
    equal(range[0].toISOString(), "2026-09-30T17:00:00.000Z");
    equal(range[1].toISOString(), "2026-10-22T16:59:59.999Z");
    // And(Like("donation.%"), Not(In(sessions)))
    const [like, notIn] = options.where[0].action.value;
    equal(like.value, "donation.%");
    equal(notIn.type, "not");
    deepEqual(notIn.value, ["auth.login.success", "auth.google.login", "auth.logout", "auth.logout_all"]);
  });

  it("should attach actor and entity names, leaving unknown ids empty", async () => {
    const items = [
      { id: "1", userId: "u1", action: "user.status.update", entity: "user", entityId: "u2" },
      { id: "2", userId: null, action: "campaign.expire", entity: "campaign", entityId: "c1" },
      { id: "3", userId: "gone", action: "backup.export", entity: "system", entityId: null },
    ];
    const queries: string[] = [];
    const repo: any = {
      findAndCount: async () => [items, 3],
      manager: {
        query: async (sql: string) => {
          queries.push(sql);
          if (sql.includes("`users`")) {
            return [
              { id: "u1", label: "Administrator", email: "admin@gopmam.com" },
              { id: "u2", label: "Bui Anh H", email: "user5@gopmam.com" },
            ];
          }
          return [{ id: "c1", label: "Giếng nước sạch" }];
        },
      },
    };
    const result = await new AuditService(repo).list({});

    equal(queries.length, 2);
    deepEqual((result.items[0] as any).actor, { name: "Administrator", email: "admin@gopmam.com" });
    equal((result.items[0] as any).entityLabel, "Bui Anh H");
    equal((result.items[1] as any).actor, null);
    equal((result.items[1] as any).entityLabel, "Giếng nước sạch");
    equal((result.items[2] as any).actor, null);
    equal((result.items[2] as any).entityLabel, null);
  });

  it("should truncate very long strings for the audit trail", () => {
    equal((truncateForAudit("a".repeat(600)) as string).length, 501);
    equal(truncateForAudit("short"), "short");
    equal(truncateForAudit(5), 5);
  });

  it("should not throw when the database write fails", async () => {
    const repo: any = {
      create: (value: unknown) => value,
      save: async () => {
        throw new Error("db down");
      },
    };
    const service = new AuditService(repo);

    await service.record({ action: "x", entity: "y" });
  });
});
