import { parseFormulaExpressionOrThrow } from '@/utils/formula/utils/parseFormulaExpressionOrThrow';

describe('parseFormulaExpressionOrThrow', () => {
  it('should give multiplication precedence over addition', () => {
    expect(parseFormulaExpressionOrThrow('1 + 2 * 3')).toEqual({
      kind: 'binaryOperation',
      operator: '+',
      left: { kind: 'numberLiteral', value: 1 },
      right: {
        kind: 'binaryOperation',
        operator: '*',
        left: { kind: 'numberLiteral', value: 2 },
        right: { kind: 'numberLiteral', value: 3 },
      },
    });
  });

  it('should let parentheses override precedence', () => {
    expect(parseFormulaExpressionOrThrow('(1 + 2) * 3')).toEqual({
      kind: 'binaryOperation',
      operator: '*',
      left: {
        kind: 'binaryOperation',
        operator: '+',
        left: { kind: 'numberLiteral', value: 1 },
        right: { kind: 'numberLiteral', value: 2 },
      },
      right: { kind: 'numberLiteral', value: 3 },
    });
  });

  it('should parse a composite sub-field reference', () => {
    expect(parseFormulaExpressionOrThrow('amount.amountMicros')).toEqual({
      kind: 'fieldReference',
      fieldName: 'amount',
      subFieldName: 'amountMicros',
    });
  });

  it('should parse a function call with nested expressions as arguments', () => {
    expect(
      parseFormulaExpressionOrThrow('IF(amount > 10, "big", "small")'),
    ).toEqual({
      kind: 'functionCall',
      functionName: 'IF',
      arguments: [
        {
          kind: 'binaryOperation',
          operator: '>',
          left: { kind: 'fieldReference', fieldName: 'amount' },
          right: { kind: 'numberLiteral', value: 10 },
        },
        { kind: 'stringLiteral', value: 'big' },
        { kind: 'stringLiteral', value: 'small' },
      ],
    });
  });

  it('should bind AND tighter than OR', () => {
    expect(
      parseFormulaExpressionOrThrow('isActive OR isPrimary AND isPaid'),
    ).toEqual({
      kind: 'binaryOperation',
      operator: 'OR',
      left: { kind: 'fieldReference', fieldName: 'isActive' },
      right: {
        kind: 'binaryOperation',
        operator: 'AND',
        left: { kind: 'fieldReference', fieldName: 'isPrimary' },
        right: { kind: 'fieldReference', fieldName: 'isPaid' },
      },
    });
  });

  it('should parse keywords and function names case-insensitively', () => {
    expect(parseFormulaExpressionOrThrow('if(true, null, 1)')).toEqual({
      kind: 'functionCall',
      functionName: 'IF',
      arguments: [
        { kind: 'booleanLiteral', value: true },
        { kind: 'nullLiteral' },
        { kind: 'numberLiteral', value: 1 },
      ],
    });
  });

  it('should parse a unary minus', () => {
    expect(parseFormulaExpressionOrThrow('-amount + 5')).toEqual({
      kind: 'binaryOperation',
      operator: '+',
      left: {
        kind: 'unaryOperation',
        operator: '-',
        operand: { kind: 'fieldReference', fieldName: 'amount' },
      },
      right: { kind: 'numberLiteral', value: 5 },
    });
  });

  it.each([
    ['', 'empty expression'],
    ['1 +', 'dangling operator'],
    ['IF(1, 2', 'unclosed function call'],
    ['"unterminated', 'unterminated string'],
    ['amount..micros', 'invalid field reference'],
    ['1 2', 'trailing token'],
    ['foo@bar', 'unexpected character'],
  ])('should reject %p (%s)', (invalidExpression) => {
    expect(() => parseFormulaExpressionOrThrow(invalidExpression)).toThrow();
  });

  it('should count depth by actual nesting, not parser recursion', () => {
    expect(() =>
      parseFormulaExpressionOrThrow(
        'IF(employees > 1000, "Enterprise", IF(employees > 100, "Mid-Market", IF(employees > 10, "SMB", "Micro")))',
      ),
    ).not.toThrow();
  });

  it('should reject expressions nested beyond the maximum depth', () => {
    const deeplyNestedExpression = `${'('.repeat(30)}1${')'.repeat(30)}`;

    expect(() => parseFormulaExpressionOrThrow(deeplyNestedExpression)).toThrow(
      'maximum nesting depth',
    );
  });

  it('should reject expressions longer than the maximum length', () => {
    const oversizedExpression = `1 + ${'1 + '.repeat(600)}1`;

    expect(() => parseFormulaExpressionOrThrow(oversizedExpression)).toThrow(
      'maximum length',
    );
  });
});
