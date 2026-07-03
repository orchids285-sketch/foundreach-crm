import { isDefined } from '@/utils/validation/isDefined';
import { type FormulaFieldReference } from '@/utils/formula/types/FormulaFieldReference';

export const computeFormulaFieldReferenceKey = ({
  fieldName,
  subFieldName,
}: FormulaFieldReference): string =>
  isDefined(subFieldName) ? `${fieldName}.${subFieldName}` : fieldName;
