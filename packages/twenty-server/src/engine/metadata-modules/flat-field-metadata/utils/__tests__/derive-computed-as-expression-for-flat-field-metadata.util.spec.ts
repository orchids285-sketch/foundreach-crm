import { faker } from '@faker-js/faker';
import { FieldMetadataType } from 'twenty-shared/types';

import { getFlatFieldMetadataMock } from 'src/engine/metadata-modules/flat-field-metadata/__mocks__/get-flat-field-metadata.mock';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { deriveComputedAsExpressionForFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-computed-as-expression-for-flat-field-metadata.util';
import { deriveComputedCurrencyCodeAsExpressionOrThrow } from 'src/engine/metadata-modules/flat-field-metadata/utils/derive-computed-currency-code-as-expression.util';

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

const getComputedFlatFieldMetadata = ({
  computedExpression,
  type,
}: {
  computedExpression: string;
  type: FieldMetadataType;
}): FlatFieldMetadata =>
  getFlatFieldMetadataMock({
    universalIdentifier: faker.string.uuid(),
    objectMetadataId,
    type,
    name: 'computedField',
    settings: { computedExpression },
  });

describe('deriveComputedAsExpressionForFlatFieldMetadata', () => {
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

  it('should transpile a computed expression over scalar sibling fields', () => {
    expect(
      deriveComputedAsExpressionForFlatFieldMetadata({
        computedFlatFieldMetadata: getComputedFlatFieldMetadata({
          computedExpression: 'ROUND(amount * 0.88, 2)',
          type: FieldMetadataType.NUMBER,
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toBe(
      'ROUND((("amount" * 0.88))::numeric, (2)::integer)::double precision',
    );
  });

  it('should map composite sub-field references to flattened column names', () => {
    expect(
      deriveComputedAsExpressionForFlatFieldMetadata({
        computedFlatFieldMetadata: getComputedFlatFieldMetadata({
          computedExpression: 'annualRecurringRevenue.amountMicros / 1000000',
          type: FieldMetadataType.NUMBER,
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toBe('("annualRecurringRevenueAmountMicros" / NULLIF(1000000, 0))');
  });

  it('should reject an expression whose inferred type differs from the field type', () => {
    expect(() =>
      deriveComputedAsExpressionForFlatFieldMetadata({
        computedFlatFieldMetadata: getComputedFlatFieldMetadata({
          computedExpression: 'CONCAT(name, "!")',
          type: FieldMetadataType.NUMBER,
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toThrow('Expression returns TEXT but the field expects NUMBER');
  });

  it('should reject an expression referencing another computed field', () => {
    const computedSibling = getComputedFlatFieldMetadata({
      computedExpression: 'amount * 2',
      type: FieldMetadataType.NUMBER,
    });

    expect(() =>
      deriveComputedAsExpressionForFlatFieldMetadata({
        computedFlatFieldMetadata: getComputedFlatFieldMetadata({
          computedExpression: 'computedField + 1',
          type: FieldMetadataType.NUMBER,
        }),
        siblingFlatFieldMetadatas: [
          ...siblingFlatFieldMetadatas,
          computedSibling,
        ],
      }),
    ).toThrow("Unknown field 'computedField'");
  });

  it('should reject an expression referencing a non-existent field', () => {
    expect(() =>
      deriveComputedAsExpressionForFlatFieldMetadata({
        computedFlatFieldMetadata: getComputedFlatFieldMetadata({
          computedExpression: 'unknownField * 2',
          type: FieldMetadataType.NUMBER,
        }),
        siblingFlatFieldMetadatas,
      }),
    ).toThrow("Unknown field 'unknownField'");
  });

  it('should derive the currency code column from the single referenced currency sibling', () => {
    expect(
      deriveComputedCurrencyCodeAsExpressionOrThrow({
        computedExpression: 'annualRecurringRevenue.amountMicros * 2',
        siblingFlatFieldMetadatas,
      }),
    ).toBe('"annualRecurringRevenueCurrencyCode"');
  });
});
