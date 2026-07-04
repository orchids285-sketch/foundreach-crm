import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isNonEmptyString } from '@sniptt/guards';
import {
  computeFormulaFieldReferenceKey,
  evaluateFormulaOrThrow,
  extractFormulaFieldReferences,
  isDefined,
  parseFormulaExpressionOrThrow,
  type FormulaValue,
} from 'twenty-shared/utils';
import { FieldMetadataType } from '~/generated-metadata/graphql';

export const computeOptimisticFormulaFieldValues = ({
  objectMetadataItem,
  optimisticRecord,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
  optimisticRecord: Partial<ObjectRecord>;
}): Partial<ObjectRecord> => {
  const formulaFieldValues: Partial<ObjectRecord> = {};

  const activeFormulaFieldMetadataItems = objectMetadataItem.fields.filter(
    (fieldMetadataItem) =>
      fieldMetadataItem.type === FieldMetadataType.FORMULA &&
      fieldMetadataItem.isActive,
  );

  for (const formulaFieldMetadataItem of activeFormulaFieldMetadataItems) {
    const expression = formulaFieldMetadataItem.settings?.expression;

    if (!isNonEmptyString(expression)) {
      continue;
    }

    try {
      const formulaAstNode = parseFormulaExpressionOrThrow(expression);
      const fieldReferences = extractFormulaFieldReferences(formulaAstNode);

      const fieldValuesByFieldReferenceKey: Record<string, FormulaValue> = {};

      for (const fieldReference of fieldReferences) {
        const referencedFieldMetadataItem = objectMetadataItem.fields.find(
          (fieldMetadataItem) =>
            fieldMetadataItem.name === fieldReference.fieldName,
        );

        const rawFieldValue = isDefined(fieldReference.subFieldName)
          ? optimisticRecord[fieldReference.fieldName]?.[
              fieldReference.subFieldName
            ]
          : optimisticRecord[fieldReference.fieldName];

        const fieldValue =
          referencedFieldMetadataItem?.type === FieldMetadataType.DATE_TIME &&
          typeof rawFieldValue === 'string'
            ? new Date(rawFieldValue)
            : rawFieldValue;

        fieldValuesByFieldReferenceKey[
          computeFormulaFieldReferenceKey(fieldReference)
        ] = fieldValue ?? null;
      }

      const formulaResult = evaluateFormulaOrThrow({
        node: formulaAstNode,
        fieldValuesByFieldReferenceKey,
      });

      formulaFieldValues[formulaFieldMetadataItem.name] =
        formulaResult instanceof Date
          ? formulaResult.toISOString()
          : formulaResult;
    } catch {
      continue;
    }
  }

  return formulaFieldValues;
};
