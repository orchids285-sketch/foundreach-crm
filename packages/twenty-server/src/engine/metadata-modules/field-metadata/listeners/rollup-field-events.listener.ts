import { Injectable } from '@nestjs/common';

import {
  type ObjectRecordBaseEvent,
  type ObjectRecordCreateEvent,
  type ObjectRecordDeleteEvent,
  type ObjectRecordDestroyEvent,
  type ObjectRecordRestoreEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import {
  RecomputeRollupFieldsJob,
  type RecomputeRollupFieldsJobData,
} from 'src/engine/metadata-modules/field-metadata/jobs/recompute-rollup-fields.job';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

type ObjectRecordEventWithRecord = ObjectRecordBaseEvent<
  Record<string, unknown>
>;

@Injectable()
export class RollupFieldEventsListener {
  constructor(
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly workspaceQueueService: MessageQueueService,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  @OnDatabaseBatchEvent('*', DatabaseEventAction.CREATED)
  async handleCreate(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordCreateEvent<Record<string, unknown>>
    >,
  ) {
    return this.handleEvent(batchEvent);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPDATED)
  async handleUpdate(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<Record<string, unknown>>
    >,
  ) {
    return this.handleEvent(batchEvent);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.DELETED)
  async handleDelete(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordDeleteEvent<Record<string, unknown>>
    >,
  ) {
    return this.handleEvent(batchEvent);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.RESTORED)
  async handleRestore(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordRestoreEvent<Record<string, unknown>>
    >,
  ) {
    return this.handleEvent(batchEvent);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.DESTROYED)
  async handleDestroy(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordDestroyEvent<Record<string, unknown>>
    >,
  ) {
    return this.handleEvent(batchEvent);
  }

  private async handleEvent(
    batchEvent: WorkspaceEventBatch<ObjectRecordEventWithRecord>,
  ): Promise<void> {
    if (batchEvent.events.length === 0) {
      return;
    }

    const { flatFieldMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: batchEvent.workspaceId,
          flatMapsKeys: ['flatFieldMetadataMaps'],
        },
      );

    for (const rollupFlatFieldMetadata of Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    )) {
      if (
        !isDefined(rollupFlatFieldMetadata) ||
        !isFlatFieldMetadataOfType(
          rollupFlatFieldMetadata,
          FieldMetadataType.ROLLUP,
        ) ||
        !rollupFlatFieldMetadata.isActive
      ) {
        continue;
      }

      const relationFlatFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
        flatEntityMaps: flatFieldMetadataMaps,
        flatEntityId: rollupFlatFieldMetadata.settings.relationFieldMetadataId,
      });

      if (
        !isDefined(relationFlatFieldMetadata) ||
        relationFlatFieldMetadata.relationTargetObjectMetadataId !==
          batchEvent.objectMetadata.id ||
        !isDefined(relationFlatFieldMetadata.relationTargetFieldMetadataId)
      ) {
        continue;
      }

      const childManyToOneFlatFieldMetadata =
        findFlatEntityByIdInFlatEntityMaps({
          flatEntityMaps: flatFieldMetadataMaps,
          flatEntityId: relationFlatFieldMetadata.relationTargetFieldMetadataId,
        });

      if (!isDefined(childManyToOneFlatFieldMetadata)) {
        continue;
      }

      const childJoinColumnName = computeMorphOrRelationFieldJoinColumnName({
        name: childManyToOneFlatFieldMetadata.name,
      });

      const parentIds = this.collectAffectedParentIds({
        events: batchEvent.events,
        childJoinColumnName,
      });

      if (parentIds.length === 0) {
        continue;
      }

      await this.workspaceQueueService.add<RecomputeRollupFieldsJobData>(
        RecomputeRollupFieldsJob.name,
        {
          workspaceId: batchEvent.workspaceId,
          rollupFieldMetadataId: rollupFlatFieldMetadata.id,
          parentIds,
        },
        { retryLimit: 3 },
      );
    }
  }

  private collectAffectedParentIds({
    events,
    childJoinColumnName,
  }: {
    events: ObjectRecordEventWithRecord[];
    childJoinColumnName: string;
  }): string[] {
    const parentIds = new Set<string>();

    for (const event of events) {
      for (const record of [event.properties.after, event.properties.before]) {
        const parentId = record?.[childJoinColumnName];

        if (typeof parentId === 'string') {
          parentIds.add(parentId);
        }
      }
    }

    return [...parentIds];
  }
}
