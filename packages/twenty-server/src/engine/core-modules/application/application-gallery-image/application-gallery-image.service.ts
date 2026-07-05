import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ApplicationGalleryImageEntity } from 'src/engine/core-modules/application/application-gallery-image/application-gallery-image.entity';

@Injectable()
export class ApplicationGalleryImageService {
  constructor(
    @InjectRepository(ApplicationGalleryImageEntity)
    private readonly applicationGalleryImageRepository: Repository<ApplicationGalleryImageEntity>,
  ) {}

  // Replace the full ordered gallery for an installed application. Existing rows
  // are removed first so re-installs and upgrades stay idempotent; positions are
  // derived from the order of the provided file ids.
  async replaceApplicationGalleryImages({
    applicationId,
    fileIds,
  }: {
    applicationId: string;
    fileIds: string[];
  }): Promise<void> {
    await this.applicationGalleryImageRepository.delete({ applicationId });

    if (fileIds.length === 0) {
      return;
    }

    await this.applicationGalleryImageRepository.insert(
      fileIds.map((fileId, position) => ({ fileId, position, applicationId })),
    );
  }

  // Replace the full ordered gallery for a catalog registration.
  async replaceRegistrationGalleryImages({
    applicationRegistrationId,
    fileIds,
  }: {
    applicationRegistrationId: string;
    fileIds: string[];
  }): Promise<void> {
    await this.applicationGalleryImageRepository.delete({
      applicationRegistrationId,
    });

    if (fileIds.length === 0) {
      return;
    }

    await this.applicationGalleryImageRepository.insert(
      fileIds.map((fileId, position) => ({
        fileId,
        position,
        applicationRegistrationId,
      })),
    );
  }
}
