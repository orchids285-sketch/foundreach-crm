import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { evaluateFormulaDateAdd } from '@/utils/formula/utils/evaluateFormulaDateAdd';
import { getFormulaDateAddUnitSecondsOrThrow } from '@/utils/formula/utils/getFormulaDateAddUnitSecondsOrThrow';
import { inferDatePartFunctionReturnTypeOrThrow } from '@/utils/formula/utils/inferDatePartFunctionReturnTypeOrThrow';
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
      // AT TIME ZONE with a constant zone keeps the expression immutable for generated columns.
      toPostgresSql: ([laterDateSql, earlierDateSql]) =>
        `((EXTRACT(EPOCH FROM ((${laterDateSql}) AT TIME ZONE 'UTC')) - EXTRACT(EPOCH FROM ((${earlierDateSql}) AT TIME ZONE 'UTC'))) / 86400.0)`,
      evaluate: ([laterDate, earlierDate]) => {
        if (!(laterDate instanceof Date) || !(earlierDate instanceof Date)) {
          return null;
        }

        return (laterDate.getTime() - earlierDate.getTime()) / 86_400_000;
      },
    },
    HOURS_BETWEEN: {
      inferReturnTypeOrThrow: (argumentTypes) => {
        assertFormulaArgumentCountOrThrow({
          functionName: 'HOURS_BETWEEN',
          expectedCount: 2,
          actualCount: argumentTypes.length,
        });

        argumentTypes.forEach((argumentType, argumentIndex) =>
          assertFormulaArgumentTypeOrThrow({
            functionName: 'HOURS_BETWEEN',
            argumentIndex,
            actualType: argumentType,
            expectedType: 'DATE_TIME',
          }),
        );

        return 'NUMBER';
      },
      toPostgresSql: ([laterDateSql, earlierDateSql]) =>
        `((EXTRACT(EPOCH FROM ((${laterDateSql}) AT TIME ZONE 'UTC')) - EXTRACT(EPOCH FROM ((${earlierDateSql}) AT TIME ZONE 'UTC'))) / 3600.0)`,
      evaluate: ([laterDate, earlierDate]) => {
        if (!(laterDate instanceof Date) || !(earlierDate instanceof Date)) {
          return null;
        }

        return (laterDate.getTime() - earlierDate.getTime()) / 3_600_000;
      },
    },
    DATE_ADD: {
      inferReturnTypeOrThrow: (argumentTypes, argumentNodes) => {
        assertFormulaArgumentCountOrThrow({
          functionName: 'DATE_ADD',
          expectedCount: 3,
          actualCount: argumentTypes.length,
        });

        assertFormulaArgumentTypeOrThrow({
          functionName: 'DATE_ADD',
          argumentIndex: 0,
          actualType: argumentTypes[0],
          expectedType: 'DATE_TIME',
        });

        assertFormulaArgumentTypeOrThrow({
          functionName: 'DATE_ADD',
          argumentIndex: 1,
          actualType: argumentTypes[1],
          expectedType: 'NUMBER',
        });

        getFormulaDateAddUnitSecondsOrThrow(argumentNodes[2]);

        return 'DATE_TIME';
      },
      toPostgresSql: ([dateSql, amountSql], _argumentTypes, argumentNodes) =>
        `TO_TIMESTAMP(EXTRACT(EPOCH FROM ((${dateSql}) AT TIME ZONE 'UTC')) + ((${amountSql}) * ${getFormulaDateAddUnitSecondsOrThrow(argumentNodes[2])}))`,
      evaluate: (argumentValues) => evaluateFormulaDateAdd(argumentValues),
    },
    YEAR: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferDatePartFunctionReturnTypeOrThrow({
          functionName: 'YEAR',
          argumentTypes,
        }),
      // AT TIME ZONE with a constant zone keeps the expression immutable for generated columns.
      toPostgresSql: ([dateSql]) =>
        `EXTRACT(YEAR FROM ((${dateSql}) AT TIME ZONE 'UTC'))`,
      evaluate: ([date]) =>
        date instanceof Date ? date.getUTCFullYear() : null,
    },
    MONTH: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferDatePartFunctionReturnTypeOrThrow({
          functionName: 'MONTH',
          argumentTypes,
        }),
      toPostgresSql: ([dateSql]) =>
        `EXTRACT(MONTH FROM ((${dateSql}) AT TIME ZONE 'UTC'))`,
      evaluate: ([date]) =>
        date instanceof Date ? date.getUTCMonth() + 1 : null,
    },
    DAY: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferDatePartFunctionReturnTypeOrThrow({
          functionName: 'DAY',
          argumentTypes,
        }),
      toPostgresSql: ([dateSql]) =>
        `EXTRACT(DAY FROM ((${dateSql}) AT TIME ZONE 'UTC'))`,
      evaluate: ([date]) => (date instanceof Date ? date.getUTCDate() : null),
    },
  };
