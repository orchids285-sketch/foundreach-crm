import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import {
  extractFormulaFieldReferences,
  isDefined,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';

import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';
import { type UniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-entity-maps.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

type ValidateFlatFieldMetadataIsNotReferencedByComputedFieldArgs = {
  flatFieldMetadataToMutate: Pick<
    UniversalFlatFieldMetadata,
    'name' | 'universalIdentifier' | 'objectMetadataUniversalIdentifier'
  >;
  flatFieldMetadataMaps: UniversalFlatEntityMaps<UniversalFlatFieldMetadata>;
  shouldCheckRollupReferences: boolean;
};

export const validateFlatFieldMetadataIsNotReferencedByComputedField = ({
  flatFieldMetadataToMutate,
  flatFieldMetadataMaps,
  shouldCheckRollupReferences,
}: ValidateFlatFieldMetadataIsNotReferencedByComputedFieldArgs): FlatFieldMetadataValidationError[] => {
  const dependentComputedFieldNames = Object.values(
    flatFieldMetadataMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter((candidateFlatFieldMetadata) =>
      isComputedFlatFieldMetadataReferencingField({
        candidateFlatFieldMetadata,
        flatFieldMetadataToMutate,
        shouldCheckRollupReferences,
      }),
    )
    .map((computedFlatFieldMetadata) => computedFlatFieldMetadata.name);

  if (dependentComputedFieldNames.length === 0) {
    return [];
  }

  const joinedDependentComputedFieldNames =
    dependentComputedFieldNames.join(', ');

  return [
    {
      code: FieldMetadataExceptionCode.FIELD_MUTATION_NOT_ALLOWED,
      message: `Field is referenced by computed fields: ${joinedDependentComputedFieldNames}`,
      value: flatFieldMetadataToMutate.name,
      userFriendlyMessage: msg`This field is used by computed fields: ${joinedDependentComputedFieldNames}. Update or delete them first`,
    },
  ];
};

const isComputedFlatFieldMetadataReferencingField = ({
  candidateFlatFieldMetadata,
  flatFieldMetadataToMutate,
  shouldCheckRollupReferences,
}: Pick<
  ValidateFlatFieldMetadataIsNotReferencedByComputedFieldArgs,
  'flatFieldMetadataToMutate' | 'shouldCheckRollupReferences'
> & {
  candidateFlatFieldMetadata: UniversalFlatFieldMetadata;
}): boolean => {
  if (
    candidateFlatFieldMetadata.universalIdentifier ===
    flatFieldMetadataToMutate.universalIdentifier
  ) {
    return false;
  }

  const universalSettings = candidateFlatFieldMetadata.universalSettings;

  if (!isDefined(universalSettings)) {
    return false;
  }

  if (
    candidateFlatFieldMetadata.type === FieldMetadataType.FORMULA &&
    'expression' in universalSettings &&
    candidateFlatFieldMetadata.objectMetadataUniversalIdentifier ===
      flatFieldMetadataToMutate.objectMetadataUniversalIdentifier
  ) {
    return isFormulaExpressionReferencingFieldName({
      expression: universalSettings.expression,
      fieldName: flatFieldMetadataToMutate.name,
    });
  }

  if (
    shouldCheckRollupReferences &&
    candidateFlatFieldMetadata.type === FieldMetadataType.ROLLUP &&
    'aggregateOperation' in universalSettings
  ) {
    return (
      universalSettings.relationFieldMetadataUniversalIdentifier ===
        flatFieldMetadataToMutate.universalIdentifier ||
      universalSettings.targetFieldMetadataUniversalIdentifier ===
        flatFieldMetadataToMutate.universalIdentifier
    );
  }

  return false;
};

const isFormulaExpressionReferencingFieldName = ({
  expression,
  fieldName,
}: {
  expression: string;
  fieldName: string;
}): boolean => {
  try {
    return extractFormulaFieldReferences(
      parseFormulaExpressionOrThrow(expression),
    ).some((fieldReference) => fieldReference.fieldName === fieldName);
  } catch {
    // An unparsable stored formula must not make its source fields immutable
    return false;
  }
};
