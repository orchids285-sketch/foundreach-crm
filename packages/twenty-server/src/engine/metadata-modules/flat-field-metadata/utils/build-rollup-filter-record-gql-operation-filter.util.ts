import {
  RecordFilterGroupLogicalOperator,
  type ChartFilter,
  type CompositeFieldSubFieldName,
  type RecordGqlOperationFilter,
} from 'twenty-shared/types';
import {
  computeRecordGqlOperationFilter,
  CustomError,
  getFilterTypeFromFieldType,
  isDefined,
  type RecordFilter,
  type RecordFilterGroup,
} from 'twenty-shared/utils';
import { v4 } from 'uuid';

import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';

export const buildRollupFilterRecordGqlOperationFilter = ({
  rollupFilter,
  flatFieldMetadataMaps,
}: {
  rollupFilter: ChartFilter;
  flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
}): RecordGqlOperationFilter | null => {
  const chartRecordFilters = rollupFilter.recordFilters ?? [];

  if (chartRecordFilters.length === 0) {
    return null;
  }

  const recordFilters = chartRecordFilters.map((chartRecordFilter) => {
    const filterFlatFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: chartRecordFilter.fieldMetadataId,
      flatEntityMaps: flatFieldMetadataMaps,
    });

    if (!isDefined(filterFlatFieldMetadata)) {
      throw new CustomError(
        `Rollup filter field metadata not found for id ${chartRecordFilter.fieldMetadataId}`,
        'ROLLUP_FILTER_FIELD_NOT_FOUND',
      );
    }

    return {
      id: v4(),
      fieldMetadataId: chartRecordFilter.fieldMetadataId,
      value: chartRecordFilter.value ?? '',
      type: getFilterTypeFromFieldType(
        filterFlatFieldMetadata.type,
        filterFlatFieldMetadata.settings,
      ),
      operand: chartRecordFilter.operand as RecordFilter['operand'],
      recordFilterGroupId: chartRecordFilter.recordFilterGroupId ?? undefined,
      subFieldName: (chartRecordFilter.subFieldName ?? undefined) as
        | CompositeFieldSubFieldName
        | undefined,
    } satisfies RecordFilter;
  });

  const recordFilterGroups: RecordFilterGroup[] = (
    rollupFilter.recordFilterGroups ?? []
  ).map((chartRecordFilterGroup) => ({
    id: chartRecordFilterGroup.id,
    logicalOperator:
      chartRecordFilterGroup.logicalOperator ===
      RecordFilterGroupLogicalOperator.OR
        ? RecordFilterGroupLogicalOperator.OR
        : RecordFilterGroupLogicalOperator.AND,
    parentRecordFilterGroupId:
      chartRecordFilterGroup.parentRecordFilterGroupId,
  }));

  return computeRecordGqlOperationFilter({
    recordFilters,
    recordFilterGroups,
    fieldMetadataItems: Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined),
    filterValueDependencies: {},
  });
};
