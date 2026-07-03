import { faker } from '@faker-js/faker';
import { FieldMetadataType } from 'twenty-shared/types';

import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { deriveFormulaAsExpressionForFormulaField } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-formula-as-expression-for-formula-field.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';

const objectMetadataId = faker.string.uuid();

const getSiblingFlatFieldMetadata = ({
  name,
  type,
}: {
  name: string;
  type: FieldMetadataType;
}): FlatFieldMetadata =>
  getFlatFieldMetadataMock({
    universalIdentifier: faker.string.uuid(),
    objectMetadataId,
    type,
    name,
  });

const getFormulaFlatFieldMetadataOrThrow = ({
  expression,
  outputType,
}: {
  expression: string;
  outputType: 'NUMBER' | 'TEXT' | 'BOOLEAN' | 'DATE_TIME';
}): FlatFieldMetadata<FieldMetadataType.FORMULA> => {
  const flatFieldMetadata = getFlatFieldMetadataMock({
    universalIdentifier: faker.string.uuid(),
    objectMetadataId,
    type: FieldMetadataType.FORMULA,
    name: 'computedField',
    settings: { expression, outputType },
  });

  if (
    !isFlatFieldMetadataOfType(flatFieldMetadata, FieldMetadataType.FORMULA)
  ) {
    throw new Error('Expected a FORMULA flat field metadata mock');
  }

  return flatFieldMetadata;
};

describe('deriveFormulaAsExpressionForFormulaField', () => {
  const siblingFlatFieldMetadatas = [
    getSiblingFlatFieldMetadata({
      name: 'amount',
      type: FieldMetadataType.NUMBER,
    }),
    getSiblingFlatFieldMetadata({ name: 'name', type: FieldMetadataType.TEXT }),
    getSiblingFlatFieldMetadata({
      name: 'annualRecurringRevenue',
      type: FieldMetadataType.CURRENCY,
    }),
  ];

  it('should transpile a formula over scalar sibling fields', () => {
    expect(
      deriveFormulaAsExpressionForFormulaField({
        formulaFlatFieldMetadata: getFormulaFlatFieldMetadataOrThrow({
          expression: 'ROUND(amount * 0.88, 2)',
          outputType: 'NUMBER',
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toBe(
      'ROUND((("amount" * 0.88))::numeric, (2)::integer)::double precision',
    );
  });

  it('should map composite sub-field references to flattened column names', () => {
    expect(
      deriveFormulaAsExpressionForFormulaField({
        formulaFlatFieldMetadata: getFormulaFlatFieldMetadataOrThrow({
          expression: 'annualRecurringRevenue.amountMicros / 1000000',
          outputType: 'NUMBER',
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toBe('("annualRecurringRevenueAmountMicros" / NULLIF(1000000, 0))');
  });

  it('should reject a formula whose inferred type differs from the declared output type', () => {
    expect(() =>
      deriveFormulaAsExpressionForFormulaField({
        formulaFlatFieldMetadata: getFormulaFlatFieldMetadataOrThrow({
          expression: 'CONCAT(name, "!")',
          outputType: 'NUMBER',
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toThrow('Formula returns TEXT but the field output type is NUMBER');
  });

  it('should reject a formula referencing another formula field', () => {
    const formulaSibling = getFormulaFlatFieldMetadataOrThrow({
      expression: 'amount * 2',
      outputType: 'NUMBER',
    });

    expect(() =>
      deriveFormulaAsExpressionForFormulaField({
        formulaFlatFieldMetadata: getFormulaFlatFieldMetadataOrThrow({
          expression: 'computedField + 1',
          outputType: 'NUMBER',
        }),
        siblingFlatFieldMetadatas: [...siblingFlatFieldMetadatas, formulaSibling],
      }),
    ).toThrow("Unknown field 'computedField'");
  });

  it('should reject a formula referencing a non-existent field', () => {
    expect(() =>
      deriveFormulaAsExpressionForFormulaField({
        formulaFlatFieldMetadata: getFormulaFlatFieldMetadataOrThrow({
          expression: 'unknownField * 2',
          outputType: 'NUMBER',
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toThrow("Unknown field 'unknownField'");
  });
});
