import {
  type FieldMetadataSettings,
  type FieldMetadataUniversalSettings,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

// Rollup settings reference other field metadata by id; universal settings
// must carry universal identifiers instead, resolved by the create path
export const fromFieldMetadataInputSettingsToUniversalSettings = (
  settings: FieldMetadataSettings | undefined,
): FieldMetadataUniversalSettings | null => {
  if (!isDefined(settings)) {
    return null;
  }

  if ('aggregateOperation' in settings) {
    return {
      aggregateOperation: settings.aggregateOperation,
      relationFieldMetadataUniversalIdentifier: null,
      targetFieldMetadataUniversalIdentifier: null,
    };
  }

  return settings;
};
