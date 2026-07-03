export type FormulaTokenType =
  | 'NUMBER_LITERAL'
  | 'STRING_LITERAL'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LEFT_PARENTHESIS'
  | 'RIGHT_PARENTHESIS'
  | 'COMMA';

export type FormulaToken = {
  type: FormulaTokenType;
  value: string;
  position: number;
};
