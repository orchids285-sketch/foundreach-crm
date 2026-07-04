import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  FieldMetadataType,
  RelationType,
  ROLLUP_AGGREGATE_OPERATIONS,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadataTypeValidationArgs } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-type-validator.type';
import { type FlatFieldMetadataValidationError } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-validation-error.type';
import { isMorphOrRelationUniversalFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

export const validateRollupFlatFieldMetadata = ({
  flatEntityToValidate,
  optimisticFlatEntityMapsAndRelatedFlatEntityMaps: { flatFieldMetadataMaps },
  remainingFlatEntityMapsToValidate,
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

  const relationFieldMetadataUniversalIdentifier =
    settings.relationFieldMetadataUniversalIdentifier;

  if (!isNonEmptyString(relationFieldMetadataUniversalIdentifier)) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: 'Rollup relation field universal identifier is required',
      value: relationFieldMetadataUniversalIdentifier,
      userFriendlyMessage: msg`Rollup field requires a relation`,
    });

    return errors;
  }

  const relationFlatFieldMetadata =
    findFlatEntityByUniversalIdentifier({
      universalIdentifier: relationFieldMetadataUniversalIdentifier,
      flatEntityMaps: remainingFlatEntityMapsToValidate,
    }) ??
    findFlatEntityByUniversalIdentifier({
      universalIdentifier: relationFieldMetadataUniversalIdentifier,
      flatEntityMaps: flatFieldMetadataMaps,
    });

  if (!isDefined(relationFlatFieldMetadata)) {
    errors.push({
      code: FieldMetadataExceptionCode.FIELD_METADATA_NOT_FOUND,
      message: `Rollup relation field not found: ${relationFieldMetadataUniversalIdentifier}`,
      value: relationFieldMetadataUniversalIdentifier,
      userFriendlyMessage: msg`Rollup relation field not found`,
    });

    return errors;
  }

  if (
    relationFlatFieldMetadata.objectMetadataUniversalIdentifier !==
    flatEntityToValidate.objectMetadataUniversalIdentifier
  ) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Rollup relation field ${relationFieldMetadataUniversalIdentifier} is not on the rollup field object`,
      value: relationFieldMetadataUniversalIdentifier,
      userFriendlyMessage: msg`Rollup relation must be on the same object as the rollup field`,
    });

    return errors;
  }

  if (
    !isMorphOrRelationUniversalFlatFieldMetadata(relationFlatFieldMetadata) ||
    relationFlatFieldMetadata.type === FieldMetadataType.MORPH_RELATION ||
    relationFlatFieldMetadata.universalSettings.relationType !==
      RelationType.ONE_TO_MANY
  ) {
    errors.push({
      code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
      message: `Rollup relation field ${relationFieldMetadataUniversalIdentifier} is not a ONE_TO_MANY relation`,
      value: relationFieldMetadataUniversalIdentifier,
      userFriendlyMessage: msg`Rollup relation must be a one-to-many relation`,
    });

    return errors;
  }

  errors.push(
    ...validateRollupTargetField({
      flatEntityToValidate,
      relationFlatFieldMetadata,
      flatFieldMetadataMaps,
      remainingFlatEntityMapsToValidate,
    }),
    ...validateRollupFilterFields({
      flatEntityToValidate,
      relationFlatFieldMetadata,
      flatFieldMetadataMaps,
      remainingFlatEntityMapsToValidate,
    }),
  );

  return errors;
};

const validateRollupFilterFields = ({
  flatEntityToValidate,
  relationFlatFieldMetadata,
  flatFieldMetadataMaps,
  remainingFlatEntityMapsToValidate,
}: Pick<
  FlatFieldMetadataTypeValidationArgs<FieldMetadataType.ROLLUP>,
  'flatEntityToValidate' | 'remainingFlatEntityMapsToValidate'
> & {
  relationFlatFieldMetadata: Pick<
    UniversalFlatFieldMetadata,
    'relationTargetObjectMetadataUniversalIdentifier'
  >;
  flatFieldMetadataMaps: FlatFieldMetadataTypeValidationArgs<FieldMetadataType.ROLLUP>['optimisticFlatEntityMapsAndRelatedFlatEntityMaps']['flatFieldMetadataMaps'];
}): FlatFieldMetadataValidationError[] => {
  const recordFilters =
    flatEntityToValidate.universalSettings.filter?.recordFilters ?? [];

  return recordFilters.flatMap(
    (recordFilter): FlatFieldMetadataValidationError[] => {
      const filterFieldMetadataUniversalIdentifier =
        recordFilter.fieldMetadataUniversalIdentifier;

      if (!isNonEmptyString(filterFieldMetadataUniversalIdentifier)) {
        return [
          {
            code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
            message: 'Rollup filter entry is missing its field',
            value: filterFieldMetadataUniversalIdentifier,
            userFriendlyMessage: msg`Rollup filter entry is missing its field`,
          },
        ];
      }

      const filterFlatFieldMetadata =
        findFlatEntityByUniversalIdentifier({
          universalIdentifier: filterFieldMetadataUniversalIdentifier,
          flatEntityMaps: remainingFlatEntityMapsToValidate,
        }) ??
        findFlatEntityByUniversalIdentifier({
          universalIdentifier: filterFieldMetadataUniversalIdentifier,
          flatEntityMaps: flatFieldMetadataMaps,
        });

      if (!isDefined(filterFlatFieldMetadata)) {
        return [
          {
            code: FieldMetadataExceptionCode.FIELD_METADATA_NOT_FOUND,
            message: `Rollup filter field not found: ${filterFieldMetadataUniversalIdentifier}`,
            value: filterFieldMetadataUniversalIdentifier,
            userFriendlyMessage: msg`Rollup filter field not found`,
          },
        ];
      }

      if (
        filterFlatFieldMetadata.objectMetadataUniversalIdentifier !==
        relationFlatFieldMetadata.relationTargetObjectMetadataUniversalIdentifier
      ) {
        return [
          {
            code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
            message: `Rollup filter field ${filterFieldMetadataUniversalIdentifier} is not on the relation target object`,
            value: filterFieldMetadataUniversalIdentifier,
            userFriendlyMessage: msg`Rollup filter fields must be on the related object`,
          },
        ];
      }

      return [];
    },
  );
};

const validateRollupTargetField = ({
  flatEntityToValidate,
  relationFlatFieldMetadata,
  flatFieldMetadataMaps,
  remainingFlatEntityMapsToValidate,
}: Pick<
  FlatFieldMetadataTypeValidationArgs<FieldMetadataType.ROLLUP>,
  'flatEntityToValidate' | 'remainingFlatEntityMapsToValidate'
> & {
  relationFlatFieldMetadata: Pick<
    UniversalFlatFieldMetadata,
    'relationTargetObjectMetadataUniversalIdentifier'
  >;
  flatFieldMetadataMaps: FlatFieldMetadataTypeValidationArgs<FieldMetadataType.ROLLUP>['optimisticFlatEntityMapsAndRelatedFlatEntityMaps']['flatFieldMetadataMaps'];
}): FlatFieldMetadataValidationError[] => {
  const settings = flatEntityToValidate.universalSettings;
  const targetFieldMetadataUniversalIdentifier =
    settings.targetFieldMetadataUniversalIdentifier;

  if (settings.aggregateOperation === 'COUNT') {
    if (isDefined(targetFieldMetadataUniversalIdentifier)) {
      return [
        {
          code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
          message: 'Rollup COUNT operation does not take a target field',
          value: targetFieldMetadataUniversalIdentifier,
          userFriendlyMessage: msg`Count rollup does not take a target field`,
        },
      ];
    }

    return [];
  }

  if (!isNonEmptyString(targetFieldMetadataUniversalIdentifier)) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Rollup ${settings.aggregateOperation} operation requires a target field`,
        value: targetFieldMetadataUniversalIdentifier,
        userFriendlyMessage: msg`This rollup operation requires a target field`,
      },
    ];
  }

  const targetFlatFieldMetadata =
    findFlatEntityByUniversalIdentifier({
      universalIdentifier: targetFieldMetadataUniversalIdentifier,
      flatEntityMaps: remainingFlatEntityMapsToValidate,
    }) ??
    findFlatEntityByUniversalIdentifier({
      universalIdentifier: targetFieldMetadataUniversalIdentifier,
      flatEntityMaps: flatFieldMetadataMaps,
    });

  if (!isDefined(targetFlatFieldMetadata)) {
    return [
      {
        code: FieldMetadataExceptionCode.FIELD_METADATA_NOT_FOUND,
        message: `Rollup target field not found: ${targetFieldMetadataUniversalIdentifier}`,
        value: targetFieldMetadataUniversalIdentifier,
        userFriendlyMessage: msg`Rollup target field not found`,
      },
    ];
  }

  if (targetFlatFieldMetadata.type !== FieldMetadataType.NUMBER) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Rollup target field ${targetFieldMetadataUniversalIdentifier} is not a NUMBER field`,
        value: targetFieldMetadataUniversalIdentifier,
        userFriendlyMessage: msg`Rollup target must be a number field`,
      },
    ];
  }

  if (
    targetFlatFieldMetadata.objectMetadataUniversalIdentifier !==
    relationFlatFieldMetadata.relationTargetObjectMetadataUniversalIdentifier
  ) {
    return [
      {
        code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
        message: `Rollup target field ${targetFieldMetadataUniversalIdentifier} is not on the relation target object`,
        value: targetFieldMetadataUniversalIdentifier,
        userFriendlyMessage: msg`Rollup target must be on the related object`,
      },
    ];
  }

  return [];
};
