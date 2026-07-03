import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type FormulaOutputType } from 'twenty-shared/types';

type FormulaDataModelSelectOptions = {
  label: MessageDescriptor;
  value: FormulaOutputType;
};

export const FORMULA_DATA_MODEL_SELECT_OPTIONS = [
  {
    label: msg`Number`,
    value: 'NUMBER',
  },
  {
    label: msg`Text`,
    value: 'TEXT',
  },
  {
    label: msg`True or False`,
    value: 'BOOLEAN',
  },
  {
    label: msg`Date and Time`,
    value: 'DATE_TIME',
  },
] as const satisfies Array<FormulaDataModelSelectOptions>;
