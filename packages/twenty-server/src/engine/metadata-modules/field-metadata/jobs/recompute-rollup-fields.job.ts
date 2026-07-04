import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { buildRollupRecomputeSql } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-recompute-sql.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { resolveRollupSqlContextOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/resolve-rollup-sql-context.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

export type RecomputeRollupFieldsJobData = {
  workspaceId: string;
  rollupFieldMetadataId: string;
  parentIds: string[];
};

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
    if (parentIds.length === 0) {
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

    const {
      rollupColumnName,
      childTableName,
      childJoinColumnName,
      childTargetColumnName,
      aggregateOperation,
    } = resolveRollupSqlContextOrThrow({
      rollupFlatFieldMetadata,
      flatFieldMetadataMaps,
      flatObjectMetadataMaps,
    });

    const { sql, parameters } = buildRollupRecomputeSql({
      parentSchemaName: getWorkspaceSchemaName(workspaceId),
      parentTableName: computeObjectTargetTable(parentFlatObjectMetadata),
      rollupColumnName,
      childTableName,
      childJoinColumnName,
      childTargetColumnName,
      aggregateOperation,
      parentIds,
    });

    const dataSource =
      await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();

    await dataSource.query(sql, parameters, undefined, {
      shouldBypassPermissionChecks: true,
    });
  }
}
