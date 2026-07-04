import { FORMULA_KEYWORDS } from '@/settings/data-model/fields/forms/formula/constants/FormulaKeywords';
import { FORMULA_FUNCTIONS, type FormulaValueType } from 'twenty-shared/utils';

export type FormulaCompletionItemKind = 'field' | 'function' | 'keyword';

export type FormulaCompletionItem = {
  label: string;
  kind: FormulaCompletionItemKind;
  insertText: string;
  detail?: string;
};

export const buildFormulaCompletionItems = ({
  fieldReferenceTypes,
}: {
  fieldReferenceTypes: Record<string, FormulaValueType>;
}): FormulaCompletionItem[] => {
  const fieldCompletionItems = Object.entries(fieldReferenceTypes).map(
    ([fieldReferenceKey, formulaValueType]): FormulaCompletionItem => ({
      label: fieldReferenceKey,
      kind: 'field',
      insertText: fieldReferenceKey,
      detail: formulaValueType,
    }),
  );

  const functionCompletionItems = Object.keys(FORMULA_FUNCTIONS).map(
    (functionName): FormulaCompletionItem => ({
      label: functionName,
      kind: 'function',
      insertText: `${functionName}($0)`,
      detail: `${functionName}(…)`,
    }),
  );

  const keywordCompletionItems = FORMULA_KEYWORDS.map(
    (keyword): FormulaCompletionItem => ({
      label: keyword,
      kind: 'keyword',
      insertText: keyword,
    }),
  );

  return [
    ...fieldCompletionItems,
    ...functionCompletionItems,
    ...keywordCompletionItems,
  ];
};
