import { type FormulaValue } from '@/utils/formula/types/FormulaValue';

export const evaluateFormulaSwitch = (
  argumentValues: FormulaValue[],
): FormulaValue => {
  const [expressionValue, ...caseAndValues] = argumentValues;
  const hasDefaultValue = caseAndValues.length % 2 === 1;
  const defaultValue = hasDefaultValue
    ? caseAndValues[caseAndValues.length - 1]
    : null;
  const pairValues = hasDefaultValue
    ? caseAndValues.slice(0, -1)
    : caseAndValues;

  // CASE <expr> WHEN uses SQL equality, so a null expression matches no case.
  if (expressionValue === null) {
    return defaultValue;
  }

  const comparableExpressionValue =
    expressionValue instanceof Date
      ? expressionValue.getTime()
      : expressionValue;

  for (let pairIndex = 0; pairIndex < pairValues.length; pairIndex += 2) {
    const caseValue = pairValues[pairIndex];
    const comparableCaseValue =
      caseValue instanceof Date ? caseValue.getTime() : caseValue;

    if (comparableExpressionValue === comparableCaseValue) {
      return pairValues[pairIndex + 1];
    }
  }

  return defaultValue;
};
