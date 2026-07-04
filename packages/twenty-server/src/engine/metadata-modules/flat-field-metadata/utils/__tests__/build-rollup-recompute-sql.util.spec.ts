import { buildRollupRecomputeSql } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-recompute-sql.util';

describe('buildRollupRecomputeSql', () => {
  it('should build a COUNT backfill over all parent rows coalesced to 0', () => {
    const { sql, parameters } = buildRollupRecomputeSql({
      parentSchemaName: 'workspace_abc',
      parentTableName: 'company',
      rollupColumnName: 'peopleCount',
      childTableName: 'person',
      childJoinColumnName: 'companyId',
      childTargetColumnName: null,
      aggregateOperation: 'COUNT',
    });

    expect(sql).toBe(
      'UPDATE "workspace_abc"."company" p SET "peopleCount" = (SELECT COALESCE(COUNT(*), 0) FROM "workspace_abc"."person" c WHERE c."companyId" = p."id" AND c."deletedAt" IS NULL)',
    );
    expect(parameters).toEqual([]);
  });

  it('should build a SUM recompute restricted to given parent ids without coalescing', () => {
    const parentIds = ['parent-id-1', 'parent-id-2'];

    const { sql, parameters } = buildRollupRecomputeSql({
      parentSchemaName: 'workspace_abc',
      parentTableName: 'company',
      rollupColumnName: 'totalRevenue',
      childTableName: 'opportunity',
      childJoinColumnName: 'companyId',
      childTargetColumnName: 'amount',
      aggregateOperation: 'SUM',
      parentIds,
    });

    expect(sql).toBe(
      'UPDATE "workspace_abc"."company" p SET "totalRevenue" = (SELECT SUM(c."amount") FROM "workspace_abc"."opportunity" c WHERE c."companyId" = p."id" AND c."deletedAt" IS NULL) WHERE p."id" = ANY($1)',
    );
    expect(parameters).toEqual([parentIds]);
  });

  it('should throw when a non-COUNT operation has no target column', () => {
    expect(() =>
      buildRollupRecomputeSql({
        parentSchemaName: 'workspace_abc',
        parentTableName: 'company',
        rollupColumnName: 'averageAmount',
        childTableName: 'opportunity',
        childJoinColumnName: 'companyId',
        childTargetColumnName: null,
        aggregateOperation: 'AVG',
      }),
    ).toThrow('Rollup AVG operation requires a target column');
  });

  it('should escape double quotes in identifiers', () => {
    const { sql } = buildRollupRecomputeSql({
      parentSchemaName: 'workspace_abc',
      parentTableName: 'company',
      rollupColumnName: 'evil"column',
      childTableName: 'person',
      childJoinColumnName: 'companyId',
      childTargetColumnName: null,
      aggregateOperation: 'COUNT',
    });

    expect(sql).toContain('SET "evil""column" =');
  });
});
