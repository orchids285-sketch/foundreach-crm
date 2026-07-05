import { createHash } from 'crypto';

import { isNonEmptyString } from '@sniptt/guards';

import { ApplicationRegistrationSourceType } from 'src/engine/core-modules/application/application-registration/enums/application-registration-source-type.enum';

export const APPLICATION_MANIFEST_STORAGE_FOLDER = 'application-manifest';

export const APPLICATION_MANIFEST_DEV_FILE_NAME = 'dev';

const SAFE_VERSION_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;

const CONTENT_HASH_LENGTH = 16;

export const buildApplicationManifestStoragePath = ({
  applicationRegistrationId,
  sourceType,
  version,
  serializedManifest,
}: {
  applicationRegistrationId: string;
  sourceType: ApplicationRegistrationSourceType;
  version?: string | null;
  serializedManifest: string;
}): string => {
  if (sourceType === ApplicationRegistrationSourceType.LOCAL) {
    return `${APPLICATION_MANIFEST_STORAGE_FOLDER}/${applicationRegistrationId}/${APPLICATION_MANIFEST_DEV_FILE_NAME}.json`;
  }

  const fileName =
    isNonEmptyString(version) && SAFE_VERSION_FILE_NAME_PATTERN.test(version)
      ? version
      : createHash('sha256')
          .update(serializedManifest)
          .digest('hex')
          .slice(0, CONTENT_HASH_LENGTH);

  return `${APPLICATION_MANIFEST_STORAGE_FOLDER}/${applicationRegistrationId}/${fileName}.json`;
};
