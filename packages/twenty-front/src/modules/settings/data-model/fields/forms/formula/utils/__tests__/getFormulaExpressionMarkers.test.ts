import { getFormulaExpressionMarkers } from '@/settings/data-model/fields/forms/formula/utils/getFormulaExpressionMarkers';
import { type FormulaValueType } from 'twenty-shared/utils';

describe('getFormulaExpressionMarkers', () => {
  const fieldReferenceTypes: Record<string, FormulaValueType> = {
    amount: 'NUMBER',
    city: 'TEXT',
  };

  it('should return no markers for a valid expression matching the output type', () => {
    expect(
      getFormulaExpressionMarkers({
        expression: 'amount * 0.88',
        outputType: 'NUMBER',
        fieldReferenceTypes,
      }),
    ).toEqual([]);
  });

  it('should return no markers for an empty expression', () => {
    expect(
      getFormulaExpressionMarkers({
        expression: '  ',
        outputType: 'NUMBER',
        fieldReferenceTypes,
      }),
    ).toEqual([]);
  });

  it('should mark an unknown field reference', () => {
    const markers = getFormulaExpressionMarkers({
      expression: 'unknownField * 2',
      outputType: 'NUMBER',
      fieldReferenceTypes,
    });

    expect(markers).toHaveLength(1);
    expect(markers[0].message).toBe("Unknown field 'unknownField'");
  });

  it('should mark a mismatch between the inferred return type and the output type', () => {
    const markers = getFormulaExpressionMarkers({
      expression: 'amount * 2',
      outputType: 'TEXT',
      fieldReferenceTypes,
    });

    expect(markers).toHaveLength(1);
    expect(markers[0].message).toBe(
      'Formula returns NUMBER but the field output type is TEXT',
    );
  });

  it('should position a parse error marker at the reported offset', () => {
    const markers = getFormulaExpressionMarkers({
      expression: 'amount +\n@',
      outputType: 'NUMBER',
      fieldReferenceTypes,
    });

    expect(markers).toHaveLength(1);
    expect(markers[0].message).toBe("Unexpected character '@' at position 9");
    expect(markers[0].startLineNumber).toBe(2);
    expect(markers[0].startColumn).toBe(1);
  });
});
