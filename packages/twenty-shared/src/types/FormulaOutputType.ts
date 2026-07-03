export const FORMULA_OUTPUT_TYPES = [
  'NUMBER',
  'TEXT',
  'BOOLEAN',
  'DATE_TIME',
] as const;

export type FormulaOutputType = (typeof FORMULA_OUTPUT_TYPES)[number];
