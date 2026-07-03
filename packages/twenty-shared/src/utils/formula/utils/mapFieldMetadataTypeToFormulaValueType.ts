import { FieldMetadataType } from '@/types/FieldMetadataType';
import { type FormulaValueType } from '@/utils/formula/types/FormulaValueType';

// DATE is excluded: Postgres date-to-timestamptz casts are only STABLE, which
// generated column expressions reject. TODO: support DATE with a dedicated formula type.
export const mapFieldMetadataTypeToFormulaValueType = (
  fieldMetadataType: FieldMetadataType,
): FormulaValueType | null => {
  switch (fieldMetadataType) {
    case FieldMetadataType.NUMBER:
    case FieldMetadataType.NUMERIC:
      return 'NUMBER';
    case FieldMetadataType.TEXT:
      return 'TEXT';
    case FieldMetadataType.BOOLEAN:
      return 'BOOLEAN';
    case FieldMetadataType.DATE_TIME:
      return 'DATE_TIME';
    default:
      return null;
  }
};
