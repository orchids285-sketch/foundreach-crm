import { createFormulaError } from '@/utils/formula/utils/createFormulaError';

export const assertFormulaArgumentCountOrThrow = ({
  functionName,
  expectedCount,
  actualCount,
}: {
  functionName: string;
  expectedCount: number;
  actualCount: number;
}): void => {
  if (actualCount === expectedCount) {
    return;
  }

  throw createFormulaError({
    message: `${functionName} expects ${expectedCount} argument(s), got ${actualCount}`,
    code: 'FORMULA_TYPE_ERROR',
  });
};
