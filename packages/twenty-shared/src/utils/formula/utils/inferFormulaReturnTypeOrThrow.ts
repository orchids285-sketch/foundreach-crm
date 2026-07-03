import { FORMULA_FUNCTIONS } from '@/utils/formula/constants/FormulaFunctions';
import { computeFormulaFieldReferenceKey } from '@/utils/formula/utils/computeFormulaFieldReferenceKey';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { unifyFormulaValueTypesOrThrow } from '@/utils/formula/utils/unifyFormulaValueTypesOrThrow';
import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

const ARITHMETIC_OPERATORS = ['+', '-', '*', '/', '%'];
const ORDERING_OPERATORS = ['>', '>=', '<', '<='];
const ORDERABLE_TYPES: FormulaValueType[] = ['NUMBER', 'TEXT', 'DATE_TIME'];

export const inferFormulaReturnTypeOrThrow = ({
  node,
  fieldReferenceTypes,
}: {
  node: FormulaAstNode;
  fieldReferenceTypes: Record<string, FormulaValueType>;
}): FormulaValueType => {
  const inferNodeType = (currentNode: FormulaAstNode): FormulaValueType => {
    switch (currentNode.kind) {
      case 'numberLiteral':
        return 'NUMBER';
      case 'stringLiteral':
        return 'TEXT';
      case 'booleanLiteral':
        return 'BOOLEAN';
      case 'nullLiteral':
        return 'NULL';
      case 'fieldReference': {
        const fieldReferenceKey = computeFormulaFieldReferenceKey(currentNode);
        const fieldReferenceType = fieldReferenceTypes[fieldReferenceKey];

        if (!isDefined(fieldReferenceType)) {
          throw createFormulaError({
            message: `Unknown field '${fieldReferenceKey}'`,
            code: 'FORMULA_REFERENCE_ERROR',
          });
        }

        return fieldReferenceType;
      }
      case 'unaryOperation': {
        const operandType = inferNodeType(currentNode.operand);
        const expectedType: FormulaValueType =
          currentNode.operator === '-' ? 'NUMBER' : 'BOOLEAN';

        return unifyFormulaValueTypesOrThrow({
          firstType: operandType,
          secondType: expectedType,
          context: `Operator ${currentNode.operator}`,
        });
      }
      case 'binaryOperation': {
        const leftType = inferNodeType(currentNode.left);
        const rightType = inferNodeType(currentNode.right);
        const { operator } = currentNode;
        const context = `Operator ${operator}`;

        if (ARITHMETIC_OPERATORS.includes(operator)) {
          unifyFormulaValueTypesOrThrow({
            firstType: unifyFormulaValueTypesOrThrow({
              firstType: leftType,
              secondType: 'NUMBER',
              context,
            }),
            secondType: unifyFormulaValueTypesOrThrow({
              firstType: rightType,
              secondType: 'NUMBER',
              context,
            }),
            context,
          });

          return 'NUMBER';
        }

        if (operator === 'AND' || operator === 'OR') {
          unifyFormulaValueTypesOrThrow({
            firstType: leftType,
            secondType: 'BOOLEAN',
            context,
          });
          unifyFormulaValueTypesOrThrow({
            firstType: rightType,
            secondType: 'BOOLEAN',
            context,
          });

          return 'BOOLEAN';
        }

        const unifiedOperandType = unifyFormulaValueTypesOrThrow({
          firstType: leftType,
          secondType: rightType,
          context,
        });

        if (
          ORDERING_OPERATORS.includes(operator) &&
          unifiedOperandType !== 'NULL' &&
          !ORDERABLE_TYPES.includes(unifiedOperandType)
        ) {
          throw createFormulaError({
            message: `${context}: type ${unifiedOperandType} is not orderable`,
            code: 'FORMULA_TYPE_ERROR',
          });
        }

        return 'BOOLEAN';
      }
      case 'functionCall': {
        const functionDefinition = FORMULA_FUNCTIONS[currentNode.functionName];

        if (!isDefined(functionDefinition)) {
          throw createFormulaError({
            message: `Unknown function '${currentNode.functionName}'`,
            code: 'FORMULA_PARSE_ERROR',
          });
        }

        return functionDefinition.inferReturnTypeOrThrow(
          currentNode.arguments.map(inferNodeType),
        );
      }
    }
  };

  return inferNodeType(node);
};
