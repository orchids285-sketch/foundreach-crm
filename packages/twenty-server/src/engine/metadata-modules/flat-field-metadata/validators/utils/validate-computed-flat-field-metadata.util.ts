import { msg } from '@lingui/core/macro';
import {
  COMPUTABLE_COMPOSITE_FIELD_METADATA_TYPES,
  FieldMetadataType,
} from 'twenty-shared/types';
import {
  getExpectedFormulaValueTypeForComputedFieldType,
  inferFormulaReturnTypeOrThrow,
  isComputableFieldMetadataType,
  isDefined,
  mapFieldMetadataTypeToFormulaValueType,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';

import { getCompositeTypeOrThrow } from 'src/engine/metadata-modules/field-metadata/utils/get-composite-type-or-throw.util';
import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';
import {
  buildFormulaFieldReferencesContext,
  type FormulaReferenceSourceFieldMetadata,
} from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { deriveComputedCurrencyCodeAsExpressionOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-computed-currency-code-as-expression.util';
import { type UniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-entity-maps.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

export const validateComputedFlatFieldMetadata = ({
  flatFieldMetadataToValidate,
  flatFieldMetadataMaps,
}: {
  flatFieldMetadataToValidate: UniversalFlatFieldMetadata;
  flatFieldMetadataMaps: UniversalFlatEntityMaps<UniversalFlatFieldMetadata>;
}): FlatFieldMetadataValidationError[] => {
  const { computation } = flatFieldMetadataToValidate;

  if (!isDefined(computation)) {
    return [];
  }

  const fieldType = flatFieldMetadataToValidate.type;
  const errors: FlatFieldMetadataValidationError[] = [];

  if (isDefined(flatFieldMetadataToValidate.defaultValue)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Computed fields cannot have a default value',
      value: flatFieldMetadataToValidate.defaultValue,
      userFriendlyMessage: msg`Computed fields cannot have a default value`,
    });
  }

  // A unique constraint here would reject writes to the source fields instead
  if (flatFieldMetadataToValidate.isUnique === true) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Computed fields cannot be unique',
      value: flatFieldMetadataToValidate.isUnique,
      userFriendlyMessage: msg`Computed fields cannot be unique`,
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
      computation: universalFlatFieldMetadata.computation,
    }));

  if (computation.mode === 'EXPRESSION') {
    errors.push(
      ...validateExpressionComputation({
        fieldType,
        expression: computation.expression,
        siblingFlatFieldMetadatas,
      }),
    );

    return errors;
  }

  errors.push(
    ...validateExpressionBySubFieldComputation({
      fieldType,
      expressionBySubField: computation.expressionBySubField,
      siblingFlatFieldMetadatas,
    }),
  );

  return errors;
};

const validateExpressionComputation = ({
  fieldType,
  expression,
  siblingFlatFieldMetadatas,
}: {
  fieldType: FieldMetadataType;
  expression: string;
  siblingFlatFieldMetadatas: FormulaReferenceSourceFieldMetadata[];
}): FlatFieldMetadataValidationError[] => {
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

  try {
    const formulaAstNode = parseFormulaExpressionOrThrow(expression);
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
        value: expression,
        userFriendlyMessage: msg`Expression returns ${inferredReturnType} but the field expects ${expectedReturnType}`,
      });
    }
  } catch (error) {
    const expressionErrorMessage =
      error instanceof Error ? error.message : 'Invalid computed expression';

    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Invalid computed expression: ${expressionErrorMessage}`,
      value: expression,
      userFriendlyMessage: msg`Invalid computed expression: ${expressionErrorMessage}`,
    });
  }

  if (fieldType === FieldMetadataType.CURRENCY) {
    try {
      deriveComputedCurrencyCodeAsExpressionOrThrow({
        computedExpression: expression,
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
        value: expression,
        userFriendlyMessage: msg`${currencyCodeErrorMessage}`,
      });
    }
  }

  return errors;
};

const validateExpressionBySubFieldComputation = ({
  fieldType,
  expressionBySubField,
  siblingFlatFieldMetadatas,
}: {
  fieldType: FieldMetadataType;
  expressionBySubField: Record<string, string>;
  siblingFlatFieldMetadatas: FormulaReferenceSourceFieldMetadata[];
}): FlatFieldMetadataValidationError[] => {
  if (
    !(
      COMPUTABLE_COMPOSITE_FIELD_METADATA_TYPES as readonly FieldMetadataType[]
    ).includes(fieldType)
  ) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Field type ${fieldType} does not support per sub field computed expressions`,
        value: fieldType,
        userFriendlyMessage: msg`Field type ${fieldType} does not support per sub field computed expressions`,
      },
    ];
  }

  const subFieldEntries = Object.entries(expressionBySubField);

  if (subFieldEntries.length === 0) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: 'At least one sub field expression is required',
        value: expressionBySubField,
        userFriendlyMessage: msg`At least one sub field expression is required`,
      },
    ];
  }

  const compositeType = getCompositeTypeOrThrow(fieldType);
  const errors: FlatFieldMetadataValidationError[] = [];
  const { fieldReferenceTypes } = buildFormulaFieldReferencesContext({
    siblingFlatFieldMetadatas,
  });

  for (const [subFieldName, expression] of subFieldEntries) {
    const compositeProperty = compositeType.properties.find(
      (property) => property.name === subFieldName,
    );

    if (!isDefined(compositeProperty)) {
      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Sub field ${subFieldName} does not exist on ${fieldType}`,
        value: subFieldName,
        userFriendlyMessage: msg`Sub field ${subFieldName} does not exist on ${fieldType}`,
      });
      continue;
    }

    const expectedReturnType = mapFieldMetadataTypeToFormulaValueType(
      compositeProperty.type,
    );

    if (!isDefined(expectedReturnType)) {
      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Sub field ${subFieldName} of ${fieldType} is not a scalar and cannot be computed`,
        value: subFieldName,
        userFriendlyMessage: msg`Sub field ${subFieldName} of ${fieldType} is not a scalar and cannot be computed`,
      });
      continue;
    }

    try {
      const formulaAstNode = parseFormulaExpressionOrThrow(expression);

      const inferredReturnType = inferFormulaReturnTypeOrThrow({
        node: formulaAstNode,
        fieldReferenceTypes,
      });

      if (
        inferredReturnType !== 'NULL' &&
        inferredReturnType !== expectedReturnType
      ) {
        errors.push({
          code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
          message: `Sub field ${subFieldName} expression returns ${inferredReturnType} but expects ${expectedReturnType}`,
          value: expression,
          userFriendlyMessage: msg`Sub field ${subFieldName} expression returns ${inferredReturnType} but expects ${expectedReturnType}`,
        });
      }
    } catch (error) {
      const expressionErrorMessage =
        error instanceof Error ? error.message : 'Invalid computed expression';

      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Invalid computed expression for sub field ${subFieldName}: ${expressionErrorMessage}`,
        value: expression,
        userFriendlyMessage: msg`Invalid computed expression for sub field ${subFieldName}: ${expressionErrorMessage}`,
      });
    }
  }

  return errors;
};
