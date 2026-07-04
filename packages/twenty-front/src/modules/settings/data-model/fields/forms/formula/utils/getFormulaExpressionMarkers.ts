import { type editor } from 'monaco-editor';
import { type FormulaOutputType } from 'twenty-shared/types';
import {
  inferFormulaReturnTypeOrThrow,
  parseFormulaExpressionOrThrow,
  type FormulaValueType,
} from 'twenty-shared/utils';

const MONACO_MARKER_SEVERITY_ERROR = 8;

type FormulaMarkerRange = Pick<
  editor.IMarkerData,
  'startLineNumber' | 'startColumn' | 'endLineNumber' | 'endColumn'
>;

const computeFullExpressionRange = (expression: string): FormulaMarkerRange => {
  const expressionLines = expression.split('\n');

  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: expressionLines.length,
    endColumn: expressionLines[expressionLines.length - 1].length + 1,
  };
};

const computeRangeFromOffset = (
  expression: string,
  offset: number,
): FormulaMarkerRange => {
  const linesBeforeOffset = expression.slice(0, offset).split('\n');
  const startLineNumber = linesBeforeOffset.length;
  const startColumn =
    linesBeforeOffset[linesBeforeOffset.length - 1].length + 1;
  const errorLine = expression.split('\n')[startLineNumber - 1];

  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: errorLine.length + 1,
  };
};

export const getFormulaExpressionMarkers = ({
  expression,
  outputType,
  fieldReferenceTypes,
}: {
  expression: string;
  outputType: FormulaOutputType;
  fieldReferenceTypes: Record<string, FormulaValueType>;
}): editor.IMarkerData[] => {
  if (expression.trim().length === 0) {
    return [];
  }

  try {
    const formulaAstNode = parseFormulaExpressionOrThrow(expression);
    const inferredReturnType = inferFormulaReturnTypeOrThrow({
      node: formulaAstNode,
      fieldReferenceTypes,
    });

    if (inferredReturnType !== 'NULL' && inferredReturnType !== outputType) {
      return [
        {
          severity: MONACO_MARKER_SEVERITY_ERROR,
          message: `Formula returns ${inferredReturnType} but the field output type is ${outputType}`,
          ...computeFullExpressionRange(expression),
        },
      ];
    }

    return [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Invalid formula expression';
    const offsetMatch = errorMessage.match(/at position (\d+)/);
    const markerRange =
      offsetMatch !== null
        ? computeRangeFromOffset(expression, Number(offsetMatch[1]))
        : computeFullExpressionRange(expression);

    return [
      {
        severity: MONACO_MARKER_SEVERITY_ERROR,
        message: errorMessage,
        ...markerRange,
      },
    ];
  }
};
