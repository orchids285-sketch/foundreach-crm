import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getFieldComputedExpression } from '@/object-metadata/utils/getFieldComputedExpression';
import { isFieldMetadataReadOnlyByPermissions } from '@/object-record/read-only/utils/internal/isFieldMetadataReadOnlyByPermissions';
import { isOneToManyRelationFieldReadOnlyDueToTargetUpdatePermission } from '@/object-record/read-only/utils/isOneToManyRelationFieldReadOnlyDueToTargetUpdatePermission';
import { isFieldRollup } from '@/object-record/record-field/ui/types/guards/isFieldRollup';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type ObjectPermission } from '~/generated-metadata/graphql';
import { type ObjectPermissions } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type ObjectPermissionsByObjectMetadataId = Record<
  string,
  ObjectPermissions & { objectMetadataId: string }
>;

type IsRecordFieldReadOnlyParams = {
  isRecordReadOnly: boolean;
  isSystemObject?: boolean;
  isFieldFromStandardApplication?: boolean;
  fieldMetadataItem: Pick<FieldMetadataItem, 'id' | 'isUIEditable'>;
  objectPermissions: ObjectPermission;
  fieldDefinition?: FieldDefinition<FieldMetadata>;
  objectPermissionsByObjectMetadataId?: ObjectPermissionsByObjectMetadataId;
};

export const isRecordFieldReadOnly = ({
  objectPermissions,
  isRecordReadOnly,
  isSystemObject,
  isFieldFromStandardApplication,
  fieldMetadataItem,
  fieldDefinition,
  objectPermissionsByObjectMetadataId,
}: IsRecordFieldReadOnlyParams) => {
  const fieldReadOnlyByPermissions = isFieldMetadataReadOnlyByPermissions({
    objectPermissions,
    fieldMetadataId: fieldMetadataItem.id,
  });

  const oneToManyTargetReadOnly =
    isDefined(fieldDefinition) &&
    isDefined(objectPermissionsByObjectMetadataId) &&
    isOneToManyRelationFieldReadOnlyDueToTargetUpdatePermission({
      fieldDefinition,
      objectPermissionsByObjectMetadataId,
    });

  const isComputedField =
    isDefined(fieldDefinition) &&
    isDefined(getFieldComputedExpression(fieldDefinition.metadata.settings));

  const isRollupField =
    isDefined(fieldDefinition) && isFieldRollup(fieldDefinition);

  // Keep system-object standard fields read-only. If the application origin
  // cannot be resolved yet, fail closed until metadata finishes loading.
  const isReadOnlyStandardFieldOnSystemObject =
    isSystemObject === true && isFieldFromStandardApplication !== false;

  return (
    isRecordReadOnly ||
    isReadOnlyStandardFieldOnSystemObject ||
    isComputedField ||
    isRollupField ||
    !(fieldMetadataItem.isUIEditable ?? true) ||
    fieldReadOnlyByPermissions ||
    oneToManyTargetReadOnly
  );
};
