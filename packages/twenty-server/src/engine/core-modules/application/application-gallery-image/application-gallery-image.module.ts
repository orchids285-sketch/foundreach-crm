import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationGalleryImageEntity } from 'src/engine/core-modules/application/application-gallery-image/application-gallery-image.entity';
import { ApplicationGalleryImageService } from 'src/engine/core-modules/application/application-gallery-image/application-gallery-image.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationGalleryImageEntity])],
  providers: [ApplicationGalleryImageService],
  exports: [ApplicationGalleryImageService],
})
export class ApplicationGalleryImageModule {}
