import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Manifest } from 'twenty-shared/application';

import { ApplicationManifestStorageService } from 'src/engine/core-modules/application/application-registration/application-manifest-storage.service';
import { ApplicationRegistrationEntity } from 'src/engine/core-modules/application/application-registration/application-registration.entity';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationRegistrationVariableService } from 'src/engine/core-modules/application/application-registration-variable/application-registration-variable.service';
import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

describe('ApplicationRegistrationService.getManifest', () => {
  let service: ApplicationRegistrationService;
  let applicationManifestStorageService: jest.Mocked<ApplicationManifestStorageService>;

  const manifestFromStorage = {
    application: { displayName: 'From Storage' },
  } as unknown as Manifest;

  const manifestFromColumn = {
    application: { displayName: 'From Column' },
  } as unknown as Manifest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationRegistrationService,
        {
          provide: getRepositoryToken(ApplicationRegistrationEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ApplicationEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: {},
        },
        {
          provide: ApplicationRegistrationVariableService,
          useValue: {},
        },
        {
          provide: CacheLockService,
          useValue: {},
        },
        {
          provide: ApplicationManifestStorageService,
          useValue: {
            writeManifest: jest.fn(),
            readManifest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApplicationRegistrationService);
    applicationManifestStorageService = module.get(
      ApplicationManifestStorageService,
    );

    jest.clearAllMocks();
  });

  it('should return the manifest from storage when a storage path is set', async () => {
    applicationManifestStorageService.readManifest.mockResolvedValue(
      manifestFromStorage,
    );

    const registration = {
      manifestStoragePath: 'application-manifest/registration-id/1.0.0.json',
      manifest: manifestFromColumn,
    } as ApplicationRegistrationEntity;

    await expect(service.getManifest(registration)).resolves.toEqual(
      manifestFromStorage,
    );
    expect(
      applicationManifestStorageService.readManifest,
    ).toHaveBeenCalledWith('application-manifest/registration-id/1.0.0.json');
  });

  it('should fall back to the database column when the storage read fails', async () => {
    applicationManifestStorageService.readManifest.mockResolvedValue(null);

    const registration = {
      manifestStoragePath: 'application-manifest/registration-id/1.0.0.json',
      manifest: manifestFromColumn,
    } as ApplicationRegistrationEntity;

    await expect(service.getManifest(registration)).resolves.toEqual(
      manifestFromColumn,
    );
  });

  it('should return the database column manifest when no storage path is set', async () => {
    const registration = {
      manifestStoragePath: null,
      manifest: manifestFromColumn,
    } as ApplicationRegistrationEntity;

    await expect(service.getManifest(registration)).resolves.toEqual(
      manifestFromColumn,
    );
    expect(
      applicationManifestStorageService.readManifest,
    ).not.toHaveBeenCalled();
  });

  it('should return null when neither a storage path nor a column manifest exists', async () => {
    const registration = {
      manifestStoragePath: null,
      manifest: null,
    } as ApplicationRegistrationEntity;

    await expect(service.getManifest(registration)).resolves.toBeNull();
  });
});
