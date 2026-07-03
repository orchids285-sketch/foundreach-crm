import { evaluateFormulaOrThrow } from '@/utils/formula/utils/evaluateFormulaOrThrow';
import { parseFormulaExpressionOrThrow } from '@/utils/formula/utils/parseFormulaExpressionOrThrow';
import { type FormulaValue } from '@/utils/formula/types/FormulaValue';

const evaluate = (
  expression: string,
  fieldValuesByFieldReferenceKey: Record<string, FormulaValue> = {},
): FormulaValue =>
  evaluateFormulaOrThrow({
    node: parseFormulaExpressionOrThrow(expression),
    fieldValuesByFieldReferenceKey,
  });

describe('evaluateFormulaOrThrow', () => {
  it('should evaluate arithmetic with field values', () => {
    expect(evaluate('amount * 0.5 + 10', { amount: 100 })).toBe(60);
  });

  it('should propagate null through arithmetic like Postgres', () => {
    expect(evaluate('amount + 1', { amount: null })).toBeNull();
  });

  it('should return null on division by zero, mirroring the NULLIF guard', () => {
    expect(evaluate('amount / cost', { amount: 10, cost: 0 })).toBeNull();
  });

  it('should apply Postgres three-valued logic to AND', () => {
    expect(
      evaluate('isActive AND isPaid', { isActive: false, isPaid: null }),
    ).toBe(false);
    expect(
      evaluate('isActive AND isPaid', { isActive: true, isPaid: null }),
    ).toBeNull();
  });

  it('should apply Postgres three-valued logic to OR', () => {
    expect(
      evaluate('isActive OR isPaid', { isActive: true, isPaid: null }),
    ).toBe(true);
    expect(
      evaluate('isActive OR isPaid', { isActive: false, isPaid: null }),
    ).toBeNull();
  });

  it('should send a null IF condition to the else branch like CASE WHEN', () => {
    expect(evaluate('IF(isActive, "yes", "no")', { isActive: null })).toBe(
      'no',
    );
  });

  it('should round half away from zero like Postgres numeric ROUND', () => {
    expect(evaluate('ROUND(amount, 0)', { amount: -2.5 })).toBe(-3);
    expect(evaluate('ROUND(amount, 0)', { amount: 2.5 })).toBe(3);
  });

  it('should compare dates chronologically', () => {
    expect(
      evaluate('closedAt > createdAt', {
        closedAt: new Date('2026-07-04T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toBe(true);
  });

  it('should compute fractional days between dates', () => {
    expect(
      evaluate('DAYS_BETWEEN(closedAt, createdAt)', {
        closedAt: new Date('2026-01-02T12:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toBe(1.5);
  });

  it('should treat empty text as blank in BLANKVALUE', () => {
    expect(evaluate('BLANKVALUE(name, "unknown")', { name: '' })).toBe(
      'unknown',
    );
    expect(evaluate('BLANKVALUE(name, "unknown")', { name: 'Acme' })).toBe(
      'Acme',
    );
  });

  it('should propagate null through CONCAT like the || operator', () => {
    expect(
      evaluate('CONCAT(firstName, " ", lastName)', {
        firstName: 'Ada',
        lastName: null,
      }),
    ).toBeNull();
  });

  it('should evaluate composite sub-field references', () => {
    expect(
      evaluate('revenue.amountMicros / 1000000', {
        'revenue.amountMicros': 42_000_000,
      }),
    ).toBe(42);
  });

  it('should throw on a field with no provided value', () => {
    expect(() => evaluate('amount + 1')).toThrow(
      "Missing value for field 'amount'",
    );
  });
});
