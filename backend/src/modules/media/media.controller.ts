import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { UploadImageDto } from "./dto/media.dto";
import { MAX_IMAGE_BYTES } from "./image-type";
import { type IncomingFile, MediaService } from "./media.service";
import { MAX_VIDEO_BYTES } from "./video-type";

/** Mỗi phản hồi `206 Partial Content` tối đa 4 MB, không đọc cả video vào bộ nhớ. */
const MAX_RANGE_BYTES = 4 * 1024 * 1024;

/**
 * Đoạn byte yêu cầu qua header `Range: bytes=a-b` (một đoạn). Trình duyệt cần để tua video,
 * Safari từ chối phát video nếu máy chủ không hỗ trợ. `null` = trả cả file; `"invalid"` = 416.
 */
export function parseByteRange(header: string | undefined, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return "invalid";
  let start: number;
  let end: number;
  if (match[1] === "") {
    // "bytes=-N": N byte cuối
    const suffix = Number(match[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("images")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 15 * 60_000, keyPrefix: "media-upload" })
  // Giữ trong bộ nhớ (≤ 5 MB) để kiểm tra magic bytes trước khi ghi vào kho.
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  upload(
    @UploadedFile() file: IncomingFile | undefined,
    @Body() dto: UploadImageDto,
    @GetCurrentUser() user: User,
  ) {
    return this.mediaService.uploadImage(file, user, dto.purpose);
  }

  /** Video giới thiệu dự án (MP4/MOV/WebM, tối đa 2 phút). */
  @Post("videos")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60_000, keyPrefix: "media-video-upload" })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_VIDEO_BYTES, files: 1 } }))
  uploadVideo(@UploadedFile() file: IncomingFile | undefined, @GetCurrentUser() user: User) {
    return this.mediaService.uploadVideo(file, user);
  }

  @Get(":folder/:file")
  async serve(
    @Param("folder") folder: string,
    @Param("file") file: string,
    @Res() res: Response,
    @Headers("range") range?: string,
  ): Promise<void> {
    const key = `${folder}/${file}`;
    const { size, mimeType } = await this.mediaService.getFileInfo(key);
    res.set({
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      // Tên file là UUID, nội dung không bao giờ đổi
      "Cache-Control": "public, max-age=31536000, immutable",
      // Helmet mặc định same-origin; frontend dev (cổng khác) cần nhúng được ảnh/video
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
    });
    const part = parseByteRange(range, size);
    if (part === "invalid") {
      res.status(416).set("Content-Range", `bytes */${size}`).end();
      return;
    }
    if (part) {
      // Trả từng phần ≤ 4 MB (HTTP cho phép trả ít hơn đoạn được hỏi); trình duyệt tự hỏi tiếp.
      const end = Math.min(part.end, part.start + MAX_RANGE_BYTES - 1);
      const chunk = await this.mediaService.getFileRange(key, part.start, end);
      res
        .status(206)
        .set({
          "Content-Range": `bytes ${part.start}-${part.start + chunk.length - 1}/${size}`,
          "Content-Length": String(chunk.length),
        })
        .send(chunk);
      return;
    }
    const { body } = await this.mediaService.getFile(key);
    res.set("Content-Length", String(body.length));
    res.send(body);
  }
}
