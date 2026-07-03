import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const assertFormulaArgumentTypeOrThrow = ({
  functionName,
  argumentIndex,
  actualType,
  expectedType,
}: {
  functionName: string;
  argumentIndex: number;
  actualType: FormulaValueType;
  expectedType: FormulaValueType;
}): void => {
  if (actualType === 'NULL' || actualType === expectedType) {
    return;
  }

  throw createFormulaError({
    message: `${functionName}: argument ${argumentIndex + 1} must be ${expectedType}, got ${actualType}`,
    code: 'FORMULA_TYPE_ERROR',
  });
};
