import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const inferTextSliceFunctionReturnTypeOrThrow = ({
  functionName,
  argumentTypes,
}: {
  functionName: string;
  argumentTypes: FormulaValueType[];
}): FormulaValueType => {
  assertFormulaArgumentCountOrThrow({
    functionName,
    expectedCount: 2,
    actualCount: argumentTypes.length,
  });

  assertFormulaArgumentTypeOrThrow({
    functionName,
    argumentIndex: 0,
    actualType: argumentTypes[0],
    expectedType: 'TEXT',
  });

  assertFormulaArgumentTypeOrThrow({
    functionName,
    argumentIndex: 1,
    actualType: argumentTypes[1],
    expectedType: 'NUMBER',
  });

  return 'TEXT';
};
