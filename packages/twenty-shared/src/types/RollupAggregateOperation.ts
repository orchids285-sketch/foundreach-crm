export const ROLLUP_AGGREGATE_OPERATIONS = [
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
] as const;

export type RollupAggregateOperation =
  (typeof ROLLUP_AGGREGATE_OPERATIONS)[number];
