import { deepEqual, equal, ok } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  MAX_ORGANIZATIONS_PER_USER,
  OrganizationsService,
  slugify,
} from "../src/modules/organizations/organizations.service";
import { OrganizationStatus, OrganizationType } from "../src/modules/organizations/entities/organization.entity";
import { makeAuditRecorder } from "./helpers/audit";

const REP = { id: "rep-1" } as never;
const OTHER = { id: "user-2" } as never;
const ADMIN = { id: "admin-1" } as never;
const ORG_ID = "123e4567-e89b-12d3-a456-426614174100";

const expectStatus = (promise: Promise<unknown>, status: number) =>
  promise
    .then(() => {
      throw new Error("should have thrown");
    })
    .catch((err) => {
      equal(err.status, status);
    });

const baseDto = () => ({
  name: "Quỹ Bảo trợ Trẻ em Đồng Nai",
  type: OrganizationType.CHARITY_FUND,
  registrationNumber: "123/QĐ-UBND",
  issuedBy: "UBND tỉnh Đồng Nai",
  mission: "Hỗ trợ học bổng, dinh dưỡng và chăm sóc y tế cho trẻ em có hoàn cảnh khó khăn trên địa bàn tỉnh.",
  email: "lienhe@quy.vn",
  phone: "0251 3822 000",
  address: "12 Võ Thị Sáu, Biên Hòa",
  province: "Đồng Nai",
  documentUrl: "/api/v1/media/org-documents/123e4567-e89b-12d3-a456-426614174999.jpg",
  representativeTitle: "Giám đốc quỹ",
});

/** Repo giả lưu trong bộ nhớ, đủ các hàm service dùng. */
function makeRepo(rows: any[]) {
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]: [string, any]) => {
      if (value && typeof value === "object" && "_type" in value) {
        if (value._type === "not") return row[key] !== value._value;
        if (value._type === "in") return value._value.includes(row[key]);
        return true;
      }
      return row[key] === value;
    });
  return {
    rows,
    count: async ({ where }: any) => rows.filter((row) => matches(row, where)).length,
    findOne: async ({ where }: any) => {
      const list = Array.isArray(where) ? where : [where];
      return rows.find((row) => list.some((w) => matches(row, w))) ?? null;
    },
    findOneBy: async (where: any) => rows.find((row) => matches(row, where)) ?? null,
    create: (value: any) => ({ ...value }),
    save: async (value: any) => {
      if (!value.id) value.id = `org-${rows.length + 1}`;
      if (!rows.includes(value)) rows.push(value);
      return value;
    },
  };
}

describe("slugify", () => {
  it("should strip Vietnamese diacritics and đ", () => {
    equal(slugify("Quỹ Bảo trợ Trẻ em Đồng Nai"), "quy-bao-tro-tre-em-dong-nai");
  });

  it("should fall back when nothing usable remains", () => {
    equal(slugify("!!!"), "to-chuc");
  });
});

describe("OrganizationsService", () => {
  let repo: ReturnType<typeof makeRepo>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notified: any[];
  let service: OrganizationsService;

  beforeEach(() => {
    repo = makeRepo([]);
    audit = makeAuditRecorder();
    notified = [];
    const notifications: any = { notify: async (input: any) => notified.push(input) };
    service = new OrganizationsService(repo as any, {} as any, audit.service, notifications);
  });

  it("should register a pending organization with a slug and audit it", async () => {
    const saved = await service.create(baseDto(), REP);
    equal(saved.status, OrganizationStatus.PENDING);
    equal(saved.slug, "quy-bao-tro-tre-em-dong-nai");
    equal(saved.representativeId, "rep-1");
    ok(saved.submittedAt);
    equal(audit.entries[0].action, "organization.create");
  });

  it("should give a duplicate name a numbered slug", async () => {
    await service.create(baseDto(), REP);
    const second = await service.create({ ...baseDto(), registrationNumber: "456/QĐ" }, OTHER);
    equal(second.slug, "quy-bao-tro-tre-em-dong-nai-2");
  });

  it("should refuse a registration number already held by a live application", async () => {
    await service.create(baseDto(), REP);
    await expectStatus(service.create(baseDto(), OTHER), 409);
  });

  it("should free the registration number once the application is rejected", async () => {
    const first = await service.create(baseDto(), REP);
    first.status = OrganizationStatus.REJECTED;
    const again = await service.create(baseDto(), OTHER);
    equal(again.status, OrganizationStatus.PENDING);
  });

  it("should cap organizations per representative", async () => {
    for (let i = 0; i < MAX_ORGANIZATIONS_PER_USER; i += 1) {
      await service.create({ ...baseDto(), registrationNumber: `R-${i}` }, REP);
    }
    await expectStatus(service.create({ ...baseDto(), registrationNumber: "R-x" }, REP), 409);
  });

  describe("update", () => {
    let organization: any;

    beforeEach(async () => {
      organization = await service.create(baseDto(), REP);
      audit.entries.length = 0;
    });

    it("should only let the representative edit", async () => {
      await expectStatus(service.update(organization.id, { phone: "0909 000 000" }, OTHER), 403);
    });

    it("should resubmit a needs-info application as pending", async () => {
      organization.status = OrganizationStatus.NEEDS_INFO;
      const saved = await service.update(organization.id, { registrationNumber: "123/QĐ-UBND-2026" }, REP);
      equal(saved.status, OrganizationStatus.PENDING);
      equal(audit.entries[0].action, "organization.resubmit");
    });

    it("should lock legal details after verification but allow profile edits", async () => {
      organization.status = OrganizationStatus.VERIFIED;
      organization.verifiedAt = new Date();
      await expectStatus(service.update(organization.id, { name: "Tên khác hẳn" }, REP), 400);
      const saved = await service.update(organization.id, { website: "https://quy.vn" }, REP);
      equal(saved.website, "https://quy.vn");
      equal(saved.status, OrganizationStatus.VERIFIED);
    });

    it("should be a no-op when nothing changes", async () => {
      await service.update(organization.id, { phone: organization.phone }, REP);
      equal(audit.entries.length, 0);
    });
  });

  describe("review", () => {
    let organization: any;

    beforeEach(async () => {
      organization = await service.create(baseDto(), REP);
      audit.entries.length = 0;
    });

    it("should verify, stamp verifiedAt, audit and notify the representative", async () => {
      const saved = await service.review(organization.id, { status: OrganizationStatus.VERIFIED }, ADMIN);
      equal(saved.status, OrganizationStatus.VERIFIED);
      ok(saved.verifiedAt);
      equal(saved.reviewedBy, "admin-1");
      deepEqual(audit.entries[0].oldValues, { status: OrganizationStatus.PENDING });
      equal(notified[0].userId, "rep-1");
      equal(notified[0].link, `/to-chuc/${saved.slug}`);
    });

    it("should require a reason for anything but verification", async () => {
      await expectStatus(service.review(organization.id, { status: OrganizationStatus.NEEDS_INFO, notes: "ngắn" }, ADMIN), 400);
      const saved = await service.review(
        organization.id,
        { status: OrganizationStatus.NEEDS_INFO, notes: "Ảnh giấy phép bị mờ, vui lòng chụp lại rõ số quyết định." },
        ADMIN,
      );
      equal(saved.status, OrganizationStatus.NEEDS_INFO);
    });

    it("should refuse transitions outside the matrix", async () => {
      await expectStatus(
        service.review(organization.id, { status: OrganizationStatus.SUSPENDED, notes: "Tạm ngưng để kiểm tra lại hồ sơ." }, ADMIN),
        409,
      );
    });

    it("should not let an admin review an organization they represent", async () => {
      organization.representativeId = "admin-1";
      await expectStatus(service.review(organization.id, { status: OrganizationStatus.VERIFIED }, ADMIN), 403);
    });
  });

  it("should only accept campaigns for verified organizations", async () => {
    const organization = await service.create(baseDto(), REP);
    await expectStatus(service.assertCanReceiveCampaigns(organization.id), 400);
    organization.status = OrganizationStatus.VERIFIED;
    equal((await service.assertCanReceiveCampaigns(organization.id)).id, organization.id);
    await expectStatus(service.assertCanReceiveCampaigns(ORG_ID), 400);
  });
});
