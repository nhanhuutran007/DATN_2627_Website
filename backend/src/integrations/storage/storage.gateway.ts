import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import { GetObjectCommand, HeadObjectCommand, NoSuchKey, NotFound, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";

/**
 * Nơi lưu file người dùng tải lên. Khóa (key) do server sinh (UUID + đuôi),
 * không bao giờ lấy từ tên file của client.
 */
export interface StorageGateway {
  readonly driver: "local" | "s3";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Trả `null` nếu không có file. */
  get(key: string): Promise<Buffer | null>;
  /** Kích thước file (byte), `null` nếu không có. */
  size(key: string): Promise<number | null>;
  /** Đoạn byte `[start, end]` (gồm cả hai đầu) — phát video có tua không cần đọc cả file. */
  getRange(key: string, start: number, end: number): Promise<Buffer | null>;
}

/** Chỉ chấp nhận khóa dạng `<thư-mục>/<uuid>.<đuôi>` để chặn path traversal. */
export const STORAGE_KEY_PATTERN = /^[a-z-]+\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/;

function assertSafeKey(key: string): void {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}

/** Lưu ra ổ đĩa (dev/Docker: mount volume vào `UPLOAD_DIR`). */
export class LocalStorageGateway implements StorageGateway {
  readonly driver = "local" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(key: string): string {
    assertSafeKey(key);
    const full = resolve(join(this.root, key));
    if (!full.startsWith(this.root + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.pathFor(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body, { flag: "wx" });
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.pathFor(key))).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    let handle;
    try {
      handle = await open(this.pathFor(key), "r");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    try {
      const buffer = Buffer.alloc(end - start + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }
}

/** Lưu lên S3 (AWS: container Fargate không có ổ đĩa bền vững). Quyền qua IAM task role. */
export class S3StorageGateway implements StorageGateway {
  readonly driver = "s3" as const;

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async size(key: string): Promise<number | null> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return result.ContentLength ?? null;
    } catch (error) {
      if (error instanceof NotFound || error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    assertSafeKey(key);
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=${start}-${end}` }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }
}

export function createStorageGateway(env: NodeJS.ProcessEnv = process.env): StorageGateway {
  const logger = new Logger("StorageGateway");
  if ((env.STORAGE_DRIVER ?? "local").trim().toLowerCase() === "s3") {
    const bucket = env.S3_BUCKET?.trim();
    if (!bucket) {
      throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    }
    const region = env.S3_REGION?.trim() || env.AWS_REGION?.trim() || "ap-southeast-1";
    logger.log(`Lưu file lên S3 (bucket ${bucket}, region ${region})`);
    return new S3StorageGateway(new S3Client({ region }), bucket);
  }
  const root = env.UPLOAD_DIR?.trim() || join(process.cwd(), "uploads");
  logger.log(`Lưu file ra ổ đĩa (${resolve(root)})`);
  return new LocalStorageGateway(root);
}
