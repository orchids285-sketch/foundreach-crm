import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { unifyFormulaValueTypesOrThrow } from '@/utils/formula/utils/unifyFormulaValueTypesOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const inferFormulaSwitchReturnTypeOrThrow = (
  argumentTypes: FormulaValueType[],
): FormulaValueType => {
  if (argumentTypes.length < 3) {
    throw createFormulaError({
      message: `SWITCH expects at least 3 arguments, got ${argumentTypes.length}`,
      code: 'FORMULA_TYPE_ERROR',
    });
  }

  const caseAndValueTypes = argumentTypes.slice(1);
  const hasDefaultValue = caseAndValueTypes.length % 2 === 1;
  const pairTypes = hasDefaultValue
    ? caseAndValueTypes.slice(0, -1)
    : caseAndValueTypes;

  let caseType = argumentTypes[0];
  let returnType: FormulaValueType = hasDefaultValue
    ? caseAndValueTypes[caseAndValueTypes.length - 1]
    : 'NULL';

  for (let pairIndex = 0; pairIndex < pairTypes.length; pairIndex += 2) {
    caseType = unifyFormulaValueTypesOrThrow({
      firstType: caseType,
      secondType: pairTypes[pairIndex],
      context: 'SWITCH cases',
    });
    returnType = unifyFormulaValueTypesOrThrow({
      firstType: returnType,
      secondType: pairTypes[pairIndex + 1],
      context: 'SWITCH values',
    });
  }

  return returnType;
};
