import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';
import { buildApplicationManifestStoragePath } from 'src/engine/core-modules/application/application-registration/utils/build-application-manifest-storage-path.util';

describe('buildApplicationManifestStoragePath', () => {
  const applicationRegistrationId = 'a3d8e9f0-1234-4b5c-8d6e-7f8a9b0c1d2e';

  it('should build a versioned path when a version is provided', () => {
    const path = buildApplicationManifestStoragePath({
      applicationRegistrationId,
      sourceType: ApplicationRegistrationSourceType.NPM,
      version: '1.2.3',
      serializedManifest: '{}',
    });

    expect(path).toBe(
      `application-manifest/${applicationRegistrationId}/1.2.3.json`,
    );
  });

  it('should build a dev path for LOCAL source type even when a version is provided', () => {
    const path = buildApplicationManifestStoragePath({
      applicationRegistrationId,
      sourceType: ApplicationRegistrationSourceType.LOCAL,
      version: '1.2.3',
      serializedManifest: '{}',
    });

    expect(path).toBe(
      `application-manifest/${applicationRegistrationId}/dev.json`,
    );
  });

  it('should fall back to a content hash when version is missing', () => {
    const path = buildApplicationManifestStoragePath({
      applicationRegistrationId,
      sourceType: ApplicationRegistrationSourceType.NPM,
      version: null,
      serializedManifest: '{"application":{}}',
    });

    expect(path).toMatch(
      new RegExp(
        `^application-manifest/${applicationRegistrationId}/[0-9a-f]{16}\\.json$`,
      ),
    );
  });

  it('should produce the same hashed path for the same manifest content', () => {
    const buildPath = () =>
      buildApplicationManifestStoragePath({
        applicationRegistrationId,
        sourceType: ApplicationRegistrationSourceType.TARBALL,
        serializedManifest: '{"application":{"displayName":"App"}}',
      });

    expect(buildPath()).toBe(buildPath());
  });

  it('should fall back to a content hash when version contains unsafe characters', () => {
    const path = buildApplicationManifestStoragePath({
      applicationRegistrationId,
      sourceType: ApplicationRegistrationSourceType.NPM,
      version: '../../../etc/passwd',
      serializedManifest: '{}',
    });

    expect(path).toMatch(
      new RegExp(
        `^application-manifest/${applicationRegistrationId}/[0-9a-f]{16}\\.json$`,
      ),
    );
  });
});
