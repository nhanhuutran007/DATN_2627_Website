import { deepEqual, equal, match, ok, rejects } from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BadRequestException, NotFoundException, PayloadTooLargeException } from "@nestjs/common";

import { isImageUrl } from "../src/common/validators/is-image-url";
import { LocalStorageGateway, type StorageGateway } from "../src/integrations/storage/storage.gateway";
import { MediaPurpose } from "../src/modules/media/entities/media-file.entity";
import { MAX_IMAGE_BYTES, detectImageType, sanitizeOriginalName } from "../src/modules/media/image-type";
import { MEDIA_URL_PREFIX, MediaService } from "../src/modules/media/media.service";
import { makeAuditRecorder } from "./helpers/audit";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const user = { id: "123e4567-e89b-12d3-a456-426614174000" } as any;

function memoryStorage(): StorageGateway & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    driver: "local",
    files,
    put: async (key, body) => {
      files.set(key, body);
    },
    get: async (key) => files.get(key) ?? null,
  };
}

function mediaRepo() {
  const rows: any[] = [];
  return {
    rows,
    create: (dto: any) => dto,
    save: async (row: any) => {
      const saved = { id: `media-${rows.length + 1}`, ...row };
      rows.push(saved);
      return saved;
    },
    findOne: async ({ where }: any) => rows.find((r) => r.storageKey === where.storageKey) ?? null,
  };
}

describe("detectImageType", () => {
  it("nhận diện JPEG/PNG/WebP theo magic bytes", () => {
    equal(detectImageType(JPEG)?.extension, "jpg");
    equal(detectImageType(PNG)?.extension, "png");
    equal(detectImageType(WEBP)?.extension, "webp");
  });

  it("từ chối file không phải ảnh dù tên/Content-Type giả là ảnh", () => {
    equal(detectImageType(Buffer.from("<svg onload=alert(1)>")), null);
    equal(detectImageType(Buffer.from("%PDF-1.7")), null);
    equal(detectImageType(Buffer.alloc(0)), null);
  });

  it("làm sạch tên file gốc", () => {
    equal(sanitizeOriginalName("../../etc/passwd"), "passwd");
    equal(sanitizeOriginalName("C:\\ảnh\\bìa dự án.png"), "bìa dự án.png");
    equal(sanitizeOriginalName("a\u0000b.png"), "ab.png");
    equal(sanitizeOriginalName(undefined), null);
  });
});

describe("MediaService", () => {
  let storage: ReturnType<typeof memoryStorage>;
  let repo: ReturnType<typeof mediaRepo>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: MediaService;

  beforeEach(() => {
    storage = memoryStorage();
    repo = mediaRepo();
    audit = makeAuditRecorder();
    service = new MediaService(repo as any, storage, audit.service);
  });

  it("lưu ảnh với khóa do server sinh, trả URL tương đối và ghi audit", async () => {
    const result = await service.uploadImage({ buffer: PNG, size: PNG.length, originalname: "bia.png" }, user);
    match(result.url, /^\/api\/v1\/media\/campaigns\/[0-9a-f-]{36}\.png$/);
    equal(result.mimeType, "image/png");
    ok(storage.files.has(result.url.slice(MEDIA_URL_PREFIX.length)));
    equal(repo.rows[0].ownerId, user.id);
    equal(audit.entries[0].action, "media.upload");
    ok(isImageUrl(result.url), "URL trả về phải qua được validator imageUrl");
  });

  it("dùng thư mục theo mục đích ảnh", async () => {
    const result = await service.uploadImage({ buffer: JPEG, size: JPEG.length }, user, MediaPurpose.PROGRESS_IMAGE);
    match(result.url, /\/media\/progress\/.+\.jpg$/);
  });

  it("từ chối khi thiếu file, file rỗng, quá 5 MB hoặc không phải ảnh", async () => {
    await rejects(service.uploadImage(undefined, user), BadRequestException);
    await rejects(service.uploadImage({ buffer: Buffer.alloc(0), size: 0 }, user), BadRequestException);
    await rejects(service.uploadImage({ buffer: PNG, size: MAX_IMAGE_BYTES + 1 }, user), PayloadTooLargeException);
    const html = Buffer.from("<html><script>alert(1)</script>");
    await rejects(service.uploadImage({ buffer: html, size: html.length, originalname: "x.png" }, user), BadRequestException);
    equal(storage.files.size, 0);
    equal(repo.rows.length, 0);
  });

  it("đọc lại file đã lưu; 404 với khóa lạ hoặc không có bản ghi", async () => {
    const { url } = await service.uploadImage({ buffer: WEBP, size: WEBP.length }, user);
    const file = await service.getFile(url.slice(MEDIA_URL_PREFIX.length));
    equal(file.mimeType, "image/webp");
    deepEqual(file.body, WEBP);
    await rejects(service.getFile("../secret.png"), NotFoundException);
    await rejects(service.getFile("campaigns/00000000-0000-4000-8000-000000000000.png"), NotFoundException);
  });
});

describe("LocalStorageGateway", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "gopmam-media-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ghi và đọc file; trả null khi không có", async () => {
    const gateway = new LocalStorageGateway(dir);
    const key = "campaigns/123e4567-e89b-12d3-a456-426614174000.png";
    await gateway.put(key, PNG);
    deepEqual(await gateway.get(key), PNG);
    equal(await gateway.get("campaigns/123e4567-e89b-12d3-a456-426614174001.png"), null);
  });

  it("chặn khóa có path traversal", async () => {
    const gateway = new LocalStorageGateway(dir);
    await rejects(gateway.put("../evil.png", PNG));
    await rejects(gateway.get("campaigns/../../evil.png"));
  });
});

describe("isImageUrl", () => {
  it("chấp nhận link http(s) và đường dẫn ảnh hệ thống", () => {
    ok(isImageUrl("https://example.com/a.jpg"));
    ok(isImageUrl("/api/v1/media/campaigns/123e4567-e89b-12d3-a456-426614174000.webp"));
  });

  it("từ chối giao thức nguy hiểm và đường dẫn tùy ý", () => {
    equal(isImageUrl("javascript:alert(1)"), false);
    equal(isImageUrl("/api/v1/media/../../etc/passwd"), false);
    equal(isImageUrl("/uploads/a.png"), false);
    equal(isImageUrl(42), false);
  });
});
