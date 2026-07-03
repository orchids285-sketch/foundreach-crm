import { assertFormulaArgumentTypeOrThrow } from '@/utils/formula/utils/assertFormulaArgumentTypeOrThrow';
import { computePostgresLeftSlice } from '@/utils/formula/utils/computePostgresLeftSlice';
import { computePostgresRightSlice } from '@/utils/formula/utils/computePostgresRightSlice';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { inferTextFunctionReturnTypeOrThrow } from '@/utils/formula/utils/inferTextFunctionReturnTypeOrThrow';
import { inferTextSliceFunctionReturnTypeOrThrow } from '@/utils/formula/utils/inferTextSliceFunctionReturnTypeOrThrow';
import { type FormulaFunctionDefinition } from '@/utils/formula/types/FormulaFunctionDefinition';

export const FORMULA_TEXT_FUNCTIONS: Record<string, FormulaFunctionDefinition> =
  {
    CONCAT: {
      inferReturnTypeOrThrow: (argumentTypes) => {
        if (argumentTypes.length < 2) {
          throw createFormulaError({
            message: `CONCAT expects at least 2 arguments, got ${argumentTypes.length}`,
            code: 'FORMULA_TYPE_ERROR',
          });
        }

        argumentTypes.forEach((argumentType, argumentIndex) =>
          assertFormulaArgumentTypeOrThrow({
            functionName: 'CONCAT',
            argumentIndex,
            actualType: argumentType,
            expectedType: 'TEXT',
          }),
        );

        return 'TEXT';
      },
      toPostgresSql: (argumentsSql) => `(${argumentsSql.join(' || ')})`,
      evaluate: (argumentValues) => {
        if (argumentValues.some((argumentValue) => argumentValue === null)) {
          return null;
        }

        return argumentValues.join('');
      },
    },
    UPPER: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextFunctionReturnTypeOrThrow({
          functionName: 'UPPER',
          argumentTypes,
          expectedCount: 1,
          returnType: 'TEXT',
        }),
      toPostgresSql: ([valueSql]) => `UPPER(${valueSql})`,
      evaluate: ([value]) =>
        typeof value === 'string' ? value.toUpperCase() : null,
    },
    LOWER: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextFunctionReturnTypeOrThrow({
          functionName: 'LOWER',
          argumentTypes,
          expectedCount: 1,
          returnType: 'TEXT',
        }),
      toPostgresSql: ([valueSql]) => `LOWER(${valueSql})`,
      evaluate: ([value]) =>
        typeof value === 'string' ? value.toLowerCase() : null,
    },
    TRIM: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextFunctionReturnTypeOrThrow({
          functionName: 'TRIM',
          argumentTypes,
          expectedCount: 1,
          returnType: 'TEXT',
        }),
      toPostgresSql: ([valueSql]) => `BTRIM(${valueSql})`,
      // BTRIM only strips spaces, unlike String.prototype.trim which strips all whitespace.
      evaluate: ([value]) =>
        typeof value === 'string' ? value.replace(/^ +| +$/g, '') : null,
    },
    LEFT: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextSliceFunctionReturnTypeOrThrow({
          functionName: 'LEFT',
          argumentTypes,
        }),
      toPostgresSql: ([valueSql, characterCountSql]) =>
        `LEFT(${valueSql}, (${characterCountSql})::integer)`,
      evaluate: ([value, characterCount]) => {
        if (typeof value !== 'string' || typeof characterCount !== 'number') {
          return null;
        }

        return computePostgresLeftSlice({ text: value, characterCount });
      },
    },
    RIGHT: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextSliceFunctionReturnTypeOrThrow({
          functionName: 'RIGHT',
          argumentTypes,
        }),
      toPostgresSql: ([valueSql, characterCountSql]) =>
        `RIGHT(${valueSql}, (${characterCountSql})::integer)`,
      evaluate: ([value, characterCount]) => {
        if (typeof value !== 'string' || typeof characterCount !== 'number') {
          return null;
        }

        return computePostgresRightSlice({ text: value, characterCount });
      },
    },
    LENGTH: {
      inferReturnTypeOrThrow: (argumentTypes) =>
        inferTextFunctionReturnTypeOrThrow({
          functionName: 'LENGTH',
          argumentTypes,
          expectedCount: 1,
          returnType: 'NUMBER',
        }),
      toPostgresSql: ([valueSql]) => `LENGTH(${valueSql})::double precision`,
      evaluate: ([value]) => (typeof value === 'string' ? value.length : null),
    },
  };
