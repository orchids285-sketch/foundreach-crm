import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import {
  getExpectedFormulaValueTypeForComputedFieldType,
  inferFormulaReturnTypeOrThrow,
  isComputableFieldMetadataType,
  isDefined,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';

import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';
import { buildFormulaFieldReferencesContext } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { deriveComputedCurrencyCodeAsExpressionOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-computed-currency-code-as-expression.util';
import { getFlatFieldMetadataComputedExpression } from 'src/engine/metadata-modules/flat-field-metadata/utils/get-flat-field-metadata-computed-expression.util';
import { type UniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-entity-maps.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

export const validateComputedFlatFieldMetadata = ({
  flatFieldMetadataToValidate,
  flatFieldMetadataMaps,
}: {
  flatFieldMetadataToValidate: UniversalFlatFieldMetadata;
  flatFieldMetadataMaps: UniversalFlatEntityMaps<UniversalFlatFieldMetadata>;
}): FlatFieldMetadataValidationError[] => {
  const computedExpression = getFlatFieldMetadataComputedExpression(
    flatFieldMetadataToValidate.universalSettings,
  );

  if (computedExpression === null) {
    return [];
  }

  const fieldType = flatFieldMetadataToValidate.type;

  if (!isComputableFieldMetadataType(fieldType)) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Field type ${fieldType} does not support computed expressions`,
        value: fieldType,
        userFriendlyMessage: msg`Field type ${fieldType} does not support computed expressions`,
      },
    ];
  }

  const errors: FlatFieldMetadataValidationError[] = [];

  if (isDefined(flatFieldMetadataToValidate.defaultValue)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Computed fields cannot have a default value',
      value: flatFieldMetadataToValidate.defaultValue,
      userFriendlyMessage: msg`Computed fields cannot have a default value`,
    });
  }

  const siblingFlatFieldMetadatas = Object.values(
    flatFieldMetadataMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter(
      (universalFlatFieldMetadata) =>
        universalFlatFieldMetadata.objectMetadataUniversalIdentifier ===
          flatFieldMetadataToValidate.objectMetadataUniversalIdentifier &&
        universalFlatFieldMetadata.universalIdentifier !==
          flatFieldMetadataToValidate.universalIdentifier,
    )
    .map((universalFlatFieldMetadata) => ({
      name: universalFlatFieldMetadata.name,
      type: universalFlatFieldMetadata.type,
      settings: universalFlatFieldMetadata.universalSettings,
    }));

  try {
    const formulaAstNode = parseFormulaExpressionOrThrow(computedExpression);
    const { fieldReferenceTypes } = buildFormulaFieldReferencesContext({
      siblingFlatFieldMetadatas,
    });

    const inferredReturnType = inferFormulaReturnTypeOrThrow({
      node: formulaAstNode,
      fieldReferenceTypes,
    });

    const expectedReturnType =
      getExpectedFormulaValueTypeForComputedFieldType(fieldType);

    if (
      inferredReturnType !== 'NULL' &&
      inferredReturnType !== expectedReturnType
    ) {
      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Expression returns ${inferredReturnType} but the field expects ${expectedReturnType}`,
        value: computedExpression,
        userFriendlyMessage: msg`Expression returns ${inferredReturnType} but the field expects ${expectedReturnType}`,
      });
    }
  } catch (error) {
    const expressionErrorMessage =
      error instanceof Error ? error.message : 'Invalid computed expression';

    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Invalid computed expression: ${expressionErrorMessage}`,
      value: computedExpression,
      userFriendlyMessage: msg`Invalid computed expression: ${expressionErrorMessage}`,
    });
  }

  if (fieldType === FieldMetadataType.CURRENCY) {
    try {
      deriveComputedCurrencyCodeAsExpressionOrThrow({
        computedExpression,
        siblingFlatFieldMetadatas,
      });
    } catch (error) {
      const currencyCodeErrorMessage =
        error instanceof Error
          ? error.message
          : 'Invalid computed currency expression';

      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: currencyCodeErrorMessage,
        value: computedExpression,
        userFriendlyMessage: msg`${currencyCodeErrorMessage}`,
      });
    }
  }

  return errors;
};
