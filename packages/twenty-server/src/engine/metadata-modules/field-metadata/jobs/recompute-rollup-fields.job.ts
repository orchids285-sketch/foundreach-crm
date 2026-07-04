import {
  FieldMetadataType,
  type ChartFilter,
  type RollupAggregateOperation,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GraphqlQueryFilterConditionParser } from 'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query-filter/graphql-query-filter-condition.parser';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { buildRollupFilterRecordGqlOperationFilter } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-filter-record-gql-operation-filter.util';
import { buildRollupRecomputeSql } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-recompute-sql.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { resolveRollupSqlContextOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/resolve-rollup-sql-context.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

export type RecomputeRollupFieldsJobData = {
  workspaceId: string;
  rollupFieldMetadataId: string;
  parentIds?: string[];
};

const ROLLUP_APPLY_BATCH_SIZE = 5000;

@Processor(MessageQueue.workspaceQueue)
export class RecomputeRollupFieldsJob {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  @Process(RecomputeRollupFieldsJob.name)
  async handle({
    workspaceId,
    rollupFieldMetadataId,
    parentIds,
  }: RecomputeRollupFieldsJobData): Promise<void> {
    if (isDefined(parentIds) && parentIds.length === 0) {
      return;
    }

    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatFieldMetadataMaps', 'flatObjectMetadataMaps'],
        },
      );

    const rollupFlatFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityMaps: flatFieldMetadataMaps,
      flatEntityId: rollupFieldMetadataId,
    });

    if (
      !isDefined(rollupFlatFieldMetadata) ||
      !isFlatFieldMetadataOfType(
        rollupFlatFieldMetadata,
        FieldMetadataType.ROLLUP,
      )
    ) {
      return;
    }

    const parentFlatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityMaps: flatObjectMetadataMaps,
      flatEntityId: rollupFlatFieldMetadata.objectMetadataId,
    });

    const rollupSqlContext = resolveRollupSqlContextOrThrow({
      rollupFlatFieldMetadata,
      flatFieldMetadataMaps,
      flatObjectMetadataMaps,
    });

    const parentSchemaName = getWorkspaceSchemaName(workspaceId);
    const parentTableName = computeObjectTargetTable(parentFlatObjectMetadata);
    const rollupFilter = rollupFlatFieldMetadata.settings.filter;
    const hasRollupFilter =
      isDefined(rollupFilter) && (rollupFilter.recordFilters?.length ?? 0) > 0;

    if (!hasRollupFilter) {
      const { sql, parameters } = buildRollupRecomputeSql({
        parentSchemaName,
        parentTableName,
        rollupColumnName: rollupSqlContext.rollupColumnName,
        childTableName: rollupSqlContext.childTableName,
        childJoinColumnName: rollupSqlContext.childJoinColumnName,
        childTargetColumnName: rollupSqlContext.childTargetColumnName,
        aggregateOperation: rollupSqlContext.aggregateOperation,
        parentIds,
      });

      const dataSource =
        await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();

      await dataSource.query(sql, parameters, undefined, {
        shouldBypassPermissionChecks: true,
      });

      return;
    }

    await this.recomputeFilteredRollup({
      workspaceId,
      parentSchemaName,
      parentTableName,
      rollupColumnName: rollupSqlContext.rollupColumnName,
      childObjectMetadataId: rollupSqlContext.childObjectMetadataId,
      childJoinColumnName: rollupSqlContext.childJoinColumnName,
      childTargetColumnName: rollupSqlContext.childTargetColumnName,
      aggregateOperation: rollupSqlContext.aggregateOperation,
      rollupFilter,
      flatFieldMetadataMaps,
      flatObjectMetadataMaps,
      parentIds,
    });
  }

  private async recomputeFilteredRollup({
    workspaceId,
    parentSchemaName,
    parentTableName,
    rollupColumnName,
    childObjectMetadataId,
    childJoinColumnName,
    childTargetColumnName,
    aggregateOperation,
    rollupFilter,
    flatFieldMetadataMaps,
    flatObjectMetadataMaps,
    parentIds,
  }: {
    workspaceId: string;
    parentSchemaName: string;
    parentTableName: string;
    rollupColumnName: string;
    childObjectMetadataId: string;
    childJoinColumnName: string;
    childTargetColumnName: string | null;
    aggregateOperation: RollupAggregateOperation;
    rollupFilter: ChartFilter;
    flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
    flatObjectMetadataMaps: MetadataFlatEntityMaps<'objectMetadata'>;
    parentIds?: string[];
  }): Promise<void> {
    const childFlatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityMaps: flatObjectMetadataMaps,
      flatEntityId: childObjectMetadataId,
    });

    const recordGqlOperationFilter = buildRollupFilterRecordGqlOperationFilter({
      rollupFilter,
      flatFieldMetadataMaps,
    });

    const childRepository = await this.globalWorkspaceOrmManager.getRepository(
      workspaceId,
      childFlatObjectMetadata.nameSingular,
      { shouldBypassPermissionChecks: true },
    );

    const childAlias = childFlatObjectMetadata.nameSingular;
    const escapedChildAliasAndJoinColumn = `${escapeIdentifier(childAlias)}.${escapeIdentifier(childJoinColumnName)}`;
    const aggregateExpression =
      aggregateOperation === 'COUNT' || !isDefined(childTargetColumnName)
        ? 'COUNT(*)'
        : `${aggregateOperation}(${escapeIdentifier(childAlias)}.${escapeIdentifier(childTargetColumnName)})`;

    const childQueryBuilder = childRepository.createQueryBuilder(childAlias);

    if (isDefined(recordGqlOperationFilter)) {
      new GraphqlQueryFilterConditionParser(
        childFlatObjectMetadata,
        flatFieldMetadataMaps,
        flatObjectMetadataMaps,
      ).parse(childQueryBuilder, childAlias, recordGqlOperationFilter);
    }

    childQueryBuilder
      .select(escapedChildAliasAndJoinColumn, 'parentId')
      .addSelect(aggregateExpression, 'value')
      .andWhere(`${escapedChildAliasAndJoinColumn} IS NOT NULL`)
      .andWhere(
        `${escapeIdentifier(childAlias)}.${escapeIdentifier('deletedAt')} IS NULL`,
      )
      .groupBy(escapedChildAliasAndJoinColumn);

    if (isDefined(parentIds)) {
      childQueryBuilder.andWhere(
        `${escapedChildAliasAndJoinColumn} = ANY(:parentIds)`,
        { parentIds },
      );
    }

    const aggregatedRows: { parentId: string; value: string | number }[] =
      await childQueryBuilder.getRawMany();

    const dataSource =
      await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();

    const escapedParentTable = `${escapeIdentifier(parentSchemaName)}.${escapeIdentifier(parentTableName)}`;
    const escapedRollupColumn = escapeIdentifier(rollupColumnName);
    const resetValue = aggregateOperation === 'COUNT' ? '0' : 'NULL';
    const resetSql = isDefined(parentIds)
      ? `UPDATE ${escapedParentTable} SET ${escapedRollupColumn} = ${resetValue} WHERE "id" = ANY($1)`
      : `UPDATE ${escapedParentTable} SET ${escapedRollupColumn} = ${resetValue}`;

    await dataSource.query(
      resetSql,
      isDefined(parentIds) ? [parentIds] : [],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    for (
      let batchStartIndex = 0;
      batchStartIndex < aggregatedRows.length;
      batchStartIndex += ROLLUP_APPLY_BATCH_SIZE
    ) {
      const batch = aggregatedRows.slice(
        batchStartIndex,
        batchStartIndex + ROLLUP_APPLY_BATCH_SIZE,
      );

      await dataSource.query(
        `UPDATE ${escapedParentTable} p SET ${escapedRollupColumn} = batch."value" FROM (SELECT unnest($1::uuid[]) AS "parentId", unnest($2::float8[]) AS "value") batch WHERE p."id" = batch."parentId"`,
        [
          batch.map((row) => row.parentId),
          batch.map((row) => Number(row.value)),
        ],
        undefined,
        { shouldBypassPermissionChecks: true },
      );
    }
  }
}
