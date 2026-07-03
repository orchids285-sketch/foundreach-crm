import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { type FormulaToken } from '@/utils/formula/types/FormulaToken';

const SINGLE_CHARACTER_OPERATORS = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '>',
  '<',
]);

const isDigit = (character: string): boolean =>
  character >= '0' && character <= '9';

const isIdentifierStart = (character: string): boolean =>
  /[a-zA-Z_]/.test(character);

const isIdentifierPart = (character: string): boolean =>
  /[a-zA-Z0-9_.]/.test(character);

export const tokenizeFormulaExpressionOrThrow = (
  expression: string,
): FormulaToken[] => {
  const tokens: FormulaToken[] = [];
  let position = 0;

  while (position < expression.length) {
    const character = expression[position];

    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if (isDigit(character)) {
      let endPosition = position;

      while (
        endPosition < expression.length &&
        /[0-9.]/.test(expression[endPosition])
      ) {
        endPosition += 1;
      }

      const rawNumber = expression.slice(position, endPosition);

      if (Number.isNaN(Number(rawNumber))) {
        throw createFormulaError({
          message: `Invalid number '${rawNumber}' at position ${position}`,
          code: 'FORMULA_PARSE_ERROR',
        });
      }

      tokens.push({ type: 'NUMBER_LITERAL', value: rawNumber, position });
      position = endPosition;
      continue;
    }

    if (character === '"' || character === "'") {
      const closingQuotePosition = expression.indexOf(character, position + 1);

      if (closingQuotePosition === -1) {
        throw createFormulaError({
          message: `Unterminated string starting at position ${position}`,
          code: 'FORMULA_PARSE_ERROR',
        });
      }

      tokens.push({
        type: 'STRING_LITERAL',
        value: expression.slice(position + 1, closingQuotePosition),
        position,
      });
      position = closingQuotePosition + 1;
      continue;
    }

    if (isIdentifierStart(character)) {
      let endPosition = position;

      while (
        endPosition < expression.length &&
        isIdentifierPart(expression[endPosition])
      ) {
        endPosition += 1;
      }

      tokens.push({
        type: 'IDENTIFIER',
        value: expression.slice(position, endPosition),
        position,
      });
      position = endPosition;
      continue;
    }

    if (character === '!' && expression[position + 1] === '=') {
      tokens.push({ type: 'OPERATOR', value: '!=', position });
      position += 2;
      continue;
    }

    if (
      (character === '>' || character === '<') &&
      expression[position + 1] === '='
    ) {
      tokens.push({ type: 'OPERATOR', value: `${character}=`, position });
      position += 2;
      continue;
    }

    if (SINGLE_CHARACTER_OPERATORS.has(character)) {
      tokens.push({ type: 'OPERATOR', value: character, position });
      position += 1;
      continue;
    }

    if (character === '(') {
      tokens.push({ type: 'LEFT_PARENTHESIS', value: character, position });
      position += 1;
      continue;
    }

    if (character === ')') {
      tokens.push({ type: 'RIGHT_PARENTHESIS', value: character, position });
      position += 1;
      continue;
    }

    if (character === ',') {
      tokens.push({ type: 'COMMA', value: character, position });
      position += 1;
      continue;
    }

    throw createFormulaError({
      message: `Unexpected character '${character}' at position ${position}`,
      code: 'FORMULA_PARSE_ERROR',
    });
  }

  return tokens;
};
