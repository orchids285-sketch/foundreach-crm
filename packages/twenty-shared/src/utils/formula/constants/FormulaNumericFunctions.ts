import { evaluateFormulaNumericAggregate } from '@/utils/formula/utils/evaluateFormulaNumericAggregate';
import { inferNumericFunctionReturnTypeOrThrow } from '@/utils/formula/utils/inferNumericFunctionReturnTypeOrThrow';
import { inferVariadicNumericFunctionReturnTypeOrThrow } from '@/utils/formula/utils/inferVariadicNumericFunctionReturnTypeOrThrow';
import { roundHalfAwayFromZero } from '@/utils/formula/utils/roundHalfAwayFromZero';
import { type FormulaFunctionDefinition } from '@/utils/formula/types/FormulaFunctionDefinition';

export const FORMULA_NUMERIC_FUNCTIONS: Record<
  string,
  FormulaFunctionDefinition
> = {
  ROUND: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferNumericFunctionReturnTypeOrThrow({
        functionName: 'ROUND',
        argumentTypes,
        expectedCount: 2,
      }),
    toPostgresSql: ([valueSql, decimalCountSql]) =>
      `ROUND((${valueSql})::numeric, (${decimalCountSql})::integer)::double precision`,
    evaluate: ([value, decimalCount]) => {
      if (typeof value !== 'number' || typeof decimalCount !== 'number') {
        return null;
      }

      return roundHalfAwayFromZero({ value, decimalCount });
    },
  },
  ABS: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferNumericFunctionReturnTypeOrThrow({
        functionName: 'ABS',
        argumentTypes,
        expectedCount: 1,
      }),
    toPostgresSql: ([valueSql]) => `ABS(${valueSql})`,
    evaluate: ([value]) => (typeof value === 'number' ? Math.abs(value) : null),
  },
  FLOOR: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferNumericFunctionReturnTypeOrThrow({
        functionName: 'FLOOR',
        argumentTypes,
        expectedCount: 1,
      }),
    toPostgresSql: ([valueSql]) => `FLOOR(${valueSql})`,
    evaluate: ([value]) =>
      typeof value === 'number' ? Math.floor(value) : null,
  },
  CEIL: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferNumericFunctionReturnTypeOrThrow({
        functionName: 'CEIL',
        argumentTypes,
        expectedCount: 1,
      }),
    toPostgresSql: ([valueSql]) => `CEIL(${valueSql})`,
    evaluate: ([value]) =>
      typeof value === 'number' ? Math.ceil(value) : null,
  },
  MIN: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferVariadicNumericFunctionReturnTypeOrThrow({
        functionName: 'MIN',
        argumentTypes,
      }),
    toPostgresSql: (argumentsSql) => `LEAST(${argumentsSql.join(', ')})`,
    // LEAST ignores null arguments and is null only when every argument is null.
    evaluate: (argumentValues) =>
      evaluateFormulaNumericAggregate({ argumentValues, aggregate: Math.min }),
  },
  MAX: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferVariadicNumericFunctionReturnTypeOrThrow({
        functionName: 'MAX',
        argumentTypes,
      }),
    toPostgresSql: (argumentsSql) => `GREATEST(${argumentsSql.join(', ')})`,
    // GREATEST ignores null arguments and is null only when every argument is null.
    evaluate: (argumentValues) =>
      evaluateFormulaNumericAggregate({ argumentValues, aggregate: Math.max }),
  },
};
