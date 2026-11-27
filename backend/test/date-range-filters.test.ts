import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";
import type { DataSource, FindOperator, Repository } from "typeorm";

import { vnDateRange } from "../src/common/query/range";
import { FinanceService } from "../src/modules/finance/finance.service";
import type { RefundRequest } from "../src/modules/finance/entities/refund-request.entity";
import type { Donation } from "../src/modules/donations/entities/donation.entity";
import type { MediaFile } from "../src/modules/media/entities/media-file.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

type Where = Record<string, unknown>;
const operator = (value: unknown) => value as FindOperator<Date>;

describe("vnDateRange", () => {
  it("covers whole Vietnam days, both ends included", () => {
    const range = operator(vnDateRange("2026-11-01", "2026-11-23"));
    equal(range.type, "between");
    const [start, end] = range.value as unknown as Date[];
    equal(start.toISOString(), "2026-10-31T17:00:00.000Z");
    equal(end.toISOString(), "2026-11-23T16:59:59.999Z");
  });

  it("keeps an open end when only one side is chosen, and nothing when both are empty", () => {
    equal(operator(vnDateRange("2026-11-01", undefined)).type, "moreThanOrEqual");
    equal(operator(vnDateRange(undefined, "2026-11-23")).type, "lessThanOrEqual");
    equal(vnDateRange(undefined, undefined), undefined);
  });

  it("rejects a start date after the end date", () => {
    throws(() => vnDateRange("2026-11-24", "2026-11-23"), BadRequestException);
  });
});

function makeFinance() {
  const calls: { refundFind: Where[]; andWhere: Array<[string, Record<string, unknown>]> } = { refundFind: [], andWhere: [] };
  const refundRepo = {
    findAndCount: async (options: { where: Where[] }) => {
      calls.refundFind.push(...options.where);
      return [[], 0];
    },
    find: async (options: { where: Where }) => {
      calls.refundFind.push(options.where);
      return [];
    },
    count: async () => 0,
  } as unknown as Repository<RefundRequest>;
  const qb = {
    select: () => qb,
    addSelect: () => qb,
    where: () => qb,
    andWhere: (sql: string, params: Record<string, unknown>) => {
      calls.andWhere.push([sql, params]);
      return qb;
    },
    getRawOne: async () => ({ count: 0, amount: 0 }),
  };
  const donationFind: Where[] = [];
  const donationRepo = {
    find: async (options: { where: Where }) => {
      donationFind.push(options.where);
      return [];
    },
    createQueryBuilder: () => qb,
  } as unknown as Repository<Donation>;
  const service = new FinanceService(
    refundRepo,
    donationRepo,
    {} as never,
    {} as never,
    {} as never,
    makeAuditRecorder().service,
    makeNotifierRecorder().service,
    {} as never,
  );
  return { service, calls, donationFind };
}

describe("refund lists filtered by date", () => {
  it("adds createdAt to every keyword branch of the admin list", async () => {
    const { service, calls } = makeFinance();
    await service.adminList({ status: undefined, q: "Lan", from: "2026-11-01", to: "2026-11-23" });
    equal(calls.refundFind.length, 4);
    for (const where of calls.refundFind) equal(operator(where.createdAt).type, "between");
  });

  it("does not filter by date when no range is chosen", async () => {
    const { service, calls } = makeFinance();
    await service.adminList({});
    deepEqual(calls.refundFind, [{}]);
  });

  it("limits the automatic refund summary to the chosen period", async () => {
    const { service, calls, donationFind } = makeFinance();
    await service.autoRefundSummary({ from: "2026-11-01", to: "2026-11-23" });
    equal(operator(donationFind[0].updatedAt).type, "between");
    const approved = calls.refundFind.find((where) => "reviewedAt" in where);
    ok(approved);
    equal(operator(approved.reviewedAt).type, "between");
    deepEqual(calls.andWhere.map(([sql]) => sql), ["d.updated_at >= :from", "d.updated_at <= :to"]);
  });
});
