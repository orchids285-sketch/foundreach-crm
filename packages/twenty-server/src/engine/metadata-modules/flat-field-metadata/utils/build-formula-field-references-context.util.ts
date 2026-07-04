import {
  type AllFieldMetadataSettings,
  type FieldMetadataUniversalSettings,
} from 'twenty-shared/types';
import {
  computeFormulaFieldReferenceKey,
  isDefined,
  mapFieldMetadataTypeToFormulaValueType,
  type FormulaValueType,
} from 'twenty-shared/utils';

import {
  computeColumnName,
  computeCompositeColumnName,
} from 'src/engine/metadata-modules/field-metadata/utils/compute-column-name.util';
import { getCompositeTypeOrThrow } from 'src/engine/metadata-modules/field-metadata/utils/get-composite-type-or-throw.util';
import { isCompositeFieldMetadataType } from 'src/engine/metadata-modules/field-metadata/utils/is-composite-field-metadata-type.util';
import { getFlatFieldMetadataComputedExpression } from 'src/engine/metadata-modules/flat-field-metadata/utils/get-flat-field-metadata-computed-expression.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';

export type FormulaReferenceSourceFieldMetadata = Pick<
  FlatFieldMetadata,
  'name' | 'type'
> & {
  settings: AllFieldMetadataSettings | FieldMetadataUniversalSettings | null;
};

export type FormulaFieldReferencesContext = {
  fieldReferenceTypes: Record<string, FormulaValueType>;
  columnNameByFieldReferenceKey: Record<string, string>;
};

export const buildFormulaFieldReferencesContext = ({
  siblingFlatFieldMetadatas,
}: {
  siblingFlatFieldMetadatas: FormulaReferenceSourceFieldMetadata[];
}): FormulaFieldReferencesContext => {
  const fieldReferenceTypes: Record<string, FormulaValueType> = {};
  const columnNameByFieldReferenceKey: Record<string, string> = {};

  for (const flatFieldMetadata of siblingFlatFieldMetadatas) {
    // Generated columns cannot reference other generated columns
    if (
      getFlatFieldMetadataComputedExpression(flatFieldMetadata.settings) !==
      null
    ) {
      continue;
    }

    if (isCompositeFieldMetadataType(flatFieldMetadata.type)) {
      const compositeType = getCompositeTypeOrThrow(flatFieldMetadata.type);

      for (const compositeProperty of compositeType.properties) {
        const formulaValueType = mapFieldMetadataTypeToFormulaValueType(
          compositeProperty.type,
        );

        if (!isDefined(formulaValueType)) {
          continue;
        }

        const fieldReferenceKey = computeFormulaFieldReferenceKey({
          fieldName: flatFieldMetadata.name,
          subFieldName: compositeProperty.name,
        });

        fieldReferenceTypes[fieldReferenceKey] = formulaValueType;
        columnNameByFieldReferenceKey[fieldReferenceKey] =
          computeCompositeColumnName(flatFieldMetadata.name, compositeProperty);
      }

      continue;
    }

    const formulaValueType = mapFieldMetadataTypeToFormulaValueType(
      flatFieldMetadata.type,
    );

    if (!isDefined(formulaValueType)) {
      continue;
    }

    const fieldReferenceKey = computeFormulaFieldReferenceKey({
      fieldName: flatFieldMetadata.name,
    });

    fieldReferenceTypes[fieldReferenceKey] = formulaValueType;
    columnNameByFieldReferenceKey[fieldReferenceKey] = computeColumnName(
      flatFieldMetadata.name,
    );
  }

  return { fieldReferenceTypes, columnNameByFieldReferenceKey };
};
