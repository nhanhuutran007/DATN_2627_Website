import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
  isCampaignVideoUrl,
  normalizeVideoUrl,
  youtubeVideoId,
} from "../src/common/validators/is-video-url";
import { LocalStorageGateway, type StorageGateway } from "../src/integrations/storage/storage.gateway";
import { CreateCampaignDto, UpdateCampaignDto } from "../src/modules/campaigns/dto/campaign.dto";
import { MediaPurpose } from "../src/modules/media/entities/media-file.entity";
import { parseByteRange } from "../src/modules/media/media.controller";
import { MEDIA_URL_PREFIX, MediaService } from "../src/modules/media/media.service";
import { MAX_VIDEO_BYTES, detectVideoType } from "../src/modules/media/video-type";
import { makeAuditRecorder } from "./helpers/audit";

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(8)]);
const MOV = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from("ftypqt  "), Buffer.alloc(8)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(8)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const user = { id: "123e4567-e89b-12d3-a456-426614174000" } as any;
const YT_ID = "dQw4w9WgXcQ";

function memoryStorage(): StorageGateway & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    driver: "local",
    files,
    put: async (key, body) => {
      files.set(key, body);
    },
    get: async (key) => files.get(key) ?? null,
    size: async (key) => files.get(key)?.length ?? null,
    getRange: async (key, start, end) => files.get(key)?.subarray(start, end + 1) ?? null,
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

describe("detectVideoType", () => {
  it("nhận diện MP4, MOV (iPhone) và WebM theo nội dung file", () => {
    equal(detectVideoType(MP4)?.mimeType, "video/mp4");
    equal(detectVideoType(MOV)?.extension, "mp4");
    equal(detectVideoType(WEBM)?.mimeType, "video/webm");
  });

  it("từ chối ảnh, văn bản và file rỗng", () => {
    equal(detectVideoType(PNG), null);
    equal(detectVideoType(Buffer.from("<html>not a video</html>")), null);
    equal(detectVideoType(Buffer.alloc(0)), null);
  });
});

describe("video URL", () => {
  it("lấy mã video từ các dạng link YouTube", () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${YT_ID}`,
      `https://youtube.com/watch?v=${YT_ID}&t=42s`,
      `https://m.youtube.com/watch?v=${YT_ID}`,
      `https://youtu.be/${YT_ID}?si=abc`,
      `https://www.youtube.com/shorts/${YT_ID}`,
      `https://www.youtube.com/embed/${YT_ID}`,
      `https://www.youtube-nocookie.com/embed/${YT_ID}`,
    ]) {
      equal(youtubeVideoId(url), YT_ID, url);
    }
  });

  it("từ chối link không phải YouTube hoặc mã sai", () => {
    equal(youtubeVideoId("https://vimeo.com/123456"), null);
    equal(youtubeVideoId(`https://evil.com/watch?v=${YT_ID}`), null);
    equal(youtubeVideoId("https://www.youtube.com/watch?v=short"), null);
    equal(youtubeVideoId(`javascript:alert(1)//youtu.be/${YT_ID}`), null);
    equal(youtubeVideoId("not a url"), null);
  });

  it("chuẩn hóa link YouTube, giữ nguyên đường dẫn video đã tải lên", () => {
    equal(normalizeVideoUrl(` https://youtu.be/${YT_ID}?si=x `), `https://www.youtube.com/watch?v=${YT_ID}`);
    const uploaded = "/api/v1/media/campaign-videos/123e4567-e89b-12d3-a456-426614174000.mp4";
    equal(normalizeVideoUrl(uploaded), uploaded);
  });

  it("chỉ nhận YouTube hoặc video trong thư mục campaign-videos", () => {
    ok(isCampaignVideoUrl(`https://youtu.be/${YT_ID}`));
    ok(isCampaignVideoUrl("/api/v1/media/campaign-videos/123e4567-e89b-12d3-a456-426614174000.webm"));
    ok(!isCampaignVideoUrl("/api/v1/media/campaigns/123e4567-e89b-12d3-a456-426614174000.png"));
    ok(!isCampaignVideoUrl("https://example.com/video.mp4"));
    ok(!isCampaignVideoUrl(42));
  });
});

describe("campaign DTO videoUrl", () => {
  const base = {
    title: "Thư viện nhỏ",
    description: "Mô tả",
    category: "Giáo dục",
    goalAmount: 10_000_000,
    endDate: "2027-01-31T00:00:00.000Z",
    location: "Hà Nội",
  };

  it("chuẩn hóa link YouTube khi tạo chiến dịch", async () => {
    const dto = plainToInstance(CreateCampaignDto, { ...base, videoUrl: `https://youtu.be/${YT_ID}` });
    const errors = await validate(dto);
    deepEqual(errors.filter((error) => error.property === "videoUrl"), []);
    equal(dto.videoUrl, `https://www.youtube.com/watch?v=${YT_ID}`);
  });

  it("từ chối link video lạ", async () => {
    const dto = plainToInstance(CreateCampaignDto, { ...base, videoUrl: "https://example.com/a.mp4" });
    const errors = await validate(dto);
    ok(errors.some((error) => error.property === "videoUrl"));
  });

  it("cho phép gửi null khi sửa để bỏ video", async () => {
    const dto = plainToInstance(UpdateCampaignDto, { videoUrl: null });
    const errors = await validate(dto);
    deepEqual(errors.filter((error) => error.property === "videoUrl"), []);
  });
});

describe("MediaService.uploadVideo", () => {
  let storage: ReturnType<typeof memoryStorage>;
  let repo: ReturnType<typeof mediaRepo>;
  let service: MediaService;

  beforeEach(() => {
    storage = memoryStorage();
    repo = mediaRepo();
    service = new MediaService(repo as any, storage, makeAuditRecorder().service);
  });

  it("lưu video vào thư mục campaign-videos với khóa do server sinh", async () => {
    const result = await service.uploadVideo({ buffer: MP4, size: MP4.length, originalname: "gioi-thieu.mov" }, user);
    ok(/^\/api\/v1\/media\/campaign-videos\/[0-9a-f-]{36}\.mp4$/.test(result.url));
    equal(result.mimeType, "video/mp4");
    ok(storage.files.has(result.url.slice(MEDIA_URL_PREFIX.length)));
    equal(repo.rows[0].purpose, MediaPurpose.CAMPAIGN_VIDEO);
  });

  it("từ chối thiếu file, file quá 100 MB hoặc không phải video", async () => {
    await rejects(service.uploadVideo(undefined, user), BadRequestException);
    await rejects(service.uploadVideo({ buffer: MP4, size: MAX_VIDEO_BYTES + 1 }, user), PayloadTooLargeException);
    await rejects(service.uploadVideo({ buffer: PNG, size: PNG.length }, user), BadRequestException);
    equal(storage.files.size, 0);
  });

  it("không cho tải video qua endpoint ảnh", async () => {
    await rejects(
      service.uploadImage({ buffer: PNG, size: PNG.length }, user, MediaPurpose.CAMPAIGN_VIDEO),
      BadRequestException,
    );
  });

  it("đọc theo đoạn byte để phát video có tua", async () => {
    const { url } = await service.uploadVideo({ buffer: WEBM, size: WEBM.length }, user);
    const key = url.slice(MEDIA_URL_PREFIX.length);
    deepEqual(await service.getFileInfo(key), { size: WEBM.length, mimeType: "video/webm" });
    deepEqual(await service.getFileRange(key, 0, 3), WEBM.subarray(0, 4));
  });
});

describe("parseByteRange", () => {
  it("đọc các dạng Range phổ biến", () => {
    equal(parseByteRange(undefined, 100), null);
    deepEqual(parseByteRange("bytes=0-", 100), { start: 0, end: 99 });
    deepEqual(parseByteRange("bytes=10-19", 100), { start: 10, end: 19 });
    deepEqual(parseByteRange("bytes=90-500", 100), { start: 90, end: 99 });
    deepEqual(parseByteRange("bytes=-10", 100), { start: 90, end: 99 });
  });

  it("trả invalid cho đoạn ngoài file hoặc sai cú pháp", () => {
    equal(parseByteRange("bytes=100-", 100), "invalid");
    equal(parseByteRange("bytes=20-10", 100), "invalid");
    equal(parseByteRange("bytes=-", 100), "invalid");
    equal(parseByteRange("items=0-1", 100), "invalid");
    equal(parseByteRange("bytes=0-1,5-6", 100), "invalid");
  });
});

describe("LocalStorageGateway video", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "gopmam-video-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lưu video và đọc kích thước, đoạn byte", async () => {
    const gateway = new LocalStorageGateway(dir);
    const key = "campaign-videos/123e4567-e89b-12d3-a456-426614174000.mp4";
    await gateway.put(key, MP4);
    equal(await gateway.size(key), MP4.length);
    deepEqual(await gateway.getRange(key, 4, 7), Buffer.from("ftyp"));
    equal(await gateway.size("campaign-videos/123e4567-e89b-12d3-a456-426614174001.mp4"), null);
    equal(await gateway.getRange("campaign-videos/123e4567-e89b-12d3-a456-426614174001.mp4", 0, 3), null);
  });
});
