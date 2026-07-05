import { Injectable, Logger } from '@nestjs/common';

import { type Manifest } from 'twenty-shared/application';

import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { buildApplicationManifestStoragePath } from 'src/engine/core-modules/application/application-registration/utils/build-application-manifest-storage-path.util';
import { FileStorageDriverFactory } from 'src/engine/core-modules/file-storage/file-storage-driver.factory';
import { streamToBuffer } from 'src/utils/stream-to-buffer';

@Injectable()
export class ApplicationManifestStorageService {
  private readonly logger = new Logger(ApplicationManifestStorageService.name);

  constructor(
    private readonly fileStorageDriverFactory: FileStorageDriverFactory,
  ) {}

  async writeManifest({
    applicationRegistrationId,
    manifest,
    sourceType,
    version,
  }: {
    applicationRegistrationId: string;
    manifest: Manifest;
    sourceType: ApplicationRegistrationSourceType;
    version?: string | null;
  }): Promise<string | null> {
    const serializedManifest = JSON.stringify(manifest);

    const storagePath = buildApplicationManifestStoragePath({
      applicationRegistrationId,
      sourceType,
      version,
      serializedManifest,
    });

    try {
      await this.fileStorageDriverFactory.getCurrentDriver().writeFile({
        filePath: storagePath,
        sourceFile: Buffer.from(serializedManifest, 'utf-8'),
        mimeType: 'application/json',
      });

      return storagePath;
    } catch (error) {
      this.logger.error(
        `Failed to write manifest to storage at ${storagePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return null;
    }
  }

  async readManifest(storagePath: string): Promise<Manifest | null> {
    try {
      const stream = await this.fileStorageDriverFactory
        .getCurrentDriver()
        .readFile({ filePath: storagePath });

      const content = (await streamToBuffer(stream)).toString('utf-8');

      return JSON.parse(content) as Manifest;
    } catch (error) {
      this.logger.warn(
        `Failed to read manifest from storage at ${storagePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return null;
    }
  }
}
