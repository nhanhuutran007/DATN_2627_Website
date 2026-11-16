import { deepEqual, equal } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { SUPPORT_CONTACT_KEY, SupportService } from "../src/modules/support/support.service";
import { makeAuditRecorder } from "./helpers/audit";

const ADMIN = { id: "admin-1" } as never;

describe("SupportService (TC_CAMP_016)", () => {
  let rows: Map<string, { key: string; value: string; updatedBy?: string; updatedAt?: Date }>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: SupportService;

  beforeEach(() => {
    rows = new Map();
    audit = makeAuditRecorder();
    const repo: any = {
      findOne: async ({ where }: any) => rows.get(where.key) ?? null,
      save: async (row: any) => {
        const saved = { ...row, updatedAt: new Date("2026-11-17T03:00:00Z") };
        rows.set(row.key, saved);
        return saved;
      },
    };
    service = new SupportService(repo, audit.service);
  });

  it("should return empty fields before an admin configures the contact", async () => {
    const contact = await service.getContact();
    equal(contact.email, "");
    equal(contact.phone, "");
    equal(contact.updatedAt, null);
  });

  it("should save, trim and audit the support contact", async () => {
    const saved = await service.updateContact(
      { email: " hotro@gopmam.com ", phone: "028 3822 0000", workingHours: "8:00–17:00, thứ Hai–thứ Sáu" },
      ADMIN,
    );
    equal(saved.email, "hotro@gopmam.com");
    equal(rows.get(SUPPORT_CONTACT_KEY)?.updatedBy, "admin-1");
    equal(audit.entries[0].action, "admin.support_contact.update");
    equal((audit.entries[0].newValues as Record<string, string>).phone, "028 3822 0000");

    const publicView = await service.getContact();
    equal(publicView.workingHours, "8:00–17:00, thứ Hai–thứ Sáu");
    equal(publicView.updatedAt, "2026-11-17T03:00:00.000Z");
  });

  it("should keep fields that are not sent and clear fields sent as empty", async () => {
    await service.updateContact({ email: "hotro@gopmam.com", phone: "0281234567" }, ADMIN);
    const next = await service.updateContact({ phone: "" }, ADMIN);
    equal(next.email, "hotro@gopmam.com");
    equal(next.phone, "");
  });

  it("should fall back to empty fields when the stored value is corrupted", async () => {
    rows.set(SUPPORT_CONTACT_KEY, { key: SUPPORT_CONTACT_KEY, value: "{not json" });
    const contact = await service.getContact();
    deepEqual(
      { email: contact.email, phone: contact.phone, address: contact.address },
      { email: "", phone: "", address: "" },
    );
  });
});
