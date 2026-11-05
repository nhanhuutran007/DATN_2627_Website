import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException } from "@nestjs/common";
import sharp = require("sharp");

import { RiskMethod } from "../src/modules/admin/entities/risk-alert.entity";
import {
  NEAR_DUPLICATE_MAX_RATIO,
  fingerprintImage,
  perceptualDistance,
} from "../src/modules/media/image-fingerprint";
import { type AttachedReceipt, ReceiptDuplicateService } from "../src/modules/progress/receipt-duplicate.service";

/** Hóa đơn giả: các vạch tối trên nền trắng, mỗi vạch là một dòng chữ. */
function receipt(lineWidths: number[]): Promise<Buffer> {
  const rows = lineWidths
    .map((width, index) => `<rect x="30" y="${60 + index * 44}" width="${width}" height="18" fill="#000"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="760"><rect width="500" height="760" fill="#fff"/>${rows}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function distance(first: Buffer, second: Buffer): Promise<number> {
  const [a, b] = await Promise.all([fingerprintImage(first), fingerprintImage(second)]);
  return perceptualDistance(a.perceptualHash ?? "", b.perceptualHash ?? "");
}

describe("image fingerprint", () => {
  const LINES = [420, 180, 300, 90, 260, 400, 140, 330, 220, 380, 100, 280, 350, 160];

  it("treats a recompressed or downsized copy as near-duplicate", async () => {
    const original = await receipt(LINES);
    const recompressed = await sharp(original).jpeg({ quality: 40 }).toBuffer();
    const downsized = await sharp(original).resize(250).jpeg().toBuffer();
    ok((await distance(original, recompressed)) <= NEAR_DUPLICATE_MAX_RATIO);
    ok((await distance(original, downsized)) <= NEAR_DUPLICATE_MAX_RATIO);
  });

  it("sees through a change of size, format or both at once", async () => {
    const original = await receipt(LINES);
    const copies = await Promise.all([
      sharp(original).resize(250).jpeg({ quality: 45 }).toBuffer(),
      sharp(original).resize(1280).jpeg({ quality: 70 }).toBuffer(),
      sharp(original).png().toBuffer(),
      sharp(original).webp().toBuffer(),
    ]);
    for (const copy of copies) {
      ok((await distance(original, copy)) <= NEAR_DUPLICATE_MAX_RATIO);
    }
  });

  it("keeps a different receipt with the same layout apart", async () => {
    const other = [120, 400, 90, 330, 450, 150, 390, 110, 440, 130, 360, 90, 180, 420];
    ok((await distance(await receipt(LINES), await receipt(other))) > NEAR_DUPLICATE_MAX_RATIO);
  });

  it("does not match two blank images", async () => {
    const blank = await receipt([]);
    equal(await distance(blank, blank), 1);
  });

  it("still hashes the bytes of an image it cannot decode", async () => {
    const fingerprint = await fingerprintImage(Buffer.from("not really an image"));
    equal(fingerprint.contentHash.length, 64);
    equal(fingerprint.perceptualHash, null);
  });
});

describe("ReceiptDuplicateService", () => {
  const ORIGINAL = "a".repeat(512);
  const INK_A = "4".repeat(512);
  const INK_B = "8".repeat(512);

  let attached: AttachedReceipt[];
  let files: any[];
  let alerts: any[];
  let openAlert: any;
  let service: ReceiptDuplicateService;

  class TestableService extends ReceiptDuplicateService {
    protected override attachedReceipts() {
      return Promise.resolve(attached);
    }
  }

  const known = (overrides: Partial<AttachedReceipt> = {}): AttachedReceipt => ({
    url: "/api/v1/media/receipts/old.jpg",
    contentHash: "old-hash",
    perceptualHash: INK_A,
    campaignTitle: "Chiến dịch cũ",
    ...overrides,
  });
  const campaign = { id: "campaign-1", title: "Chiến dịch mới" } as any;
  const incoming = [{ mediaFileId: "file-1", url: "/api/v1/media/receipts/new.jpg" }];

  beforeEach(() => {
    attached = [];
    files = [{ id: "file-1", contentHash: "new-hash", perceptualHash: INK_A }];
    alerts = [];
    openAlert = null;
    service = new TestableService(
      { find: async () => files } as any,
      {} as any,
      {
        findOneBy: async () => openAlert,
        create: (dto: any) => dto,
        save: async (alert: any) => {
          alerts.push(alert);
          return alert;
        },
      } as any,
    );
  });

  it("rejects a file identical to a receipt already in use", async () => {
    attached = [known({ contentHash: "new-hash", perceptualHash: ORIGINAL })];
    await rejects(service.check(incoming), ConflictException);
  });

  it("rejects the same image attached twice in one report", async () => {
    files = [
      { id: "file-1", contentHash: "same" },
      { id: "file-2", contentHash: "same" },
    ];
    await rejects(service.check(incoming), ConflictException);
  });

  it("reports a near-duplicate without blocking", async () => {
    attached = [known()];
    const [match] = await service.check(incoming);
    equal(match.url, incoming[0].url);
    equal(match.matched.campaignTitle, "Chiến dịch cũ");
  });

  it("ignores receipts that only look alike in layout", async () => {
    attached = [known({ perceptualHash: INK_B })];
    deepEqual(await service.check(incoming), []);
  });

  it("skips files uploaded before fingerprints existed", async () => {
    files = [];
    attached = [known()];
    deepEqual(await service.check(incoming), []);
  });

  it("opens a receipt alert the admin can compare", async () => {
    await service.flag(campaign, [{ url: "/new.jpg", matched: known() }]);
    equal(alerts.length, 1);
    equal(alerts[0].method, RiskMethod.RECEIPT);
    deepEqual(alerts[0].reasons[0].images, { current: "/new.jpg", matched: known().url });
  });

  it("adds to the open alert instead of opening another", async () => {
    openAlert = { reasons: [{ group: "receipt", label: "cũ", weight: 0.5 }], evidences: {} };
    await service.flag(campaign, [{ url: "/new.jpg", matched: known() }]);
    equal(alerts[0], openAlert);
    equal(openAlert.reasons.length, 2);
    equal(openAlert.evidences.near_duplicate_receipts, 2);
  });

  it("writes nothing when there is no near-duplicate", async () => {
    await service.flag(campaign, []);
    equal(alerts.length, 0);
  });
});
