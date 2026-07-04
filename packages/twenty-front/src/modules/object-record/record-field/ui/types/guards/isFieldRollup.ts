import { FieldMetadataType } from '~/generated-metadata/graphql';

import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import {
  type FieldMetadata,
  type FieldRollupMetadata,
} from '@/object-record/record-field/ui/types/FieldMetadata';

export const isFieldRollup = (
  field: Pick<FieldDefinition<FieldMetadata>, 'type'>,
): field is FieldDefinition<FieldRollupMetadata> =>
  field.type === FieldMetadataType.ROLLUP;
