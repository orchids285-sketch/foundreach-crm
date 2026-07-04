import { type FormulaValue } from '@/utils/formula/types/FormulaValue';

export const evaluateFormulaNumericAggregate = ({
  argumentValues,
  aggregate,
}: {
  argumentValues: FormulaValue[];
  aggregate: (...values: number[]) => number;
}): FormulaValue => {
  const numericValues = argumentValues.filter(
    (argumentValue): argumentValue is number =>
      typeof argumentValue === 'number',
  );

  if (numericValues.length === 0) {
    return null;
  }

  return aggregate(...numericValues);
};
