import { Test, type TestingModule } from '@nestjs/testing';

import { Readable } from 'stream';

import { type Manifest } from 'twenty-shared/application';

import { ApplicationManifestStorageService } from 'src/engine/core-modules/application/application-registration/application-manifest-storage.service';
import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { FileStorageDriverFactory } from 'src/engine/core-modules/file-storage/file-storage-driver.factory';

describe('ApplicationManifestStorageService', () => {
  let service: ApplicationManifestStorageService;
  let writeFileMock: jest.Mock;
  let readFileMock: jest.Mock;

  const applicationRegistrationId = 'a3d8e9f0-1234-4b5c-8d6e-7f8a9b0c1d2e';
  const manifest = {
    application: { displayName: 'Test App' },
  } as unknown as Manifest;

  beforeEach(async () => {
    writeFileMock = jest.fn().mockResolvedValue(undefined);
    readFileMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationManifestStorageService,
        {
          provide: FileStorageDriverFactory,
          useValue: {
            getCurrentDriver: jest.fn(() => ({
              writeFile: writeFileMock,
              readFile: readFileMock,
            })),
          },
        },
      ],
    }).compile();

    service = module.get(ApplicationManifestStorageService);

    jest.clearAllMocks();
  });

  describe('writeManifest', () => {
    it('should write the serialized manifest and return the storage path', async () => {
      const storagePath = await service.writeManifest({
        applicationRegistrationId,
        manifest,
        sourceType: ApplicationRegistrationSourceType.NPM,
        version: '2.0.0',
      });

      expect(storagePath).toBe(
        `application-manifest/${applicationRegistrationId}/2.0.0.json`,
      );
      expect(writeFileMock).toHaveBeenCalledWith({
        filePath: `application-manifest/${applicationRegistrationId}/2.0.0.json`,
        sourceFile: Buffer.from(JSON.stringify(manifest), 'utf-8'),
        mimeType: 'application/json',
      });
    });

    it('should write to the dev path when source type is LOCAL', async () => {
      const storagePath = await service.writeManifest({
        applicationRegistrationId,
        manifest,
        sourceType: ApplicationRegistrationSourceType.LOCAL,
      });

      expect(storagePath).toBe(
        `application-manifest/${applicationRegistrationId}/dev.json`,
      );
    });

    it('should return null when the storage write fails', async () => {
      writeFileMock.mockRejectedValue(new Error('storage unavailable'));

      const storagePath = await service.writeManifest({
        applicationRegistrationId,
        manifest,
        sourceType: ApplicationRegistrationSourceType.NPM,
        version: '2.0.0',
      });

      expect(storagePath).toBeNull();
    });
  });

  describe('readManifest', () => {
    it('should read and parse the manifest from storage', async () => {
      readFileMock.mockResolvedValue(
        Readable.from([Buffer.from(JSON.stringify(manifest), 'utf-8')]),
      );

      const result = await service.readManifest(
        `application-manifest/${applicationRegistrationId}/2.0.0.json`,
      );

      expect(readFileMock).toHaveBeenCalledWith({
        filePath: `application-manifest/${applicationRegistrationId}/2.0.0.json`,
      });
      expect(result).toEqual(manifest);
    });

    it('should return null when the storage read fails', async () => {
      readFileMock.mockRejectedValue(new Error('file not found'));

      const result = await service.readManifest(
        `application-manifest/${applicationRegistrationId}/missing.json`,
      );

      expect(result).toBeNull();
    });

    it('should return null when the stored content is not valid JSON', async () => {
      readFileMock.mockResolvedValue(
        Readable.from([Buffer.from('not-json', 'utf-8')]),
      );

      const result = await service.readManifest(
        `application-manifest/${applicationRegistrationId}/corrupted.json`,
      );

      expect(result).toBeNull();
    });
  });
});
