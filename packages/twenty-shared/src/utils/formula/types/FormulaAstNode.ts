export type FormulaBinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'AND'
  | 'OR';

export type FormulaUnaryOperator = '-' | 'NOT';

export type FormulaFieldReferenceNode = {
  kind: 'fieldReference';
  fieldName: string;
  subFieldName?: string;
};

export type FormulaAstNode =
  | { kind: 'numberLiteral'; value: number }
  | { kind: 'stringLiteral'; value: string }
  | { kind: 'booleanLiteral'; value: boolean }
  | { kind: 'nullLiteral' }
  | FormulaFieldReferenceNode
  | {
      kind: 'unaryOperation';
      operator: FormulaUnaryOperator;
      operand: FormulaAstNode;
    }
  | {
      kind: 'binaryOperation';
      operator: FormulaBinaryOperator;
      left: FormulaAstNode;
      right: FormulaAstNode;
    }
  | {
      kind: 'functionCall';
      functionName: string;
      arguments: FormulaAstNode[];
    };
