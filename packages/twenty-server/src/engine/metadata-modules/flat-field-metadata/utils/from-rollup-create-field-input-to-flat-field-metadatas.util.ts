import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type CreateFieldInput } from 'src/engine/metadata-modules/field-metadata/dtos/create-field.input';
import { FieldMetadataExceptionCode } from 'src/engine/metadata-modules/field-metadata/field-metadata.exception';
import { isFieldMetadataSettingsOfType } from 'src/engine/metadata-modules/field-metadata/utils/is-field-metadata-settings-of-type.util';
import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FieldInputTranspilationResult } from 'src/engine/metadata-modules/flat-field-metadata/types/field-input-transpilation-result.type';
import { type getDefaultFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/get-default-flat-field-metadata-from-create-field-input.util';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';
import { type UniversalFlatIndexMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-index-metadata.type';
import { convertChartFilterToUniversalChartFilter } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/utils/convert-chart-filter-to-universal-chart-filter.util';

export const fromRollupCreateFieldInputToFlatFieldMetadatas = ({
  createFieldInput,
  commonFlatFieldMetadata,
  existingFlatFieldMetadataMaps,
}: {
  createFieldInput: Omit<CreateFieldInput, 'workspaceId'> & {
    type: FieldMetadataType.ROLLUP;
  };
  commonFlatFieldMetadata: ReturnType<typeof getDefaultFlatFieldMetadata>;
  existingFlatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
}): FieldInputTranspilationResult<{
  flatFieldMetadatas: UniversalFlatFieldMetadata[];
  indexMetadatas: UniversalFlatIndexMetadata[];
}> => {
  const settings = createFieldInput.settings ?? null;

  if (!isFieldMetadataSettingsOfType(settings, FieldMetadataType.ROLLUP)) {
    return {
      status: 'fail',
      errors: [
        {
          code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
          message: 'Rollup field requires settings',
          userFriendlyMessage: msg`Rollup field requires a relation and an aggregate operation`,
        },
      ],
    };
  }

  if (!isNonEmptyString(settings.relationFieldMetadataId)) {
    return {
      status: 'fail',
      errors: [
        {
          code: FieldMetadataExceptionCode.INVALID_FIELD_INPUT,
          message: 'Rollup relation field metadata id is required',
          userFriendlyMessage: msg`Rollup field requires a relation`,
        },
      ],
    };
  }

  const relationFlatFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityId: settings.relationFieldMetadataId,
    flatEntityMaps: existingFlatFieldMetadataMaps,
  });

  if (!isDefined(relationFlatFieldMetadata)) {
    return {
      status: 'fail',
      errors: [
        {
          code: FieldMetadataExceptionCode.FIELD_METADATA_NOT_FOUND,
          message: `Rollup relation field metadata not found for id ${settings.relationFieldMetadataId}`,
          userFriendlyMessage: msg`Rollup relation field not found`,
        },
      ],
    };
  }

  const targetFlatFieldMetadata = isNonEmptyString(
    settings.targetFieldMetadataId,
  )
    ? findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: settings.targetFieldMetadataId,
        flatEntityMaps: existingFlatFieldMetadataMaps,
      })
    : null;

  if (
    isNonEmptyString(settings.targetFieldMetadataId) &&
    !isDefined(targetFlatFieldMetadata)
  ) {
    return {
      status: 'fail',
      errors: [
        {
          code: FieldMetadataExceptionCode.FIELD_METADATA_NOT_FOUND,
          message: `Rollup target field metadata not found for id ${settings.targetFieldMetadataId}`,
          userFriendlyMessage: msg`Rollup target field not found`,
        },
      ],
    };
  }

  return {
    status: 'success',
    result: {
      flatFieldMetadatas: [
        {
          ...commonFlatFieldMetadata,
          type: createFieldInput.type,
          universalSettings: {
            aggregateOperation: settings.aggregateOperation,
            relationFieldMetadataUniversalIdentifier:
              relationFlatFieldMetadata.universalIdentifier,
            targetFieldMetadataUniversalIdentifier:
              targetFlatFieldMetadata?.universalIdentifier ?? null,
            filter: convertChartFilterToUniversalChartFilter({
              filter: settings.filter,
              resolveFieldMetadataUniversalIdentifier: (fieldMetadataId) =>
                findFlatEntityByIdInFlatEntityMaps({
                  flatEntityId: fieldMetadataId,
                  flatEntityMaps: existingFlatFieldMetadataMaps,
                })?.universalIdentifier ?? null,
            }),
          },
        },
      ],
      indexMetadatas: [],
    },
  };
};
