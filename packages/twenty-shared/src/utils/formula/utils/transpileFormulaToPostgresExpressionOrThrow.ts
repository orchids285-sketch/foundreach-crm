import { FORMULA_FUNCTIONS } from '@/utils/formula/constants/FormulaFunctions';
import { computeFormulaFieldReferenceKey } from '@/utils/formula/utils/computeFormulaFieldReferenceKey';
import { createFormulaError } from '@/utils/formula/utils/createFormulaError';
import { inferFormulaReturnTypeOrThrow } from '@/utils/formula/utils/inferFormulaReturnTypeOrThrow';
import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

export const transpileFormulaToPostgresExpressionOrThrow = ({
  node,
  fieldReferenceTypes,
  columnNameByFieldReferenceKey,
}: {
  node: FormulaAstNode;
  fieldReferenceTypes: Record<string, FormulaValueType>;
  columnNameByFieldReferenceKey: Record<string, string>;
}): string => {
  const transpileNode = (currentNode: FormulaAstNode): string => {
    switch (currentNode.kind) {
      case 'numberLiteral': {
        if (!Number.isFinite(currentNode.value)) {
          throw createFormulaError({
            message: `Invalid number literal '${currentNode.value}'`,
            code: 'FORMULA_PARSE_ERROR',
          });
        }

        return String(currentNode.value);
      }
      case 'stringLiteral':
        return `'${currentNode.value.replace(/'/g, "''")}'`;
      case 'booleanLiteral':
        return currentNode.value ? 'TRUE' : 'FALSE';
      case 'nullLiteral':
        return 'NULL';
      case 'fieldReference': {
        const fieldReferenceKey = computeFormulaFieldReferenceKey(currentNode);
        const columnName = columnNameByFieldReferenceKey[fieldReferenceKey];

        if (!isDefined(columnName)) {
          throw createFormulaError({
            message: `Unknown field '${fieldReferenceKey}'`,
            code: 'FORMULA_REFERENCE_ERROR',
          });
        }

        return `"${columnName.replace(/"/g, '""')}"`;
      }
      case 'unaryOperation': {
        const operandSql = transpileNode(currentNode.operand);

        return currentNode.operator === '-'
          ? `(- ${operandSql})`
          : `(NOT ${operandSql})`;
      }
      case 'binaryOperation': {
        const leftSql = transpileNode(currentNode.left);
        const rightSql = transpileNode(currentNode.right);

        // NULLIF turns division by zero into null instead of failing the whole record write.
        if (currentNode.operator === '/') {
          return `(${leftSql} / NULLIF(${rightSql}, 0))`;
        }

        // Postgres has no % operator for double precision.
        if (currentNode.operator === '%') {
          return `(((${leftSql})::numeric % NULLIF((${rightSql})::numeric, 0))::double precision)`;
        }

        return `(${leftSql} ${currentNode.operator} ${rightSql})`;
      }
      case 'functionCall': {
        const functionDefinition = FORMULA_FUNCTIONS[currentNode.functionName];

        if (!isDefined(functionDefinition)) {
          throw createFormulaError({
            message: `Unknown function '${currentNode.functionName}'`,
            code: 'FORMULA_PARSE_ERROR',
          });
        }

        const argumentTypes = currentNode.arguments.map(
          (argumentNode): FormulaValueType =>
            inferFormulaReturnTypeOrThrow({
              node: argumentNode,
              fieldReferenceTypes,
            }),
        );

        return functionDefinition.toPostgresSql(
          currentNode.arguments.map(transpileNode),
          argumentTypes,
        );
      }
    }
  };

  return transpileNode(node);
};
