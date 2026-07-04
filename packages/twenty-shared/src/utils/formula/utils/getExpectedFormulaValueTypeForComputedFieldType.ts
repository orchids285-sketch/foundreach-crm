import { FieldMetadataType } from '@/types/FieldMetadataType';
import { type ComputableFieldMetadataType } from '@/types/ComputableFieldMetadataType';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

// CURRENCY expressions compute the amountMicros sub-column, hence NUMBER
export const getExpectedFormulaValueTypeForComputedFieldType = (
  computedFieldType: ComputableFieldMetadataType,
): FormulaValueType => {
  switch (computedFieldType) {
    case FieldMetadataType.NUMBER:
      return 'NUMBER';
    case FieldMetadataType.CURRENCY:
      return 'NUMBER';
    case FieldMetadataType.TEXT:
      return 'TEXT';
    case FieldMetadataType.BOOLEAN:
      return 'BOOLEAN';
    case FieldMetadataType.DATE_TIME:
      return 'DATE_TIME';
  }
};
