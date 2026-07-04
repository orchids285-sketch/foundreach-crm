import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';
import { type FormulaValue } from '@/utils/formula/types/FormulaValue';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export type FormulaFunctionDefinition = {
  inferReturnTypeOrThrow: (
    argumentTypes: FormulaValueType[],
    argumentNodes: FormulaAstNode[],
  ) => FormulaValueType;
  toPostgresSql: (
    argumentsSql: string[],
    argumentTypes: FormulaValueType[],
    argumentNodes: FormulaAstNode[],
  ) => string;
  evaluate: (argumentValues: FormulaValue[]) => FormulaValue;
};
