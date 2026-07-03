import { FORMULA_FUNCTIONS } from '@/utils/formula/constants/FormulaFunctions';
import { computeFormulaFieldReferenceKey } from '@/utils/formula/utils/computeFormulaFieldReferenceKey';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';
import { type FormulaValue } from '@/utils/formula/types/FormulaValue';

const toComparableValue = (value: number | string | boolean | Date) =>
  value instanceof Date ? value.getTime() : value;

const evaluateArithmeticOperation = ({
  operator,
  leftValue,
  rightValue,
}: {
  operator: '+' | '-' | '*' | '/' | '%';
  leftValue: number;
  rightValue: number;
}): number | null => {
  switch (operator) {
    case '+':
      return leftValue + rightValue;
    case '-':
      return leftValue - rightValue;
    case '*':
      return leftValue * rightValue;
    case '/':
      return rightValue === 0 ? null : leftValue / rightValue;
    case '%':
      return rightValue === 0 ? null : leftValue % rightValue;
  }
};

export const evaluateFormulaOrThrow = ({
  node,
  fieldValuesByFieldReferenceKey,
}: {
  node: FormulaAstNode;
  fieldValuesByFieldReferenceKey: Record<string, FormulaValue>;
}): FormulaValue => {
  const evaluateNode = (currentNode: FormulaAstNode): FormulaValue => {
    switch (currentNode.kind) {
      case 'numberLiteral':
        return currentNode.value;
      case 'stringLiteral':
        return currentNode.value;
      case 'booleanLiteral':
        return currentNode.value;
      case 'nullLiteral':
        return null;
      case 'fieldReference': {
        const fieldReferenceKey = computeFormulaFieldReferenceKey(currentNode);
        const fieldValue = fieldValuesByFieldReferenceKey[fieldReferenceKey];

        if (fieldValue === undefined) {
          throw createFormulaError({
            message: `Missing value for field '${fieldReferenceKey}'`,
            code: 'FORMULA_REFERENCE_ERROR',
          });
        }

        return fieldValue;
      }
      case 'unaryOperation': {
        const operandValue = evaluateNode(currentNode.operand);

        if (operandValue === null) {
          return null;
        }

        if (currentNode.operator === '-') {
          return typeof operandValue === 'number' ? -operandValue : null;
        }

        return typeof operandValue === 'boolean' ? !operandValue : null;
      }
      case 'binaryOperation': {
        const { operator } = currentNode;
        const leftValue = evaluateNode(currentNode.left);
        const rightValue = evaluateNode(currentNode.right);

        // Postgres three-valued logic: FALSE AND NULL = FALSE, TRUE OR NULL = TRUE.
        if (operator === 'AND') {
          if (leftValue === false || rightValue === false) {
            return false;
          }

          return leftValue === null || rightValue === null ? null : true;
        }

        if (operator === 'OR') {
          if (leftValue === true || rightValue === true) {
            return true;
          }

          return leftValue === null || rightValue === null ? null : false;
        }

        if (leftValue === null || rightValue === null) {
          return null;
        }

        if (
          operator === '+' ||
          operator === '-' ||
          operator === '*' ||
          operator === '/' ||
          operator === '%'
        ) {
          if (typeof leftValue !== 'number' || typeof rightValue !== 'number') {
            return null;
          }

          return evaluateArithmeticOperation({
            operator,
            leftValue,
            rightValue,
          });
        }

        const comparableLeftValue = toComparableValue(leftValue);
        const comparableRightValue = toComparableValue(rightValue);

        switch (operator) {
          case '=':
            return comparableLeftValue === comparableRightValue;
          case '!=':
            return comparableLeftValue !== comparableRightValue;
          case '>':
            return comparableLeftValue > comparableRightValue;
          case '>=':
            return comparableLeftValue >= comparableRightValue;
          case '<':
            return comparableLeftValue < comparableRightValue;
          case '<=':
            return comparableLeftValue <= comparableRightValue;
        }

        return null;
      }
      case 'functionCall': {
        const functionDefinition = FORMULA_FUNCTIONS[currentNode.functionName];

        if (!isDefined(functionDefinition)) {
          throw createFormulaError({
            message: `Unknown function '${currentNode.functionName}'`,
            code: 'FORMULA_PARSE_ERROR',
          });
        }

        return functionDefinition.evaluate(
          currentNode.arguments.map(evaluateNode),
        );
      }
    }
  };

  return evaluateNode(node);
};
