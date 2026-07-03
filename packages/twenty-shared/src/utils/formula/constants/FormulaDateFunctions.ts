import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { type FormulaFunctionDefinition } from '@/utils/formula/types/FormulaFunctionDefinition';

export const FORMULA_DATE_FUNCTIONS: Record<string, FormulaFunctionDefinition> =
  {
    DAYS_BETWEEN: {
      inferReturnTypeOrThrow: (argumentTypes) => {
        assertFormulaArgumentCountOrThrow({
          functionName: 'DAYS_BETWEEN',
          expectedCount: 2,
          actualCount: argumentTypes.length,
        });

        argumentTypes.forEach((argumentType, argumentIndex) =>
          assertFormulaArgumentTypeOrThrow({
            functionName: 'DAYS_BETWEEN',
            argumentIndex,
            actualType: argumentType,
            expectedType: 'DATE_TIME',
          }),
        );

        return 'NUMBER';
      },
      toPostgresSql: ([laterDateSql, earlierDateSql]) =>
        `((EXTRACT(EPOCH FROM (${laterDateSql})) - EXTRACT(EPOCH FROM (${earlierDateSql}))) / 86400.0)`,
      evaluate: ([laterDate, earlierDate]) => {
        if (!(laterDate instanceof Date) || !(earlierDate instanceof Date)) {
          return null;
        }

        return (laterDate.getTime() - earlierDate.getTime()) / 86_400_000;
      },
    },
  };
