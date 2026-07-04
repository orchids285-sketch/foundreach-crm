import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import {
  FieldMetadataType,
  type ComputableFieldMetadataType,
} from 'twenty-shared/types';

type FormulaDataModelSelectOptions = {
  label: MessageDescriptor;
  value: ComputableFieldMetadataType;
};

export const FORMULA_DATA_MODEL_SELECT_OPTIONS = [
  {
    label: msg`Number`,
    value: FieldMetadataType.NUMBER,
  },
  {
    label: msg`Text`,
    value: FieldMetadataType.TEXT,
  },
  {
    label: msg`True/False`,
    value: FieldMetadataType.BOOLEAN,
  },
  {
    label: msg`Date and Time`,
    value: FieldMetadataType.DATE_TIME,
  },
  {
    label: msg`Currency`,
    value: FieldMetadataType.CURRENCY,
  },
] as const satisfies Array<FormulaDataModelSelectOptions>;
