import { currencyCompositeType, FieldMetadataType } from 'twenty-shared/types';
import {
  CustomError,
  extractFormulaFieldReferences,
  isDefined,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';

import { computeCompositeColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-column-name.util';
import { type FormulaReferenceSourceFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

// A computed CURRENCY field inherits its currency code from the single
// CURRENCY field its expression references, as a generated copy column
export const deriveComputedCurrencyCodeAsExpressionOrThrow = ({
  computedExpression,
  siblingFlatFieldMetadatas,
}: {
  computedExpression: string;
  siblingFlatFieldMetadatas: FormulaReferenceSourceFieldMetadata[];
}): string => {
  const currencySiblingNames = new Set(
    siblingFlatFieldMetadatas
      .filter(
        (siblingFlatFieldMetadata) =>
          siblingFlatFieldMetadata.type === FieldMetadataType.CURRENCY,
      )
      .map((siblingFlatFieldMetadata) => siblingFlatFieldMetadata.name),
  );

  const referencedCurrencyFieldNames = [
    ...new Set(
      extractFormulaFieldReferences(
        parseFormulaExpressionOrThrow(computedExpression),
      )
        .map((fieldReference) => fieldReference.fieldName)
        .filter((fieldName) => currencySiblingNames.has(fieldName)),
    ),
  ];

  if (referencedCurrencyFieldNames.length !== 1) {
    throw new CustomError(
      `A computed currency expression must reference exactly one currency field, found ${referencedCurrencyFieldNames.length}`,
      'COMPUTED_CURRENCY_SOURCE_ERROR',
    );
  }

  const currencyCodeProperty = currencyCompositeType.properties.find(
    (compositeProperty) => compositeProperty.name === 'currencyCode',
  );

  if (!isDefined(currencyCodeProperty)) {
    throw new CustomError(
      'Currency composite type has no currencyCode property',
      'COMPUTED_CURRENCY_SOURCE_ERROR',
    );
  }

  return escapeIdentifier(
    computeCompositeColumnName(
      referencedCurrencyFieldNames[0],
      currencyCodeProperty,
    ),
  );
};
