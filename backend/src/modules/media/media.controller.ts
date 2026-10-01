import {
  Body,
  Controller,
  Get,
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

  @Get(":folder/:file")
  async serve(
    @Param("folder") folder: string,
    @Param("file") file: string,
    @Res() res: Response,
  ): Promise<void> {
    const { body, mimeType } = await this.mediaService.getFile(`${folder}/${file}`);
    res.set({
      "Content-Type": mimeType,
      "Content-Length": String(body.length),
      // Tên file là UUID, nội dung không bao giờ đổi
      "Cache-Control": "public, max-age=31536000, immutable",
      // Helmet mặc định same-origin; frontend dev (cổng khác) cần nhúng được ảnh
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    });
    res.send(body);
  }
}
