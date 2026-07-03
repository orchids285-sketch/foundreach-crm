import { parseFormulaExpressionOrThrow } from '@/utils/formula/utils/parseFormulaExpressionOrThrow';
import { transpileFormulaToPostgresExpressionOrThrow } from '@/utils/formula/utils/transpileFormulaToPostgresExpressionOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

const FIELD_REFERENCE_TYPES: Record<string, FormulaValueType> = {
  amount: 'NUMBER',
  cost: 'NUMBER',
  name: 'TEXT',
  isActive: 'BOOLEAN',
  closedAt: 'DATE_TIME',
  createdAt: 'DATE_TIME',
  'revenue.amountMicros': 'NUMBER',
};

const COLUMN_NAME_BY_FIELD_REFERENCE_KEY: Record<string, string> = {
  amount: 'amount',
  cost: 'cost',
  name: 'name',
  isActive: 'isActive',
  closedAt: 'closedAt',
  createdAt: 'createdAt',
  'revenue.amountMicros': 'revenueAmountMicros',
};

const transpile = (expression: string): string =>
  transpileFormulaToPostgresExpressionOrThrow({
    node: parseFormulaExpressionOrThrow(expression),
    fieldReferenceTypes: FIELD_REFERENCE_TYPES,
    columnNameByFieldReferenceKey: COLUMN_NAME_BY_FIELD_REFERENCE_KEY,
  });

describe('transpileFormulaToPostgresExpressionOrThrow', () => {
  it('should transpile arithmetic over quoted column names', () => {
    expect(transpile('amount - cost')).toBe('("amount" - "cost")');
  });

  it('should map a composite sub-field reference to its flattened column', () => {
    expect(transpile('revenue.amountMicros / 1000000')).toBe(
      '("revenueAmountMicros" / NULLIF(1000000, 0))',
    );
  });

  it('should guard division by zero with NULLIF', () => {
    expect(transpile('amount / cost')).toBe('("amount" / NULLIF("cost", 0))');
  });

  it('should transpile IF to CASE WHEN', () => {
    expect(transpile('IF(isActive, 1, 0)')).toBe(
      'CASE WHEN "isActive" THEN 1 ELSE 0 END',
    );
  });

  it('should treat empty text as blank in ISBLANK', () => {
    expect(transpile('ISBLANK(name)')).toBe(`("name" IS NULL OR "name" = '')`);
  });

  it('should use plain null check in ISBLANK for non-text arguments', () => {
    expect(transpile('ISBLANK(closedAt)')).toBe('("closedAt" IS NULL)');
  });

  it('should escape single quotes inside string literals', () => {
    expect(transpile(`CONCAT(name, "it's")`)).toBe(`("name" || 'it''s')`);
  });

  it('should transpile date difference to an epoch subtraction', () => {
    expect(transpile('DAYS_BETWEEN(closedAt, createdAt)')).toBe(
      '((EXTRACT(EPOCH FROM ("closedAt")) - EXTRACT(EPOCH FROM ("createdAt"))) / 86400.0)',
    );
  });

  it('should cast ROUND through numeric and back to double precision', () => {
    expect(transpile('ROUND(amount * 0.88, 2)')).toBe(
      'ROUND((("amount" * 0.88))::numeric, (2)::integer)::double precision',
    );
  });

  it('should not let a string literal break out of the expression', () => {
    expect(transpile(`CONCAT(name, "'); DROP TABLE company; --")`)).toBe(
      `("name" || '''); DROP TABLE company; --')`,
    );
  });

  it('should reject a field reference with no column mapping', () => {
    expect(() =>
      transpileFormulaToPostgresExpressionOrThrow({
        node: parseFormulaExpressionOrThrow('amount'),
        fieldReferenceTypes: { amount: 'NUMBER' },
        columnNameByFieldReferenceKey: {},
      }),
    ).toThrow("Unknown field 'amount'");
  });
});
