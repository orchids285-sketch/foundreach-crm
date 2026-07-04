import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  computeFormulaFieldReferenceKey,
  evaluateFormulaOrThrow,
  extractFormulaFieldReferences,
  isDefined,
  type FormulaAstNode,
  type FormulaValue,
} from 'twenty-shared/utils';
import { FieldMetadataType } from '~/generated-metadata/graphql';

export const computeFormulaRecordPreviewValue = ({
  formulaAstNode,
  fieldMetadataItems,
  record,
}: {
  formulaAstNode: FormulaAstNode;
  fieldMetadataItems: Pick<FieldMetadataItem, 'name' | 'type'>[];
  record: ObjectRecord;
}): FormulaValue | undefined => {
  try {
    const fieldReferences = extractFormulaFieldReferences(formulaAstNode);
    const fieldValuesByFieldReferenceKey: Record<string, FormulaValue> = {};

    for (const fieldReference of fieldReferences) {
      const referencedFieldMetadataItem = fieldMetadataItems.find(
        (fieldMetadataItem) =>
          fieldMetadataItem.name === fieldReference.fieldName,
      );

      const rawFieldValue = isDefined(fieldReference.subFieldName)
        ? record[fieldReference.fieldName]?.[fieldReference.subFieldName]
        : record[fieldReference.fieldName];

      const fieldValue =
        referencedFieldMetadataItem?.type === FieldMetadataType.DATE_TIME &&
        typeof rawFieldValue === 'string'
          ? new Date(rawFieldValue)
          : rawFieldValue;

      fieldValuesByFieldReferenceKey[
        computeFormulaFieldReferenceKey(fieldReference)
      ] = fieldValue ?? null;
    }

    return evaluateFormulaOrThrow({
      node: formulaAstNode,
      fieldValuesByFieldReferenceKey,
    });
  } catch {
    return undefined;
  }
};
