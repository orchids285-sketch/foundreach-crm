import {
  FieldMetadataType,
  RelationType,
  type RollupAggregateOperation,
} from 'twenty-shared/types';
import { CustomError, isDefined } from 'twenty-shared/utils';

import { computeColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-column-name.util';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';

type RollupSqlContext = {
  rollupColumnName: string;
  childTableName: string;
  childJoinColumnName: string;
  childTargetColumnName: string | null;
  childObjectMetadataId: string;
  aggregateOperation: RollupAggregateOperation;
};

export const resolveRollupSqlContextOrThrow = ({
  rollupFlatFieldMetadata,
  flatFieldMetadataMaps,
  flatObjectMetadataMaps,
}: {
  rollupFlatFieldMetadata: FlatFieldMetadata<FieldMetadataType.ROLLUP>;
  flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
  flatObjectMetadataMaps: MetadataFlatEntityMaps<'objectMetadata'>;
}): RollupSqlContext => {
  const { relationFieldMetadataId, targetFieldMetadataId, aggregateOperation } =
    rollupFlatFieldMetadata.settings;

  const relationFlatFieldMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
    flatEntityMaps: flatFieldMetadataMaps,
    flatEntityId: relationFieldMetadataId,
  });

  if (
    !isFlatFieldMetadataOfType(
      relationFlatFieldMetadata,
      FieldMetadataType.RELATION,
    ) ||
    relationFlatFieldMetadata.settings.relationType !== RelationType.ONE_TO_MANY
  ) {
    throw new CustomError(
      'Rollup relation field must be a ONE_TO_MANY relation',
      'ROLLUP_INVALID_RELATION_FIELD',
    );
  }

  if (
    !isDefined(relationFlatFieldMetadata.relationTargetFieldMetadataId) ||
    !isDefined(relationFlatFieldMetadata.relationTargetObjectMetadataId)
  ) {
    throw new CustomError(
      'Rollup relation field is missing its relation target',
      'ROLLUP_INVALID_RELATION_FIELD',
    );
  }

  const childManyToOneFlatFieldMetadata =
    findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityMaps: flatFieldMetadataMaps,
      flatEntityId: relationFlatFieldMetadata.relationTargetFieldMetadataId,
    });

  const childFlatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
    flatEntityMaps: flatObjectMetadataMaps,
    flatEntityId: relationFlatFieldMetadata.relationTargetObjectMetadataId,
  });

  return {
    rollupColumnName: computeColumnName(rollupFlatFieldMetadata.name),
    childTableName: computeObjectTargetTable(childFlatObjectMetadata),
    childJoinColumnName: computeMorphOrRelationFieldJoinColumnName({
      name: childManyToOneFlatFieldMetadata.name,
    }),
    childTargetColumnName: resolveChildTargetColumnNameOrThrow({
      aggregateOperation,
      targetFieldMetadataId,
      childObjectMetadataId: childFlatObjectMetadata.id,
      flatFieldMetadataMaps,
    }),
    childObjectMetadataId: childFlatObjectMetadata.id,
    aggregateOperation,
  };
};

const resolveChildTargetColumnNameOrThrow = ({
  aggregateOperation,
  targetFieldMetadataId,
  childObjectMetadataId,
  flatFieldMetadataMaps,
}: {
  aggregateOperation: RollupAggregateOperation;
  targetFieldMetadataId: string | null;
  childObjectMetadataId: string;
  flatFieldMetadataMaps: MetadataFlatEntityMaps<'fieldMetadata'>;
}): string | null => {
  if (aggregateOperation === 'COUNT') {
    return null;
  }

  if (!isDefined(targetFieldMetadataId)) {
    throw new CustomError(
      `Rollup ${aggregateOperation} operation requires a target field`,
      'ROLLUP_MISSING_TARGET_FIELD',
    );
  }

  const targetFlatFieldMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
    flatEntityMaps: flatFieldMetadataMaps,
    flatEntityId: targetFieldMetadataId,
  });

  if (
    targetFlatFieldMetadata.type !== FieldMetadataType.NUMBER ||
    targetFlatFieldMetadata.objectMetadataId !== childObjectMetadataId
  ) {
    throw new CustomError(
      'Rollup target field must be a NUMBER field on the relation target object',
      'ROLLUP_INVALID_TARGET_FIELD',
    );
  }

  return computeColumnName(targetFlatFieldMetadata.name);
};
