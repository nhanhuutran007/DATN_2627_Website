import { deepEqual, equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import {
  NOTIFICATION_RETENTION_DAYS,
  NotificationRetentionService,
} from "../src/modules/notifications/notification-retention.service";
import { donationGroupText, NotificationsService, type NotifyInput } from "../src/modules/notifications/notifications.service";

const OWNER = "11111111-1111-4111-8111-111111111111";
const CAMPAIGN = "44444444-4444-4444-8444-444444444444";
const OTHER_CAMPAIGN = "55555555-5555-4555-8555-555555555555";

const matches = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);

/** Repo giả đủ cho notify + gộp: findOne/update theo điều kiện bằng nhau. */
function makeRepo() {
  const rows: any[] = [];
  return {
    rows,
    create: (dto: any) => ({ ...dto }),
    async save(input: any) {
      for (const row of Array.isArray(input) ? input : [input]) {
        row.id ??= `n-${rows.length + 1}`;
        row.createdAt ??= new Date();
        rows.push(row);
      }
      return input;
    },
    findOne: async ({ where }: any) => rows.filter((r) => matches(r, where)).at(-1) ?? null,
    update: async (where: any, patch: any) => {
      const list = rows.filter((r) => matches(r, where));
      list.forEach((r) => Object.assign(r, patch));
      return { affected: list.length };
    },
  };
}

function donation(amount: number, campaignId = CAMPAIGN): NotifyInput {
  return {
    userId: OWNER,
    type: NotificationType.DONATION_RECEIVED,
    ...donationGroupText("Robot Việt", 1, amount),
    link: "/dashboard",
    relatedId: campaignId,
    donationGroup: { campaignTitle: "Robot Việt", amount },
  };
}

describe("Gộp thông báo ủng hộ", () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: NotificationsService;

  beforeEach(() => {
    repo = makeRepo();
    const none = { find: async () => [] };
    service = new NotificationsService(repo as any, {} as any, none as any, { sendNotification: async () => undefined } as any, none as any);
  });

  it("cộng dồn các khoản vào thông báo chưa đọc của cùng chiến dịch", async () => {
    await service.notify(donation(50_000));
    await service.notify(donation(200_000));
    await service.notify(donation(1_000_000));
    equal(repo.rows.length, 1);
    equal(repo.rows[0].groupCount, 3);
    equal(repo.rows[0].groupAmount, 1_250_000);
    equal(repo.rows[0].title, "Có 3 khoản ủng hộ mới");
    ok(repo.rows[0].message.includes("tổng 1.250.000 ₫"));
  });

  it("đã đọc hoặc khác chiến dịch thì tạo thông báo mới", async () => {
    await service.notify(donation(50_000));
    repo.rows[0].isRead = true;
    await service.notify(donation(70_000));
    await service.notify(donation(90_000, OTHER_CAMPAIGN));
    equal(repo.rows.length, 3);
    deepEqual(repo.rows.map((r) => r.groupCount), [1, 1, 1]);
    equal(repo.rows[1].title, "Có khoản ủng hộ mới");
  });

  it("không gộp thông báo cũ chưa có tổng tiền", async () => {
    await service.notify({ ...donation(50_000), donationGroup: undefined });
    await service.notify(donation(70_000));
    equal(repo.rows.length, 2);
  });
});

describe("NotificationRetentionService", () => {
  it(`xóa thông báo cũ hơn ${NOTIFICATION_RETENTION_DAYS} ngày`, async () => {
    let cutoff: Date | undefined;
    const repo = {
      delete: async (where: any) => {
        cutoff = where.createdAt.value;
        return { affected: 4 };
      },
    };
    const now = new Date("2026-10-28T00:00:00Z");
    equal(await new NotificationRetentionService(repo as any).purgeExpired(now), 4);
    equal(cutoff?.toISOString(), "2026-07-30T00:00:00.000Z");
  });
});
