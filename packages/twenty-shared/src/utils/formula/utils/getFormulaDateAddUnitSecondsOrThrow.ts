import { FORMULA_DATE_ADD_UNIT_SECONDS } from '@/utils/formula/constants/FormulaDateAddUnitSeconds';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';

export const getFormulaDateAddUnitSecondsOrThrow = (
  unitNode: FormulaAstNode,
): number => {
  const supportedUnits = Object.keys(FORMULA_DATE_ADD_UNIT_SECONDS).join(', ');

  if (unitNode.kind !== 'stringLiteral') {
    throw createFormulaError({
      message: `DATE_ADD: argument 3 must be a string literal (${supportedUnits})`,
      code: 'FORMULA_TYPE_ERROR',
    });
  }

  const secondsPerUnit = FORMULA_DATE_ADD_UNIT_SECONDS[unitNode.value];

  if (!isDefined(secondsPerUnit)) {
    throw createFormulaError({
      message: `DATE_ADD: unknown unit '${unitNode.value}', expected one of ${supportedUnits}`,
      code: 'FORMULA_TYPE_ERROR',
    });
  }

  return secondsPerUnit;
};
