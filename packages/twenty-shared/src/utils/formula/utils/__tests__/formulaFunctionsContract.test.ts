import { FORMULA_FUNCTIONS } from '@/utils/formula/constants/FormulaFunctions';
import { evaluateFormulaOrThrow } from '@/utils/formula/utils/evaluateFormulaOrThrow';
import { parseFormulaExpressionOrThrow } from '@/utils/formula/utils/parseFormulaExpressionOrThrow';
import { transpileFormulaToPostgresExpressionOrThrow } from '@/utils/formula/utils/transpileFormulaToPostgresExpressionOrThrow';
import { type FormulaValue } from '@/utils/formula/types/FormulaValue';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

const FIELD_REFERENCE_TYPES: Record<string, FormulaValueType> = {
  amount: 'NUMBER',
  cost: 'NUMBER',
  name: 'TEXT',
  label: 'TEXT',
  isActive: 'BOOLEAN',
  closedAt: 'DATE_TIME',
  createdAt: 'DATE_TIME',
};

const COLUMN_NAME_BY_FIELD_REFERENCE_KEY: Record<string, string> = {
  amount: 'amount',
  cost: 'cost',
  name: 'name',
  label: 'label',
  isActive: 'isActive',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
};

type FormulaFunctionContractCase = {
  expression: string;
  fieldValues: Record<string, FormulaValue>;
  expectedValue: FormulaValue;
  expectedSqlFragment: string;
};

const CONTRACT_CASES_BY_FUNCTION_NAME: Record<
  string,
  FormulaFunctionContractCase[]
> = {
  IF: [
    {
      expression: 'IF(isActive, "yes", "no")',
      fieldValues: { isActive: true },
      expectedValue: 'yes',
      expectedSqlFragment: `CASE WHEN "isActive" THEN 'yes' ELSE 'no' END`,
    },
    {
      expression: 'IF(isActive, "yes", "no")',
      fieldValues: { isActive: null },
      expectedValue: 'no',
      expectedSqlFragment: `CASE WHEN "isActive" THEN 'yes' ELSE 'no' END`,
    },
  ],
  ISBLANK: [
    {
      expression: 'ISBLANK(name)',
      fieldValues: { name: 'Acme' },
      expectedValue: false,
      expectedSqlFragment: `("name" IS NULL OR "name" = '')`,
    },
    {
      expression: 'ISBLANK(name)',
      fieldValues: { name: null },
      expectedValue: true,
      expectedSqlFragment: `("name" IS NULL OR "name" = '')`,
    },
  ],
  BLANKVALUE: [
    {
      expression: 'BLANKVALUE(name, "unknown")',
      fieldValues: { name: 'Acme' },
      expectedValue: 'Acme',
      expectedSqlFragment: `COALESCE(NULLIF("name", ''), 'unknown')`,
    },
    {
      expression: 'BLANKVALUE(name, "unknown")',
      fieldValues: { name: null },
      expectedValue: 'unknown',
      expectedSqlFragment: `COALESCE(NULLIF("name", ''), 'unknown')`,
    },
  ],
  SWITCH: [
    {
      expression: 'SWITCH(name, "small", 1, "large", 2, 0)',
      fieldValues: { name: 'large' },
      expectedValue: 2,
      expectedSqlFragment: `CASE "name" WHEN 'small' THEN 1 WHEN 'large' THEN 2 ELSE 0 END`,
    },
    {
      expression: 'SWITCH(name, "small", 1, "large", 2, 0)',
      fieldValues: { name: 'other' },
      expectedValue: 0,
      expectedSqlFragment: `CASE "name" WHEN 'small' THEN 1 WHEN 'large' THEN 2 ELSE 0 END`,
    },
    {
      expression: 'SWITCH(name, "small", 1, "large", 2, 0)',
      fieldValues: { name: null },
      expectedValue: 0,
      expectedSqlFragment: `CASE "name" WHEN 'small' THEN 1 WHEN 'large' THEN 2 ELSE 0 END`,
    },
    {
      expression: 'SWITCH(name, "small", 1)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: `CASE "name" WHEN 'small' THEN 1 ELSE NULL END`,
    },
  ],
  ROUND: [
    {
      expression: 'ROUND(amount, 0)',
      fieldValues: { amount: 2.5 },
      expectedValue: 3,
      expectedSqlFragment:
        'ROUND(("amount")::numeric, (0)::integer)::double precision',
    },
    {
      expression: 'ROUND(amount, 0)',
      fieldValues: { amount: null },
      expectedValue: null,
      expectedSqlFragment:
        'ROUND(("amount")::numeric, (0)::integer)::double precision',
    },
  ],
  ABS: [
    {
      expression: 'ABS(amount)',
      fieldValues: { amount: -5 },
      expectedValue: 5,
      expectedSqlFragment: 'ABS("amount")',
    },
    {
      expression: 'ABS(amount)',
      fieldValues: { amount: null },
      expectedValue: null,
      expectedSqlFragment: 'ABS("amount")',
    },
  ],
  FLOOR: [
    {
      expression: 'FLOOR(amount)',
      fieldValues: { amount: 1.7 },
      expectedValue: 1,
      expectedSqlFragment: 'FLOOR("amount")',
    },
    {
      expression: 'FLOOR(amount)',
      fieldValues: { amount: null },
      expectedValue: null,
      expectedSqlFragment: 'FLOOR("amount")',
    },
  ],
  CEIL: [
    {
      expression: 'CEIL(amount)',
      fieldValues: { amount: 1.2 },
      expectedValue: 2,
      expectedSqlFragment: 'CEIL("amount")',
    },
    {
      expression: 'CEIL(amount)',
      fieldValues: { amount: null },
      expectedValue: null,
      expectedSqlFragment: 'CEIL("amount")',
    },
  ],
  MIN: [
    {
      expression: 'MIN(amount, cost)',
      fieldValues: { amount: 3, cost: 7 },
      expectedValue: 3,
      expectedSqlFragment: 'LEAST("amount", "cost")',
    },
    {
      expression: 'MIN(amount, cost)',
      fieldValues: { amount: null, cost: 7 },
      expectedValue: 7,
      expectedSqlFragment: 'LEAST("amount", "cost")',
    },
  ],
  MAX: [
    {
      expression: 'MAX(amount, cost)',
      fieldValues: { amount: 3, cost: 7 },
      expectedValue: 7,
      expectedSqlFragment: 'GREATEST("amount", "cost")',
    },
    {
      expression: 'MAX(amount, cost)',
      fieldValues: { amount: null, cost: null },
      expectedValue: null,
      expectedSqlFragment: 'GREATEST("amount", "cost")',
    },
  ],
  CONCAT: [
    {
      expression: 'CONCAT(name, label)',
      fieldValues: { name: 'Acme', label: 'Corp' },
      expectedValue: 'AcmeCorp',
      expectedSqlFragment: '("name" || "label")',
    },
    {
      expression: 'CONCAT(name, label)',
      fieldValues: { name: 'Acme', label: null },
      expectedValue: null,
      expectedSqlFragment: '("name" || "label")',
    },
  ],
  UPPER: [
    {
      expression: 'UPPER(name)',
      fieldValues: { name: 'acme' },
      expectedValue: 'ACME',
      expectedSqlFragment: 'UPPER("name")',
    },
    {
      expression: 'UPPER(name)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'UPPER("name")',
    },
  ],
  LOWER: [
    {
      expression: 'LOWER(name)',
      fieldValues: { name: 'ACME' },
      expectedValue: 'acme',
      expectedSqlFragment: 'LOWER("name")',
    },
    {
      expression: 'LOWER(name)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'LOWER("name")',
    },
  ],
  TRIM: [
    {
      expression: 'TRIM(name)',
      fieldValues: { name: '  Acme  ' },
      expectedValue: 'Acme',
      expectedSqlFragment: 'BTRIM("name")',
    },
    {
      expression: 'TRIM(name)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'BTRIM("name")',
    },
  ],
  LEFT: [
    {
      expression: 'LEFT(name, 2)',
      fieldValues: { name: 'Acme' },
      expectedValue: 'Ac',
      expectedSqlFragment: 'LEFT("name", (2)::integer)',
    },
    {
      expression: 'LEFT(name, 2)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'LEFT("name", (2)::integer)',
    },
  ],
  RIGHT: [
    {
      expression: 'RIGHT(name, 2)',
      fieldValues: { name: 'Acme' },
      expectedValue: 'me',
      expectedSqlFragment: 'RIGHT("name", (2)::integer)',
    },
    {
      expression: 'RIGHT(name, 2)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'RIGHT("name", (2)::integer)',
    },
  ],
  LENGTH: [
    {
      expression: 'LENGTH(name)',
      fieldValues: { name: 'Acme' },
      expectedValue: 4,
      expectedSqlFragment: 'LENGTH("name")::double precision',
    },
    {
      expression: 'LENGTH(name)',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: 'LENGTH("name")::double precision',
    },
  ],
  REPLACE: [
    {
      expression: 'REPLACE(name, "a", "o")',
      fieldValues: { name: 'banana' },
      expectedValue: 'bonono',
      expectedSqlFragment: `REPLACE("name", 'a', 'o')`,
    },
    {
      expression: 'REPLACE(name, "a", "o")',
      fieldValues: { name: null },
      expectedValue: null,
      expectedSqlFragment: `REPLACE("name", 'a', 'o')`,
    },
  ],
  DAYS_BETWEEN: [
    {
      expression: 'DAYS_BETWEEN(closedAt, createdAt)',
      fieldValues: {
        closedAt: new Date('2026-01-02T12:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      expectedValue: 1.5,
      expectedSqlFragment:
        '((EXTRACT(EPOCH FROM (("closedAt") AT TIME ZONE \'UTC\')) - EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\'))) / 86400.0)',
    },
    {
      expression: 'DAYS_BETWEEN(closedAt, createdAt)',
      fieldValues: {
        closedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      expectedValue: null,
      expectedSqlFragment:
        '((EXTRACT(EPOCH FROM (("closedAt") AT TIME ZONE \'UTC\')) - EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\'))) / 86400.0)',
    },
  ],
  HOURS_BETWEEN: [
    {
      expression: 'HOURS_BETWEEN(closedAt, createdAt)',
      fieldValues: {
        closedAt: new Date('2026-01-01T06:30:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      expectedValue: 6.5,
      expectedSqlFragment:
        '((EXTRACT(EPOCH FROM (("closedAt") AT TIME ZONE \'UTC\')) - EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\'))) / 3600.0)',
    },
    {
      expression: 'HOURS_BETWEEN(closedAt, createdAt)',
      fieldValues: {
        closedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      expectedValue: null,
      expectedSqlFragment:
        '((EXTRACT(EPOCH FROM (("closedAt") AT TIME ZONE \'UTC\')) - EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\'))) / 3600.0)',
    },
  ],
  DATE_ADD: [
    {
      expression: 'DATE_ADD(createdAt, 2, "days")',
      fieldValues: { createdAt: new Date('2026-01-01T00:00:00Z') },
      expectedValue: new Date('2026-01-03T00:00:00Z'),
      expectedSqlFragment:
        'TO_TIMESTAMP(EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\')) + ((2) * 86400))',
    },
    {
      expression: 'DATE_ADD(createdAt, 3, "hours")',
      fieldValues: { createdAt: new Date('2026-01-01T00:00:00Z') },
      expectedValue: new Date('2026-01-01T03:00:00Z'),
      expectedSqlFragment:
        'TO_TIMESTAMP(EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\')) + ((3) * 3600))',
    },
    {
      expression: 'DATE_ADD(createdAt, 2, "days")',
      fieldValues: { createdAt: null },
      expectedValue: null,
      expectedSqlFragment:
        'TO_TIMESTAMP(EXTRACT(EPOCH FROM (("createdAt") AT TIME ZONE \'UTC\')) + ((2) * 86400))',
    },
  ],
  YEAR: [
    {
      expression: 'YEAR(createdAt)',
      fieldValues: { createdAt: new Date('2026-03-15T00:00:00Z') },
      expectedValue: 2026,
      expectedSqlFragment: `EXTRACT(YEAR FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
    {
      expression: 'YEAR(createdAt)',
      fieldValues: { createdAt: null },
      expectedValue: null,
      expectedSqlFragment: `EXTRACT(YEAR FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
  ],
  MONTH: [
    {
      expression: 'MONTH(createdAt)',
      fieldValues: { createdAt: new Date('2026-03-15T00:00:00Z') },
      expectedValue: 3,
      expectedSqlFragment: `EXTRACT(MONTH FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
    {
      expression: 'MONTH(createdAt)',
      fieldValues: { createdAt: null },
      expectedValue: null,
      expectedSqlFragment: `EXTRACT(MONTH FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
  ],
  DAY: [
    {
      expression: 'DAY(createdAt)',
      fieldValues: { createdAt: new Date('2026-03-15T00:00:00Z') },
      expectedValue: 15,
      expectedSqlFragment: `EXTRACT(DAY FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
    {
      expression: 'DAY(createdAt)',
      fieldValues: { createdAt: null },
      expectedValue: null,
      expectedSqlFragment: `EXTRACT(DAY FROM (("createdAt") AT TIME ZONE \'UTC\'))`,
    },
  ],
};

describe('formula functions contract', () => {
  it('should have contract cases for every registered function', () => {
    expect(Object.keys(CONTRACT_CASES_BY_FUNCTION_NAME).sort()).toEqual(
      Object.keys(FORMULA_FUNCTIONS).sort(),
    );
  });

  describe.each(Object.entries(CONTRACT_CASES_BY_FUNCTION_NAME))(
    '%s',
    (_functionName, contractCases) => {
      it.each(contractCases)(
        'should produce $expectedValue for $expression with $fieldValues',
        ({ expression, fieldValues, expectedValue, expectedSqlFragment }) => {
          const node = parseFormulaExpressionOrThrow(expression);

          expect(
            evaluateFormulaOrThrow({
              node,
              fieldValuesByFieldReferenceKey: fieldValues,
            }),
          ).toEqual(expectedValue);

          expect(
            transpileFormulaToPostgresExpressionOrThrow({
              node,
              fieldReferenceTypes: FIELD_REFERENCE_TYPES,
              columnNameByFieldReferenceKey: COLUMN_NAME_BY_FIELD_REFERENCE_KEY,
            }),
          ).toContain(expectedSqlFragment);
        },
      );
    },
  );
});
