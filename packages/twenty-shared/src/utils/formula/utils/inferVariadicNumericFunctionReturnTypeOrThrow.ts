import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const inferVariadicNumericFunctionReturnTypeOrThrow = ({
  functionName,
  argumentTypes,
}: {
  functionName: string;
  argumentTypes: FormulaValueType[];
}): FormulaValueType => {
  if (argumentTypes.length < 2) {
    throw createFormulaError({
      message: `${functionName} expects at least 2 arguments, got ${argumentTypes.length}`,
      code: 'FORMULA_TYPE_ERROR',
    });
  }

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
