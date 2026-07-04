import { assertFormulaArgumentCountOrThrow } from '@/utils/formula/utils/assertFormulaArgumentCountOrThrow';
import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { evaluateFormulaSwitch } from '@/utils/formula/utils/evaluateFormulaSwitch';
import { inferFormulaSwitchReturnTypeOrThrow } from '@/utils/formula/utils/inferFormulaSwitchReturnTypeOrThrow';
import { isBlankFormulaValue } from '@/utils/formula/utils/isBlankFormulaValue';
import { transpileFormulaSwitchToPostgresSql } from '@/utils/formula/utils/transpileFormulaSwitchToPostgresSql';
import { unifyFormulaValueTypesOrThrow } from '@/utils/formula/utils/unifyFormulaValueTypesOrThrow';
import { type FormulaFunctionDefinition } from '@/utils/formula/types/FormulaFunctionDefinition';

export const FORMULA_LOGICAL_FUNCTIONS: Record<
  string,
  FormulaFunctionDefinition
> = {
  IF: {
    inferReturnTypeOrThrow: (argumentTypes) => {
      assertFormulaArgumentCountOrThrow({
        functionName: 'IF',
        expectedCount: 3,
        actualCount: argumentTypes.length,
      });

      assertFormulaArgumentTypeOrThrow({
        functionName: 'IF',
        argumentIndex: 0,
        actualType: argumentTypes[0],
        expectedType: 'BOOLEAN',
      });

      return unifyFormulaValueTypesOrThrow({
        firstType: argumentTypes[1],
        secondType: argumentTypes[2],
        context: 'IF branches',
      });
    },
    toPostgresSql: ([conditionSql, thenSql, elseSql]) =>
      `CASE WHEN ${conditionSql} THEN ${thenSql} ELSE ${elseSql} END`,
    // CASE WHEN treats a null condition as false, so null falls through to the else branch.
    evaluate: ([condition, thenValue, elseValue]) =>
      condition === true ? thenValue : elseValue,
  },
  SWITCH: {
    inferReturnTypeOrThrow: (argumentTypes) =>
      inferFormulaSwitchReturnTypeOrThrow(argumentTypes),
    toPostgresSql: (argumentsSql) =>
      transpileFormulaSwitchToPostgresSql(argumentsSql),
    evaluate: (argumentValues) => evaluateFormulaSwitch(argumentValues),
  },
  ISBLANK: {
    inferReturnTypeOrThrow: (argumentTypes) => {
      assertFormulaArgumentCountOrThrow({
        functionName: 'ISBLANK',
        expectedCount: 1,
        actualCount: argumentTypes.length,
      });

      return 'BOOLEAN';
    },
    // Twenty TEXT columns default to '' rather than null, so blank means null or empty string.
    toPostgresSql: ([valueSql], [argumentType]) =>
      argumentType === 'TEXT'
        ? `(${valueSql} IS NULL OR ${valueSql} = '')`
        : `(${valueSql} IS NULL)`,
    evaluate: ([value]) => isBlankFormulaValue(value),
  },
  BLANKVALUE: {
    inferReturnTypeOrThrow: (argumentTypes) => {
      assertFormulaArgumentCountOrThrow({
        functionName: 'BLANKVALUE',
        expectedCount: 2,
        actualCount: argumentTypes.length,
      });

      return unifyFormulaValueTypesOrThrow({
        firstType: argumentTypes[0],
        secondType: argumentTypes[1],
        context: 'BLANKVALUE arguments',
      });
    },
    toPostgresSql: ([valueSql, fallbackSql], [argumentType]) =>
      argumentType === 'TEXT'
        ? `COALESCE(NULLIF(${valueSql}, ''), ${fallbackSql})`
        : `COALESCE(${valueSql}, ${fallbackSql})`,
    evaluate: ([value, fallbackValue]) =>
      isBlankFormulaValue(value) ? fallbackValue : value,
  },
};
