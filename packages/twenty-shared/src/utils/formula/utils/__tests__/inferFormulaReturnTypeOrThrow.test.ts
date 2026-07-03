import { inferFormulaReturnTypeOrThrow } from '@/utils/formula/utils/inferFormulaReturnTypeOrThrow';
import { parseFormulaExpressionOrThrow } from '@/utils/formula/utils/parseFormulaExpressionOrThrow';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

const FIELD_REFERENCE_TYPES: Record<string, FormulaValueType> = {
  amount: 'NUMBER',
  name: 'TEXT',
  isActive: 'BOOLEAN',
  closedAt: 'DATE_TIME',
  createdAt: 'DATE_TIME',
  'revenue.amountMicros': 'NUMBER',
};

const inferType = (expression: string): FormulaValueType =>
  inferFormulaReturnTypeOrThrow({
    node: parseFormulaExpressionOrThrow(expression),
    fieldReferenceTypes: FIELD_REFERENCE_TYPES,
  });

describe('inferFormulaReturnTypeOrThrow', () => {
  it.each([
    ['amount * 0.88', 'NUMBER'],
    ['CONCAT(name, "!")', 'TEXT'],
    ['amount > 10 AND isActive', 'BOOLEAN'],
    ['DAYS_BETWEEN(closedAt, createdAt)', 'NUMBER'],
    ['IF(isActive, "yes", "no")', 'TEXT'],
    ['closedAt > createdAt', 'BOOLEAN'],
    ['revenue.amountMicros / 1000000', 'NUMBER'],
    ['BLANKVALUE(name, "unknown")', 'TEXT'],
    ['IF(isActive, NULL, amount)', 'NUMBER'],
    ['NOT isActive', 'BOOLEAN'],
  ] as const)('should infer %p as %s', (expression, expectedType) => {
    expect(inferType(expression)).toBe(expectedType);
  });

  it.each([
    ['amount + name', 'text in arithmetic'],
    ['CONCAT(amount, name)', 'number passed to CONCAT'],
    ['IF(amount, 1, 2)', 'non-boolean IF condition'],
    ['IF(isActive, 1, "a")', 'mismatched IF branches'],
    ['isActive > amount', 'boolean compared with number'],
    ['NOT amount', 'NOT on a number'],
    ['ROUND(name, 2)', 'text passed to ROUND'],
  ])('should reject %p (%s)', (invalidExpression) => {
    expect(() => inferType(invalidExpression)).toThrow();
  });

  it('should reject a reference to an unknown field', () => {
    expect(() => inferType('unknownField + 1')).toThrow(
      "Unknown field 'unknownField'",
    );
  });

  it('should reject a call to an unknown function', () => {
    expect(() => inferType('MYSTERY(amount)')).toThrow(
      "Unknown function 'MYSTERY'",
    );
  });
});
