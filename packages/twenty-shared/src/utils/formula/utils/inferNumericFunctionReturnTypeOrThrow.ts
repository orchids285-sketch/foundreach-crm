import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const inferNumericFunctionReturnTypeOrThrow = ({
  functionName,
  argumentTypes,
  expectedCount,
}: {
  functionName: string;
  argumentTypes: FormulaValueType[];
  expectedCount: number;
}): FormulaValueType => {
  assertFormulaArgumentCountOrThrow({
    functionName,
    expectedCount,
    actualCount: argumentTypes.length,
  });

  argumentTypes.forEach((argumentType, argumentIndex) =>
    assertFormulaArgumentTypeOrThrow({
      functionName,
      argumentIndex,
      actualType: argumentType,
      expectedType: 'NUMBER',
    }),
  );

  return 'NUMBER';
};
