import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { STORAGE_KEY_PATTERN, type StorageGateway } from "../../integrations/storage/storage.gateway";
import { type User, UserRole } from "../users/entities/user.entity";
import type { UploadedImageResponse } from "./dto/media.dto";
import { MediaFile, MediaPurpose } from "./entities/media-file.entity";
import { fingerprintImage } from "./image-fingerprint";
import { MAX_IMAGE_BYTES, detectImageType, sanitizeOriginalName } from "./image-type";
import { MAX_VIDEO_BYTES, detectVideoType } from "./video-type";

/** Tiền tố URL công khai của file; khớp `GET /media/:folder/:file`. */
export const MEDIA_URL_PREFIX = "/api/v1/media/";

const FINGERPRINTED_PURPOSES = [MediaPurpose.EXPENSE_RECEIPT, MediaPurpose.ORGANIZATION_DOCUMENT];

const FOLDER_BY_PURPOSE: Record<MediaPurpose, string> = {
  [MediaPurpose.CAMPAIGN_IMAGE]: "campaigns",
  [MediaPurpose.PROGRESS_IMAGE]: "progress",
  [MediaPurpose.AVATAR]: "avatars",
  [MediaPurpose.EXPENSE_RECEIPT]: "receipts",
  [MediaPurpose.REFUND_PROOF]: "refunds",
  [MediaPurpose.ORGANIZATION_LOGO]: "organizations",
  [MediaPurpose.ORGANIZATION_DOCUMENT]: "org-documents",
  [MediaPurpose.CATEGORY_IMAGE]: "categories",
  [MediaPurpose.CAMPAIGN_VIDEO]: "campaign-videos",
};

export type IncomingFile = {
  buffer: Buffer;
  size: number;
  originalname?: string;
};

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    @Inject("StorageGateway")
    private readonly storage: StorageGateway,
    private readonly auditService: AuditService,
  ) {}

  async uploadImage(
    file: IncomingFile | undefined,
    user: User,
    purpose: MediaPurpose = MediaPurpose.CAMPAIGN_IMAGE,
  ): Promise<UploadedImageResponse> {
    if (purpose === MediaPurpose.REFUND_PROOF && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên được tải chứng từ hoàn tiền.");
    }
    if (purpose === MediaPurpose.CATEGORY_IMAGE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên được tải ảnh lĩnh vực.");
    }
    if (purpose === MediaPurpose.CAMPAIGN_VIDEO) {
      throw new BadRequestException("Video tải lên qua POST /media/videos.");
    }
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException("Vui lòng chọn một file ảnh.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException("Ảnh tối đa 5 MB.");
    }
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
    }

    // Dấu vân ảnh: chứng từ chi tiêu (chống dùng lại) và ảnh giấy phép tổ chức (chống trùng hồ sơ).
    const fingerprint = FINGERPRINTED_PURPOSES.includes(purpose) ? await fingerprintImage(file.buffer) : undefined;

    const storageKey = `${FOLDER_BY_PURPOSE[purpose]}/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.mimeType);

    return this.saveRecord(file, user, purpose, storageKey, type.mimeType, fingerprint);
  }

  /** Video giới thiệu dự án: MP4/WebM (nhận diện theo nội dung file), tối đa 100 MB. */
  async uploadVideo(file: IncomingFile | undefined, user: User): Promise<UploadedImageResponse> {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException("Vui lòng chọn một file video.");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new PayloadTooLargeException("Video tối đa 100 MB.");
    }
    const type = detectVideoType(file.buffer);
    if (!type) {
      throw new BadRequestException("Chỉ chấp nhận video MP4, MOV hoặc WebM.");
    }
    const purpose = MediaPurpose.CAMPAIGN_VIDEO;
    const storageKey = `${FOLDER_BY_PURPOSE[purpose]}/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.mimeType);
    return this.saveRecord(file, user, purpose, storageKey, type.mimeType);
  }

  private async saveRecord(
    file: IncomingFile,
    user: User,
    purpose: MediaPurpose,
    storageKey: string,
    mimeType: string,
    fingerprint?: Awaited<ReturnType<typeof fingerprintImage>>,
  ): Promise<UploadedImageResponse> {
    // Multer đọc tên file theo latin1; chuyển lại UTF-8 để giữ tiếng Việt.
    const originalName = sanitizeOriginalName(
      file.originalname ? Buffer.from(file.originalname, "latin1").toString("utf8") : undefined,
    );
    const saved = await this.mediaRepo.save(
      this.mediaRepo.create({
        ownerId: user.id,
        storageKey,
        mimeType,
        sizeBytes: file.size,
        purpose,
        originalName,
        ...fingerprint,
      }),
    );

    await this.auditService.record({
      userId: user.id,
      action: "media.upload",
      entity: "media_file",
      entityId: saved.id,
      newValues: { storageKey, mimeType, sizeBytes: file.size, purpose },
    });

    return {
      id: saved.id,
      url: `${MEDIA_URL_PREFIX}${storageKey}`,
      mimeType,
      sizeBytes: file.size,
    };
  }

  /** Đọc file để trả về công khai; chỉ file có bản ghi và chưa bị xóa. */
  async getFile(storageKey: string): Promise<{ body: Buffer; mimeType: string }> {
    const record = await this.findRecord(storageKey);
    const body = await this.storage.get(storageKey);
    if (!body) {
      throw new NotFoundException("File not found");
    }
    return { body, mimeType: record.mimeType };
  }

  /** Kích thước + kiểu file (để trả theo từng đoạn khi phát video). */
  async getFileInfo(storageKey: string): Promise<{ size: number; mimeType: string }> {
    const record = await this.findRecord(storageKey);
    const size = await this.storage.size(storageKey);
    if (size === null) {
      throw new NotFoundException("File not found");
    }
    return { size, mimeType: record.mimeType };
  }

  /** Đoạn byte `[start, end]` của file đã kiểm tra bằng `getFileInfo`. */
  async getFileRange(storageKey: string, start: number, end: number): Promise<Buffer> {
    const body = await this.storage.getRange(storageKey, start, end);
    if (!body) {
      throw new NotFoundException("File not found");
    }
    return body;
  }

  private async findRecord(storageKey: string): Promise<MediaFile> {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new NotFoundException("File not found");
    }
    const record = await this.mediaRepo.findOne({ where: { storageKey } });
    if (!record) {
      throw new NotFoundException("File not found");
    }
    return record;
  }
}
