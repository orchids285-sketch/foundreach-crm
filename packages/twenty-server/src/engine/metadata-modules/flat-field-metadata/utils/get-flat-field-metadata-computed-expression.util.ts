import { isNonEmptyString } from '@sniptt/guards';
import {
  type AllFieldMetadataSettings,
  type FieldMetadataUniversalSettings,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const getFlatFieldMetadataComputedExpression = (
  settings:
    | AllFieldMetadataSettings
    | FieldMetadataUniversalSettings
    | null
    | undefined,
): string | null => {
  if (
    isDefined(settings) &&
    'computedExpression' in settings &&
    isNonEmptyString(settings.computedExpression)
  ) {
    return settings.computedExpression;
  }

  return null;
};
