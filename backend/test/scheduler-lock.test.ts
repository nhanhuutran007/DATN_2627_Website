import { deepEqual, equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { Cron, CronExpression } from "@nestjs/schedule";

import { ExclusiveJob, JOB_LEASE } from "../src/common/scheduler/exclusive-job.decorator";
import { LockQueryRunner, SchedulerLockService } from "../src/common/scheduler/scheduler-lock.service";

/** Giả lập bảng scheduler_locks với đúng ngữ nghĩa câu INSERT … ON DUPLICATE KEY UPDATE. */
function fakeLockTable(clock: { now: number }): LockQueryRunner & { rows: Map<string, { until: number; by: string }> } {
  const rows = new Map<string, { until: number; by: string }>();
  return {
    rows,
    async query(sql: string, parameters?: unknown[]) {
      if (sql.trim().startsWith("SELECT")) {
        const row = rows.get((parameters as [string])[0]);
        return row ? [{ locked_by: row.by }] : [];
      }
      const [name, leaseSeconds, owner] = parameters as [string, number, string];
      const until = clock.now + leaseSeconds * 1000;
      const row = rows.get(name);
      if (!row || row.until <= clock.now) rows.set(name, { until, by: owner });
      // Như mysql2 (CLIENT_FOUND_ROWS): luôn báo 1 dòng, không dùng được để biết ai giữ khóa.
      return { affectedRows: 1 };
    },
  };
}

describe("SchedulerLockService", () => {
  afterEach(() => {
    SchedulerLockService.current()?.onModuleDestroy();
  });

  it("chỉ một instance giành được khóa trong thời hạn thuê, hết hạn thì instance khác giành lại", async () => {
    const clock = { now: 1_000_000 };
    const table = fakeLockTable(clock);
    const a = new SchedulerLockService(table);
    const b = new SchedulerLockService(table);

    equal(await a.tryAcquire("pledge.settlement", 540), true);
    equal(await b.tryAcquire("pledge.settlement", 540), false);
    equal(await b.tryAcquire("wallet.reconciliation", 540), true, "khóa theo từng job");

    clock.now += 540 * 1000;
    equal(await b.tryAcquire("pledge.settlement", 540), true);
    ok(table.rows.get("pledge.settlement")?.by.startsWith(b.owner));
  });

  it("bỏ lượt (không chạy) khi CSDL lỗi", async () => {
    const broken: LockQueryRunner = {
      query: async () => {
        throw new Error("Table 'scheduler_locks' doesn't exist");
      },
    };
    equal(await new SchedulerLockService(broken).tryAcquire("x", 60), false);
  });

  it("cùng instance gọi lại khi khóa còn hạn cũng không được chạy", async () => {
    const table = fakeLockTable({ now: 2_000_000 });
    const lock = new SchedulerLockService(table);
    equal(await lock.tryAcquire("x", 60), true);
    equal(await lock.tryAcquire("x", 60), false);
  });

  it("kết quả đọc lại bất thường thì coi là không giành được", async () => {
    const reply = (value: unknown): LockQueryRunner => ({ query: async () => value });
    equal(await new SchedulerLockService(reply([])).tryAcquire("x", 60), false);
    equal(await new SchedulerLockService(reply({ affectedRows: 1 })).tryAcquire("x", 60), false);
  });

  it("thời hạn thuê ngắn hơn chu kỳ cron", () => {
    ok(JOB_LEASE.EVERY_10_MINUTES < 10 * 60);
    ok(JOB_LEASE.EVERY_HOUR < 60 * 60);
    ok(JOB_LEASE.EVERY_6_HOURS < 6 * 60 * 60);
    ok(JOB_LEASE.EVERY_DAY < 24 * 60 * 60);
  });
});

describe("@ExclusiveJob", () => {
  afterEach(() => {
    SchedulerLockService.current()?.onModuleDestroy();
  });

  class Job {
    runs = 0;

    @Cron(CronExpression.EVERY_10_MINUTES)
    @ExclusiveJob("test.job", JOB_LEASE.EVERY_10_MINUTES)
    async handle(): Promise<void> {
      this.runs += 1;
    }
  }

  class CronOnly {
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handle(): Promise<void> {}
  }

  class ReversedOrder {
    @ExclusiveJob("test.reversed", 60)
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handle(): Promise<void> {}
  }

  it("giữ metadata lịch của @Cron dù đặt trên hay dưới", () => {
    const expected = Reflect.getMetadataKeys(CronOnly.prototype.handle).sort();
    ok(expected.length > 0);
    deepEqual(Reflect.getMetadataKeys(Job.prototype.handle).sort(), expected);
    deepEqual(Reflect.getMetadataKeys(ReversedOrder.prototype.handle).sort(), expected);
    equal(Job.prototype.handle.name, "handle");
  });

  it("chạy bình thường khi chưa có Nest (unit test gọi thẳng)", async () => {
    const job = new Job();
    await job.handle();
    equal(job.runs, 1);
  });

  it("hai instance cùng lượt cron: job chỉ chạy một lần", async () => {
    const clock = { now: 5_000_000 };
    const table = fakeLockTable(clock);
    const lock = new SchedulerLockService(table);
    lock.onModuleInit();

    const first = new Job();
    const second = new Job();
    await Promise.all([first.handle(), second.handle()]);
    equal(first.runs + second.runs, 1);

    clock.now += JOB_LEASE.EVERY_10_MINUTES * 1000;
    await second.handle();
    equal(first.runs + second.runs, 2, "lượt sau chạy lại được");
  });
});
