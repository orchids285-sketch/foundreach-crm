import {
  type FieldMetadataSettings,
  FieldMetadataType,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { isUniversalFieldMetadataSettingsOftype } from 'src/engine/metadata-modules/field-metadata/utils/is-field-metadata-settings-of-type.util';
import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';
import { convertUniversalChartFilterToChartFilter } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/utils/convert-universal-chart-filter-to-chart-filter.util';
import { findFieldMetadataIdInCreateFieldContext } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/action-handlers/field/services/utils/find-field-metadata-id-in-create-field-context.util';
import {
  WorkspaceMigrationActionExecutionException,
  WorkspaceMigrationActionExecutionExceptionCode,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/exceptions/workspace-migration-action-execution.exception';

export const fromUniversalSettingsToFlatFieldMetadataSettings = ({
  universalSettings,
  allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
  flatFieldMetadataMaps,
}: {
  universalSettings: UniversalFlatFieldMetadata['universalSettings'];
  allFieldIdToBeCreatedInActionByUniversalIdentifierMap: Map<string, string>;
  flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
}): FieldMetadataSettings => {
  if (!isDefined(universalSettings)) {
    return null;
  }

  if ('aggregateOperation' in universalSettings) {
    return fromRollupUniversalSettingsToFlatFieldMetadataSettings({
      universalSettings,
      allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
      flatFieldMetadataMaps,
    });
  }

  if (
    isUniversalFieldMetadataSettingsOftype(
      universalSettings,
      FieldMetadataType.RELATION,
    ) ||
    isUniversalFieldMetadataSettingsOftype(
      universalSettings,
      FieldMetadataType.MORPH_RELATION,
    )
  ) {
    const { junctionTargetFieldUniversalIdentifier, ...rest } =
      universalSettings;
    const junctionTargetFieldId = isDefined(
      junctionTargetFieldUniversalIdentifier,
    )
      ? (findFieldMetadataIdInCreateFieldContext({
          universalIdentifier: junctionTargetFieldUniversalIdentifier,
          allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
          flatFieldMetadataMaps,
        }) ?? undefined)
      : undefined;

    if (
      isDefined(junctionTargetFieldUniversalIdentifier) &&
      !isDefined(junctionTargetFieldId)
    ) {
      throw new WorkspaceMigrationActionExecutionException({
        code: WorkspaceMigrationActionExecutionExceptionCode.FIELD_METADATA_NOT_FOUND,
        message: `Could not not find junction column id for universal identifier ${junctionTargetFieldUniversalIdentifier}`,
      });
    }

    return {
      ...rest,
      junctionTargetFieldId,
    };
  }

  return universalSettings;
};

const fromRollupUniversalSettingsToFlatFieldMetadataSettings = ({
  universalSettings,
  allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
  flatFieldMetadataMaps,
}: {
  universalSettings: NonNullable<
    UniversalFlatFieldMetadata<FieldMetadataType.ROLLUP>['universalSettings']
  >;
  allFieldIdToBeCreatedInActionByUniversalIdentifierMap: Map<string, string>;
  flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
}): FieldMetadataSettings<FieldMetadataType.ROLLUP> => {
  const {
    relationFieldMetadataUniversalIdentifier,
    targetFieldMetadataUniversalIdentifier,
    aggregateOperation,
    filter,
  } = universalSettings;

  if (!isDefined(relationFieldMetadataUniversalIdentifier)) {
    throw new WorkspaceMigrationActionExecutionException({
      code: WorkspaceMigrationActionExecutionExceptionCode.FIELD_METADATA_NOT_FOUND,
      message:
        'Rollup settings are missing their relation field universal identifier',
    });
  }

  const relationFieldMetadataId = findFieldMetadataIdInCreateFieldContext({
    universalIdentifier: relationFieldMetadataUniversalIdentifier,
    allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
    flatFieldMetadataMaps,
  });

  if (!isDefined(relationFieldMetadataId)) {
    throw new WorkspaceMigrationActionExecutionException({
      code: WorkspaceMigrationActionExecutionExceptionCode.FIELD_METADATA_NOT_FOUND,
      message: `Could not find rollup relation field id for universal identifier ${relationFieldMetadataUniversalIdentifier}`,
    });
  }

  const targetFieldMetadataId = isDefined(
    targetFieldMetadataUniversalIdentifier,
  )
    ? findFieldMetadataIdInCreateFieldContext({
        universalIdentifier: targetFieldMetadataUniversalIdentifier,
        allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
        flatFieldMetadataMaps,
      })
    : null;

  if (
    isDefined(targetFieldMetadataUniversalIdentifier) &&
    !isDefined(targetFieldMetadataId)
  ) {
    throw new WorkspaceMigrationActionExecutionException({
      code: WorkspaceMigrationActionExecutionExceptionCode.FIELD_METADATA_NOT_FOUND,
      message: `Could not find rollup target field id for universal identifier ${targetFieldMetadataUniversalIdentifier}`,
    });
  }

  return {
    aggregateOperation,
    relationFieldMetadataId,
    targetFieldMetadataId,
    filter: convertUniversalChartFilterToChartFilter({
      filter,
      resolveFieldMetadataId: (fieldMetadataUniversalIdentifier) => {
        const filterFieldMetadataId = isDefined(
          fieldMetadataUniversalIdentifier,
        )
          ? findFieldMetadataIdInCreateFieldContext({
              universalIdentifier: fieldMetadataUniversalIdentifier,
              allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
              flatFieldMetadataMaps,
            })
          : null;

        if (!isDefined(filterFieldMetadataId)) {
          throw new WorkspaceMigrationActionExecutionException({
            code: WorkspaceMigrationActionExecutionExceptionCode.FIELD_METADATA_NOT_FOUND,
            message: `Could not find rollup filter field id for universal identifier ${fieldMetadataUniversalIdentifier}`,
          });
        }

        return filterFieldMetadataId;
      },
    }),
  };
};
