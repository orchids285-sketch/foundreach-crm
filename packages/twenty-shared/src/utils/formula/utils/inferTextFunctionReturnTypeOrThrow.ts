import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const inferTextFunctionReturnTypeOrThrow = ({
  functionName,
  argumentTypes,
  expectedCount,
  returnType,
}: {
  functionName: string;
  argumentTypes: FormulaValueType[];
  expectedCount: number;
  returnType: FormulaValueType;
}): FormulaValueType => {
  assertFormulaArgumentCountOrThrow({
    functionName,
    expectedCount,
    actualCount: argumentTypes.length,
  });

  assertFormulaArgumentTypeOrThrow({
    functionName,
    argumentIndex: 0,
    actualType: argumentTypes[0],
    expectedType: 'TEXT',
  });

  return returnType;
};
