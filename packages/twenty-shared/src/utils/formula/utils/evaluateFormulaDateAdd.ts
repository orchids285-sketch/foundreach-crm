import { FORMULA_DATE_ADD_UNIT_SECONDS } from '@/utils/formula/constants/FormulaDateAddUnitSeconds';
import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaValue } from '@/utils/formula/types/FormulaValue';

export const evaluateFormulaDateAdd = ([
  date,
  amount,
  unit,
]: FormulaValue[]): FormulaValue => {
  if (
    !(date instanceof Date) ||
    typeof amount !== 'number' ||
    typeof unit !== 'string'
  ) {
    return null;
  }

  const secondsPerUnit = FORMULA_DATE_ADD_UNIT_SECONDS[unit];

  if (!isDefined(secondsPerUnit)) {
    return null;
  }

  return new Date(date.getTime() + amount * secondsPerUnit * 1000);
};
