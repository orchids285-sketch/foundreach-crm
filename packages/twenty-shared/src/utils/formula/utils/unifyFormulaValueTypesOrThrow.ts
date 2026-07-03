import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const unifyFormulaValueTypesOrThrow = ({
  firstType,
  secondType,
  context,
}: {
  firstType: FormulaValueType;
  secondType: FormulaValueType;
  context: string;
}): FormulaValueType => {
  if (firstType === 'NULL') {
    return secondType;
  }

  if (secondType === 'NULL' || firstType === secondType) {
    return firstType;
  }

  throw createFormulaError({
    message: `${context}: types ${firstType} and ${secondType} are incompatible`,
    code: 'FORMULA_TYPE_ERROR',
  });
};
