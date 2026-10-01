import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { createStorageGateway } from "../../integrations/storage/storage.gateway";
import { MediaFile } from "./entities/media-file.entity";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [TypeOrmModule.forFeature([MediaFile])],
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: "StorageGateway",
      useFactory: () => createStorageGateway(),
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
