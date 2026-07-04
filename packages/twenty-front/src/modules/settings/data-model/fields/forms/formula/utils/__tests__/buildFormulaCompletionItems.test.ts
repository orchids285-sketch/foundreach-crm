import { buildFormulaCompletionItems } from '@/settings/data-model/fields/forms/formula/utils/buildFormulaCompletionItems';
import { FORMULA_FUNCTIONS, type FormulaValueType } from 'twenty-shared/utils';

describe('buildFormulaCompletionItems', () => {
  const fieldReferenceTypes: Record<string, FormulaValueType> = {
    amount: 'NUMBER',
    'revenue.amountMicros': 'NUMBER',
    city: 'TEXT',
  };

  it('should suggest sibling fields with their reference key and value type', () => {
    const completionItems = buildFormulaCompletionItems({
      fieldReferenceTypes,
    });

    expect(completionItems).toEqual(
      expect.arrayContaining([
        {
          label: 'amount',
          kind: 'field',
          insertText: 'amount',
          detail: 'NUMBER',
        },
        {
          label: 'revenue.amountMicros',
          kind: 'field',
          insertText: 'revenue.amountMicros',
          detail: 'NUMBER',
        },
        {
          label: 'city',
          kind: 'field',
          insertText: 'city',
          detail: 'TEXT',
        },
      ]),
    );
  });

  it('should suggest every registry function as a parenthesized snippet', () => {
    const completionItems = buildFormulaCompletionItems({
      fieldReferenceTypes: {},
    });

    const functionCompletionItems = completionItems.filter(
      (completionItem) => completionItem.kind === 'function',
    );

    expect(functionCompletionItems.map((item) => item.label)).toEqual(
      Object.keys(FORMULA_FUNCTIONS),
    );
    expect(functionCompletionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'IF', insertText: 'IF($0)' }),
      ]),
    );
  });

  it('should suggest formula keywords', () => {
    const completionItems = buildFormulaCompletionItems({
      fieldReferenceTypes: {},
    });

    const keywordLabels = completionItems
      .filter((completionItem) => completionItem.kind === 'keyword')
      .map((completionItem) => completionItem.label);

    expect(keywordLabels).toEqual([
      'AND',
      'OR',
      'NOT',
      'TRUE',
      'FALSE',
      'NULL',
    ]);
  });
});
