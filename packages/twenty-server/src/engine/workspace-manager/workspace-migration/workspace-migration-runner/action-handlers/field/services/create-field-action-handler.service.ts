import { Injectable } from '@nestjs/common';

import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type QueryRunner } from 'typeorm';
import { v4 } from 'uuid';

import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import { WorkspaceMigrationRunnerActionHandler } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/interfaces/workspace-migration-runner-action-handler-service.interface';

import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { findManyFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-many-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { buildRollupRecomputeSql } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-recompute-sql.util';
import { deriveFormulaAsExpressionForFormulaField } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-formula-as-expression-for-formula-field.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { resolveRollupSqlContextOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/resolve-rollup-sql-context.util';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceSchemaManagerService } from 'src/engine/twenty-orm/workspace-schema-manager/workspace-schema-manager.service';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { convertOnDeleteActionToOnDelete } from 'src/engine/workspace-manager/workspace-migration/utils/convert-on-delete-action-to-on-delete.util';
import {
  type FlatCreateFieldAction,
  type UniversalCreateFieldAction,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/field/types/workspace-migration-field-action';
import { fromUniversalFlatFieldMetadataToFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/action-handlers/field/services/utils/from-universal-flat-field-metadata-to-flat-field-metadata.util';
import {
  WorkspaceMigrationActionRunnerContext,
  type WorkspaceMigrationActionRunnerArgs,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/types/workspace-migration-action-runner-args.type';
import { generateColumnDefinitions } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/generate-column-definitions.util';
import { getWorkspaceSchemaContextForMigration } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/get-workspace-schema-context-for-migration.util';
import {
  collectEnumOperationsForField,
  EnumOperation,
  executeBatchEnumOperations,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/workspace-schema-enum-operations.util';

@Injectable()
export class CreateFieldActionHandlerService extends WorkspaceMigrationRunnerActionHandler(
  'create',
  'fieldMetadata',
) {
  constructor(
    private readonly workspaceSchemaManagerService: WorkspaceSchemaManagerService,
  ) {
    super();
  }

  override async transpileUniversalActionToFlatAction(
    context: WorkspaceMigrationActionRunnerArgs<UniversalCreateFieldAction>,
  ): Promise<FlatCreateFieldAction> {
    const { action, allFlatEntityMaps } = context;

    const allFieldIdToBeCreatedInActionByUniversalIdentifierMap = new Map<
      string,
      string
    >(Object.entries(action.fieldIdByUniversalIdentifier ?? {}));

    if (
      !allFieldIdToBeCreatedInActionByUniversalIdentifierMap.has(
        action.flatEntity.universalIdentifier,
      )
    ) {
      allFieldIdToBeCreatedInActionByUniversalIdentifierMap.set(
        action.flatEntity.universalIdentifier,
        action.id ?? v4(),
      );
    }

    if (
      isDefined(action.relatedUniversalFlatFieldMetadata) &&
      !allFieldIdToBeCreatedInActionByUniversalIdentifierMap.has(
        action.relatedUniversalFlatFieldMetadata.universalIdentifier,
      )
    ) {
      allFieldIdToBeCreatedInActionByUniversalIdentifierMap.set(
        action.relatedUniversalFlatFieldMetadata.universalIdentifier,
        action.relatedFieldId ?? v4(),
      );
    }

    const universalFlatFieldMetadatas = isDefined(
      action.relatedUniversalFlatFieldMetadata,
    )
      ? [action.flatEntity, action.relatedUniversalFlatFieldMetadata]
      : [action.flatEntity];

    const [flatFieldMetadata, relatedFlatFieldMetadata] =
      universalFlatFieldMetadatas.map((universalFlatFieldMetadata) =>
        fromUniversalFlatFieldMetadataToFlatFieldMetadata({
          universalFlatFieldMetadata,
          allFieldIdToBeCreatedInActionByUniversalIdentifierMap,
          allFlatEntityMaps,
          context,
        }),
      );

    return {
      type: action.type,
      metadataName: action.metadataName,
      flatEntity: flatFieldMetadata,
      relatedFlatFieldMetadata,
    };
  }

  async executeForMetadata(
    context: WorkspaceMigrationActionRunnerContext<FlatCreateFieldAction>,
  ): Promise<void> {
    const { queryRunner, flatAction } = context;
    const { flatEntity, relatedFlatFieldMetadata } = flatAction;

    await this.insertFlatEntitiesInRepository({
      queryRunner,
      flatEntities: [flatEntity, relatedFlatFieldMetadata].filter(isDefined),
    });
  }

  async executeForWorkspaceSchema(
    context: WorkspaceMigrationActionRunnerContext<FlatCreateFieldAction>,
  ): Promise<void> {
    const {
      flatAction,
      queryRunner,
      allFlatEntityMaps: { flatObjectMetadataMaps, flatFieldMetadataMaps },
      workspaceId,
    } = context;
    const { flatEntity, relatedFlatFieldMetadata } = flatAction;

    const fieldsByObjectMetadataId = new Map<string, FlatFieldMetadata[]>();

    for (const flatFieldMetadata of [
      flatEntity,
      relatedFlatFieldMetadata,
    ].filter(isDefined)) {
      const existingFields = fieldsByObjectMetadataId.get(
        flatFieldMetadata.objectMetadataId,
      );

      if (isDefined(existingFields)) {
        existingFields.push(flatFieldMetadata);
      } else {
        fieldsByObjectMetadataId.set(flatFieldMetadata.objectMetadataId, [
          flatFieldMetadata,
        ]);
      }
    }

    for (const [
      objectMetadataId,
      objectFlatFieldMetadatas,
    ] of fieldsByObjectMetadataId) {
      const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
        flatEntityMaps: flatObjectMetadataMaps,
        flatEntityId: objectMetadataId,
      });

      const { schemaName, tableName } = getWorkspaceSchemaContextForMigration({
        workspaceId,
        objectMetadata: flatObjectMetadata,
      });

      for (const flatFieldMetadata of objectFlatFieldMetadatas) {
        await this.executeSingleFieldMetadataWorkspaceSchema({
          flatFieldMetadata,
          flatObjectMetadata,
          flatObjectMetadataMaps,
          flatFieldMetadataMaps,
          queryRunner,
          schemaName,
          tableName,
          workspaceId,
        });
      }
    }
  }

  private async executeSingleFieldMetadataWorkspaceSchema({
    flatFieldMetadata,
    flatObjectMetadata,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    queryRunner,
    schemaName,
    tableName,
    workspaceId,
  }: {
    flatFieldMetadata: FlatFieldMetadata;
    flatObjectMetadata: FlatObjectMetadata;
    flatObjectMetadataMaps: MetadataFlatEntityMaps<'objectMetadata'>;
    flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
    queryRunner: QueryRunner;
    schemaName: string;
    tableName: string;
    workspaceId: string;
  }): Promise<void> {
    const enumOperations = collectEnumOperationsForField({
      flatFieldMetadata,
      tableName,
      operation: EnumOperation.CREATE,
    });

    const formulaAsExpression = isFlatFieldMetadataOfType(
      flatFieldMetadata,
      FieldMetadataType.FORMULA,
    )
      ? deriveFormulaAsExpressionForFormulaField({
          formulaFlatFieldMetadata: flatFieldMetadata,
          siblingFlatFieldMetadatas: findManyFlatEntityByIdInFlatEntityMaps({
            flatEntityMaps: flatFieldMetadataMaps,
            flatEntityIds: flatObjectMetadata.fieldIds,
          }),
        })
      : undefined;

    const columnDefinitions = generateColumnDefinitions({
      flatFieldMetadata,
      flatObjectMetadata,
      workspaceId,
      formulaAsExpression,
    });

    await executeBatchEnumOperations({
      enumOperations,
      queryRunner,
      schemaName,
      workspaceSchemaManagerService: this.workspaceSchemaManagerService,
    });

    await this.workspaceSchemaManagerService.columnManager.addColumns({
      queryRunner,
      schemaName,
      tableName,
      columnDefinitions,
    });

    const isUnfilteredRollup =
      isFlatFieldMetadataOfType(flatFieldMetadata, FieldMetadataType.ROLLUP) &&
      (flatFieldMetadata.settings.filter?.recordFilters?.length ?? 0) === 0;

    // Filtered rollups are backfilled asynchronously after the migration
    // commits, because filter resolution needs the ORM query machinery
    if (isUnfilteredRollup) {
      const {
        rollupColumnName,
        childTableName,
        childJoinColumnName,
        childTargetColumnName,
        aggregateOperation,
      } = resolveRollupSqlContextOrThrow({
        rollupFlatFieldMetadata: flatFieldMetadata,
        flatFieldMetadataMaps,
        flatObjectMetadataMaps,
      });

      const { sql, parameters } = buildRollupRecomputeSql({
        parentSchemaName: schemaName,
        parentTableName: tableName,
        rollupColumnName,
        childTableName,
        childJoinColumnName,
        childTargetColumnName,
        aggregateOperation,
      });

      await queryRunner.query(sql, parameters);
    }

    if (
      isMorphOrRelationFlatFieldMetadata(flatFieldMetadata) &&
      flatFieldMetadata.settings?.relationType === RelationType.MANY_TO_ONE
    ) {
      const targetFlatObjectMetadata =
        findFlatEntityByIdInFlatEntityMapsOrThrow({
          flatEntityMaps: flatObjectMetadataMaps,
          flatEntityId: flatFieldMetadata.relationTargetObjectMetadataId!,
        });
      const referencedTableName = computeObjectTargetTable(
        targetFlatObjectMetadata,
      );

      const joinColumnName = computeMorphOrRelationFieldJoinColumnName({
        name: flatFieldMetadata.name,
      });

      await this.workspaceSchemaManagerService.foreignKeyManager.createForeignKey(
        {
          queryRunner,
          schemaName,
          foreignKey: {
            tableName,
            columnName: joinColumnName,
            referencedTableName,
            referencedColumnName: 'id',
            onDelete:
              convertOnDeleteActionToOnDelete(
                flatFieldMetadata.settings?.onDelete,
              ) ?? 'CASCADE',
          },
        },
      );
    }
  }
}
