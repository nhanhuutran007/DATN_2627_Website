import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { STORAGE_KEY_PATTERN, type StorageGateway } from "../../integrations/storage/storage.gateway";
import type { User } from "../users/entities/user.entity";
import type { UploadedImageResponse } from "./dto/media.dto";
import { MediaFile, MediaPurpose } from "./entities/media-file.entity";
import { MAX_IMAGE_BYTES, detectImageType, sanitizeOriginalName } from "./image-type";

/** Tiền tố URL công khai của file; khớp `GET /media/:folder/:file`. */
export const MEDIA_URL_PREFIX = "/api/v1/media/";

const FOLDER_BY_PURPOSE: Record<MediaPurpose, string> = {
  [MediaPurpose.CAMPAIGN_IMAGE]: "campaigns",
  [MediaPurpose.PROGRESS_IMAGE]: "progress",
  [MediaPurpose.AVATAR]: "avatars",
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

    const storageKey = `${FOLDER_BY_PURPOSE[purpose]}/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.mimeType);

    // Multer đọc tên file theo latin1; chuyển lại UTF-8 để giữ tiếng Việt.
    const originalName = sanitizeOriginalName(
      file.originalname ? Buffer.from(file.originalname, "latin1").toString("utf8") : undefined,
    );
    const saved = await this.mediaRepo.save(
      this.mediaRepo.create({
        ownerId: user.id,
        storageKey,
        mimeType: type.mimeType,
        sizeBytes: file.size,
        purpose,
        originalName,
      }),
    );

    await this.auditService.record({
      userId: user.id,
      action: "media.upload",
      entity: "media_file",
      entityId: saved.id,
      newValues: { storageKey, mimeType: type.mimeType, sizeBytes: file.size, purpose },
    });

    return {
      id: saved.id,
      url: `${MEDIA_URL_PREFIX}${storageKey}`,
      mimeType: type.mimeType,
      sizeBytes: file.size,
    };
  }

  /** Đọc file để trả về công khai; chỉ file có bản ghi và chưa bị xóa. */
  async getFile(storageKey: string): Promise<{ body: Buffer; mimeType: string }> {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new NotFoundException("File not found");
    }
    const record = await this.mediaRepo.findOne({ where: { storageKey } });
    if (!record) {
      throw new NotFoundException("File not found");
    }
    const body = await this.storage.get(storageKey);
    if (!body) {
      throw new NotFoundException("File not found");
    }
    return { body, mimeType: record.mimeType };
  }
}
