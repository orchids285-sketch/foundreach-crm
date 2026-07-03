import { FORMULA_DATE_FUNCTIONS } from '@/utils/formula/constants/FormulaDateFunctions';
import { FORMULA_LOGICAL_FUNCTIONS } from '@/utils/formula/constants/FormulaLogicalFunctions';
import { FORMULA_NUMERIC_FUNCTIONS } from '@/utils/formula/constants/FormulaNumericFunctions';
import { FORMULA_TEXT_FUNCTIONS } from '@/utils/formula/constants/FormulaTextFunctions';
import { type FormulaFunctionDefinition } from '@/utils/formula/types/FormulaFunctionDefinition';

export const FORMULA_FUNCTIONS: Record<string, FormulaFunctionDefinition> = {
  ...FORMULA_LOGICAL_FUNCTIONS,
  ...FORMULA_NUMERIC_FUNCTIONS,
  ...FORMULA_TEXT_FUNCTIONS,
  ...FORMULA_DATE_FUNCTIONS,
};
