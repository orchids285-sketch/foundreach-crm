import { computeFormulaFieldReferenceKey } from '@/utils/formula/utils/computeFormulaFieldReferenceKey';
import { type FormulaAstNode } from '@/utils/formula/types/FormulaAstNode';
import { type FormulaFieldReference } from '@/utils/formula/types/FormulaFieldReference';

export const extractFormulaFieldReferences = (
  node: FormulaAstNode,
): FormulaFieldReference[] => {
  const fieldReferenceByKey = new Map<string, FormulaFieldReference>();

  const visitNode = (currentNode: FormulaAstNode): void => {
    switch (currentNode.kind) {
      case 'fieldReference': {
        const { fieldName, subFieldName } = currentNode;
        const fieldReference =
          subFieldName === undefined
            ? { fieldName }
            : { fieldName, subFieldName };

        fieldReferenceByKey.set(
          computeFormulaFieldReferenceKey(fieldReference),
          fieldReference,
        );

        return;
      }
      case 'unaryOperation':
        visitNode(currentNode.operand);

        return;
      case 'binaryOperation':
        visitNode(currentNode.left);
        visitNode(currentNode.right);

        return;
      case 'functionCall':
        currentNode.arguments.forEach(visitNode);

        return;
      default:
        return;
    }
  };

  visitNode(node);

  return [...fieldReferenceByKey.values()];
};
