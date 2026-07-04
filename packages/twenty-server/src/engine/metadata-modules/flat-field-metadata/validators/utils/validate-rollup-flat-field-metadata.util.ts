import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  type FieldMetadataType,
  ROLLUP_AGGREGATE_OPERATIONS,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { type FlatFieldMetadataTypeValidationArgs } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-type-validator.type';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';

// TODO(rollup): validate relation/target against metadata maps
export const validateRollupFlatFieldMetadata = ({
  flatEntityToValidate,
}: FlatFieldMetadataTypeValidationArgs<FieldMetadataType.ROLLUP>): FlatFieldMetadataValidationError[] => {
  const settings = flatEntityToValidate.universalSettings;

  if (!isDefined(settings)) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: 'Rollup field requires settings',
        value: settings,
        userFriendlyMessage: msg`Rollup field requires a relation and an aggregate operation`,
      },
    ];
  }

  const errors: FlatFieldMetadataValidationError[] = [];

  if (!ROLLUP_AGGREGATE_OPERATIONS.includes(settings.aggregateOperation)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Invalid rollup aggregate operation "${settings.aggregateOperation}"`,
      value: settings.aggregateOperation,
      userFriendlyMessage: msg`Invalid rollup aggregate operation`,
    });
  }

  if (!isNonEmptyString(settings.relationFieldMetadataId)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Rollup relation field metadata id is required',
      value: settings.relationFieldMetadataId,
      userFriendlyMessage: msg`Rollup field requires a relation`,
    });
  }

  if (settings.aggregateOperation === 'COUNT') {
    if (settings.targetFieldMetadataId !== null) {
      errors.push({
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: 'Rollup COUNT operation does not take a target field',
        value: settings.targetFieldMetadataId,
        userFriendlyMessage: msg`Count rollup does not take a target field`,
      });
    }
  } else if (!isNonEmptyString(settings.targetFieldMetadataId)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Rollup ${settings.aggregateOperation} operation requires a target field`,
      value: settings.targetFieldMetadataId,
      userFriendlyMessage: msg`This rollup operation requires a target field`,
    });
  }

  return errors;
};
