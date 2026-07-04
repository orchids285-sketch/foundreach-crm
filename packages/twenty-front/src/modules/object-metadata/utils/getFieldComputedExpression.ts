import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

export const getFieldComputedExpression = (
  settings: FieldMetadataItem['settings'] | FieldMetadata['settings'],
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
