import { type FormulaValue } from '@/utils/formula/types/FormulaValue';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export type FormulaFunctionDefinition = {
  inferReturnTypeOrThrow: (
    argumentTypes: FormulaValueType[],
  ) => FormulaValueType;
  toPostgresSql: (
    argumentsSql: string[],
    argumentTypes: FormulaValueType[],
  ) => string;
  evaluate: (argumentValues: FormulaValue[]) => FormulaValue;
};
