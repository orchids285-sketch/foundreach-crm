import { type RollupAggregateOperation } from 'twenty-shared/types';
import { CustomError, isDefined } from 'twenty-shared/utils';

import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

export const buildRollupRecomputeSql = ({
  parentSchemaName,
  parentTableName,
  rollupColumnName,
  childTableName,
  childJoinColumnName,
  childTargetColumnName,
  aggregateOperation,
  parentIds,
}: {
  parentSchemaName: string;
  parentTableName: string;
  rollupColumnName: string;
  childTableName: string;
  childJoinColumnName: string;
  childTargetColumnName: string | null;
  aggregateOperation: RollupAggregateOperation;
  parentIds?: string[];
}): { sql: string; parameters: string[][] } => {
  if (aggregateOperation !== 'COUNT' && !isDefined(childTargetColumnName)) {
    throw new CustomError(
      `Rollup ${aggregateOperation} operation requires a target column`,
      'ROLLUP_MISSING_TARGET_COLUMN',
    );
  }

  const aggregateExpression =
    aggregateOperation === 'COUNT' || !isDefined(childTargetColumnName)
      ? 'COALESCE(COUNT(*), 0)'
      : `${aggregateOperation}(c.${escapeIdentifier(childTargetColumnName)})`;

  const escapedSchemaName = escapeIdentifier(parentSchemaName);
  const subQuery = `SELECT ${aggregateExpression} FROM ${escapedSchemaName}.${escapeIdentifier(childTableName)} c WHERE c.${escapeIdentifier(childJoinColumnName)} = p."id" AND c."deletedAt" IS NULL`;
  const parentIdsClause = isDefined(parentIds) ? ' WHERE p."id" = ANY($1)' : '';

  return {
    sql: `UPDATE ${escapedSchemaName}.${escapeIdentifier(parentTableName)} p SET ${escapeIdentifier(rollupColumnName)} = (${subQuery})${parentIdsClause}`,
    parameters: isDefined(parentIds) ? [parentIds] : [],
  };
};
