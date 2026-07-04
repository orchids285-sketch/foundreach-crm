import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { getFieldComputedExpression } from '@/object-metadata/utils/getFieldComputedExpression';
import { compositeTypeDefinitions } from 'twenty-shared/types';
import {
  computeFormulaFieldReferenceKey,
  isDefined,
  mapFieldMetadataTypeToFormulaValueType,
  type FormulaValueType,
} from 'twenty-shared/utils';

export const buildFormulaFieldReferenceTypes = ({
  fieldMetadataItems,
}: {
  fieldMetadataItems: Pick<FieldMetadataItem, 'name' | 'type' | 'settings'>[];
}): Record<string, FormulaValueType> => {
  const fieldReferenceTypes: Record<string, FormulaValueType> = {};

  for (const fieldMetadataItem of fieldMetadataItems) {
    if (isDefined(getFieldComputedExpression(fieldMetadataItem.settings))) {
      continue;
    }

    const compositeType = compositeTypeDefinitions.get(fieldMetadataItem.type);

    if (isDefined(compositeType)) {
      for (const compositeProperty of compositeType.properties) {
        const formulaValueType = mapFieldMetadataTypeToFormulaValueType(
          compositeProperty.type,
        );

        if (!isDefined(formulaValueType)) {
          continue;
        }

        const fieldReferenceKey = computeFormulaFieldReferenceKey({
          fieldName: fieldMetadataItem.name,
          subFieldName: compositeProperty.name,
        });

        fieldReferenceTypes[fieldReferenceKey] = formulaValueType;
      }

      continue;
    }

    const formulaValueType = mapFieldMetadataTypeToFormulaValueType(
      fieldMetadataItem.type,
    );

    if (!isDefined(formulaValueType)) {
      continue;
    }

    const fieldReferenceKey = computeFormulaFieldReferenceKey({
      fieldName: fieldMetadataItem.name,
    });

    fieldReferenceTypes[fieldReferenceKey] = formulaValueType;
  }

  return fieldReferenceTypes;
};
