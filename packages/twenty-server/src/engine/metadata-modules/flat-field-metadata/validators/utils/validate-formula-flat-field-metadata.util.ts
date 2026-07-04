import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type FieldMetadataType } from 'twenty-shared/types';
import { FORMULA_OUTPUT_TYPES } from 'twenty-shared/types';
import {
  inferFormulaReturnTypeOrThrow,
  isDefined,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';

import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { buildFormulaFieldReferencesContext } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { type FlatFieldMetadataTypeValidationArgs } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-type-validator.type';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';

export const validateFormulaFlatFieldMetadata = ({
  flatEntityToValidate,
  optimisticFlatEntityMapsAndRelatedFlatEntityMaps: { flatFieldMetadataMaps },
}: FlatFieldMetadataTypeValidationArgs<FieldMetadataType.FORMULA>): FlatFieldMetadataValidationError[] => {
  const errors: FlatFieldMetadataValidationError[] = [];
  const settings = flatEntityToValidate.universalSettings;

  if (!isDefined(settings)) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: 'Formula field requires settings',
        value: settings,
        userFriendlyMessage: msg`Formula field requires an expression and an output type`,
      },
    ];
  }

  if (!FORMULA_OUTPUT_TYPES.includes(settings.outputType)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Invalid formula output type "${settings.outputType}"`,
      value: settings.outputType,
      userFriendlyMessage: msg`Invalid formula output type`,
    });
  }

  if (!isNonEmptyString(settings.expression)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Formula expression is required',
      value: settings.expression,
      userFriendlyMessage: msg`Formula expression is required`,
    });

    return errors;
  }

  const siblingUniversalFlatFieldMetadatas = Object.values(
    flatFieldMetadataMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .filter(
      (universalFlatFieldMetadata) =>
        universalFlatFieldMetadata.objectMetadataUniversalIdentifier ===
          flatEntityToValidate.objectMetadataUniversalIdentifier &&
        universalFlatFieldMetadata.universalIdentifier !==
          flatEntityToValidate.universalIdentifier,
    );

  try {
    const formulaAstNode = parseFormulaExpressionOrThrow(settings.expression);
    const { fieldReferenceTypes } = buildFormulaFieldReferencesContext({
      siblingFlatFieldMetadatas: siblingUniversalFlatFieldMetadatas,
    });

    const inferredReturnType = inferFormulaReturnTypeOrThrow({
      node: formulaAstNode,
      fieldReferenceTypes,
    });

    if (
      inferredReturnType !== 'NULL' &&
      inferredReturnType !== settings.outputType
    ) {
      const outputType = settings.outputType;

      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Formula returns ${inferredReturnType} but the field output type is ${outputType}`,
        value: settings.expression,
        userFriendlyMessage: msg`Formula returns ${inferredReturnType} but the field output type is ${outputType}`,
      });
    }
  } catch (error) {
    const formulaErrorMessage =
      error instanceof Error ? error.message : 'Invalid formula expression';

    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Invalid formula expression: ${formulaErrorMessage}`,
      value: settings.expression,
      userFriendlyMessage: msg`Invalid formula expression: ${formulaErrorMessage}`,
    });
  }

  return errors;
};
