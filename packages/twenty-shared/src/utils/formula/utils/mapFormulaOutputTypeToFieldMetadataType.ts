import { FieldMetadataType } from '@/types/FieldMetadataType';
import { type FormulaOutputType } from '@/types/FormulaOutputType';

export const mapFormulaOutputTypeToFieldMetadataType = (
  formulaOutputType: FormulaOutputType,
): FieldMetadataType => {
  switch (formulaOutputType) {
    case 'NUMBER':
      return FieldMetadataType.NUMBER;
    case 'TEXT':
      return FieldMetadataType.TEXT;
    case 'BOOLEAN':
      return FieldMetadataType.BOOLEAN;
    case 'DATE_TIME':
      return FieldMetadataType.DATE_TIME;
  }
};
