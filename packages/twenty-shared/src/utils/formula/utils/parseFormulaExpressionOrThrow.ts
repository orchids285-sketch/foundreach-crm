import { FORMULA_AST_MAX_DEPTH } from '@/utils/formula/constants/FormulaAstMaxDepth';
import { FORMULA_EXPRESSION_MAX_LENGTH } from '@/utils/formula/constants/FormulaExpressionMaxLength';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { tokenizeFormulaExpressionOrThrow } from '@/utils/formula/utils/tokenizeFormulaExpressionOrThrow';
import {
  type FormulaAstNode,
  type FormulaBinaryOperator,
} from '@/utils/formula/types/FormulaAstNode';
import { type FormulaToken } from '@/utils/formula/types/FormulaToken';

const COMPARISON_OPERATORS: FormulaBinaryOperator[] = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
];

const KEYWORDS = ['AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL'];

const isKeyword = (token: FormulaToken | undefined, keyword: string): boolean =>
  token?.type === 'IDENTIFIER' && token.value.toUpperCase() === keyword;

export const parseFormulaExpressionOrThrow = (
  expression: string,
): FormulaAstNode => {
  if (expression.trim().length === 0) {
    throw createFormulaError({
      message: 'Expression is empty',
      code: 'FORMULA_PARSE_ERROR',
    });
  }

  if (expression.length > FORMULA_EXPRESSION_MAX_LENGTH) {
    throw createFormulaError({
      message: `Expression exceeds the maximum length of ${FORMULA_EXPRESSION_MAX_LENGTH} characters`,
      code: 'FORMULA_PARSE_ERROR',
    });
  }

  const tokens = tokenizeFormulaExpressionOrThrow(expression);
  let currentPosition = 0;

  const peekToken = (): FormulaToken | undefined => tokens[currentPosition];

  const consumeToken = (): FormulaToken => {
    const token = tokens[currentPosition];

    if (token === undefined) {
      throw createFormulaError({
        message: 'Unexpected end of expression',
        code: 'FORMULA_PARSE_ERROR',
      });
    }

    currentPosition += 1;

    return token;
  };

  const consumeExpectedTokenOrThrow = (
    expectedType: FormulaToken['type'],
  ): FormulaToken => {
    const token = consumeToken();

    if (token.type !== expectedType) {
      throw createFormulaError({
        message: `Expected ${expectedType} but found '${token.value}' at position ${token.position}`,
        code: 'FORMULA_PARSE_ERROR',
      });
    }

    return token;
  };

  const assertDepthOrThrow = (depth: number): void => {
    if (depth > FORMULA_AST_MAX_DEPTH) {
      throw createFormulaError({
        message: `Expression exceeds the maximum nesting depth of ${FORMULA_AST_MAX_DEPTH}`,
        code: 'FORMULA_PARSE_ERROR',
      });
    }
  };

  const parseOrExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    let left = parseAndExpression(depth);

    while (isKeyword(peekToken(), 'OR')) {
      consumeToken();
      left = {
        kind: 'binaryOperation',
        operator: 'OR',
        left,
        right: parseAndExpression(depth),
      };
    }

    return left;
  };

  const parseAndExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    let left = parseNotExpression(depth);

    while (isKeyword(peekToken(), 'AND')) {
      consumeToken();
      left = {
        kind: 'binaryOperation',
        operator: 'AND',
        left,
        right: parseNotExpression(depth),
      };
    }

    return left;
  };

  const parseNotExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    if (isKeyword(peekToken(), 'NOT')) {
      consumeToken();

      return {
        kind: 'unaryOperation',
        operator: 'NOT',
        operand: parseNotExpression(depth + 1),
      };
    }

    return parseComparisonExpression(depth);
  };

  const parseComparisonExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    let left = parseAdditiveExpression(depth);
    const token = peekToken();

    if (
      token?.type === 'OPERATOR' &&
      COMPARISON_OPERATORS.includes(token.value as FormulaBinaryOperator)
    ) {
      consumeToken();
      left = {
        kind: 'binaryOperation',
        operator: token.value as FormulaBinaryOperator,
        left,
        right: parseAdditiveExpression(depth),
      };
    }

    return left;
  };

  const parseAdditiveExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    let left = parseMultiplicativeExpression(depth);

    while (
      peekToken()?.type === 'OPERATOR' &&
      (peekToken()?.value === '+' || peekToken()?.value === '-')
    ) {
      const operator = consumeToken().value as FormulaBinaryOperator;

      left = {
        kind: 'binaryOperation',
        operator,
        left,
        right: parseMultiplicativeExpression(depth),
      };
    }

    return left;
  };

  const parseMultiplicativeExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    let left = parseUnaryExpression(depth);

    while (
      peekToken()?.type === 'OPERATOR' &&
      ['*', '/', '%'].includes(peekToken()?.value ?? '')
    ) {
      const operator = consumeToken().value as FormulaBinaryOperator;

      left = {
        kind: 'binaryOperation',
        operator,
        left,
        right: parseUnaryExpression(depth),
      };
    }

    return left;
  };

  const parseUnaryExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    if (peekToken()?.type === 'OPERATOR' && peekToken()?.value === '-') {
      consumeToken();

      return {
        kind: 'unaryOperation',
        operator: '-',
        operand: parseUnaryExpression(depth + 1),
      };
    }

    return parsePrimaryExpression(depth);
  };

  const parseFieldReferenceOrThrow = (token: FormulaToken): FormulaAstNode => {
    const nameParts = token.value.split('.');

    if (nameParts.length > 2 || nameParts.some((part) => part.length === 0)) {
      throw createFormulaError({
        message: `Invalid field reference '${token.value}' at position ${token.position}`,
        code: 'FORMULA_PARSE_ERROR',
      });
    }

    const [fieldName, subFieldName] = nameParts;

    return subFieldName === undefined
      ? { kind: 'fieldReference', fieldName }
      : { kind: 'fieldReference', fieldName, subFieldName };
  };

  const parsePrimaryExpression = (depth: number): FormulaAstNode => {
    assertDepthOrThrow(depth);

    const token = consumeToken();

    if (token.type === 'NUMBER_LITERAL') {
      return { kind: 'numberLiteral', value: Number(token.value) };
    }

    if (token.type === 'STRING_LITERAL') {
      return { kind: 'stringLiteral', value: token.value };
    }

    if (token.type === 'LEFT_PARENTHESIS') {
      const innerNode = parseOrExpression(depth + 1);

      consumeExpectedTokenOrThrow('RIGHT_PARENTHESIS');

      return innerNode;
    }

    if (token.type !== 'IDENTIFIER') {
      throw createFormulaError({
        message: `Unexpected token '${token.value}' at position ${token.position}`,
        code: 'FORMULA_PARSE_ERROR',
      });
    }

    if (isKeyword(token, 'TRUE') || isKeyword(token, 'FALSE')) {
      return {
        kind: 'booleanLiteral',
        value: token.value.toUpperCase() === 'TRUE',
      };
    }

    if (isKeyword(token, 'NULL')) {
      return { kind: 'nullLiteral' };
    }

    if (KEYWORDS.includes(token.value.toUpperCase())) {
      throw createFormulaError({
        message: `Unexpected keyword '${token.value}' at position ${token.position}`,
        code: 'FORMULA_PARSE_ERROR',
      });
    }

    if (peekToken()?.type !== 'LEFT_PARENTHESIS') {
      return parseFieldReferenceOrThrow(token);
    }

    consumeToken();

    const functionArguments: FormulaAstNode[] = [];

    if (peekToken()?.type !== 'RIGHT_PARENTHESIS') {
      functionArguments.push(parseOrExpression(depth + 1));

      while (peekToken()?.type === 'COMMA') {
        consumeToken();
        functionArguments.push(parseOrExpression(depth + 1));
      }
    }

    consumeExpectedTokenOrThrow('RIGHT_PARENTHESIS');

    return {
      kind: 'functionCall',
      functionName: token.value.toUpperCase(),
      arguments: functionArguments,
    };
  };

  const rootNode = parseOrExpression(0);
  const trailingToken = peekToken();

  if (trailingToken !== undefined) {
    throw createFormulaError({
      message: `Unexpected token '${trailingToken.value}' at position ${trailingToken.position}`,
      code: 'FORMULA_PARSE_ERROR',
    });
  }

  return rootNode;
};
