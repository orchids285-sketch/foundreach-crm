import { CustomError } from '@/utils/errors/CustomError';
import { type FormulaErrorCode } from '@/utils/formula/types/FormulaErrorCode';

export const createFormulaError = ({
  message,
  code,
}: {
  message: string;
  code: FormulaErrorCode;
}): CustomError => {
  return new CustomError(message, code);
};
