import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type RollupAggregateOperation } from 'twenty-shared/types';

type RollupAggregateOperationSelectOptions = {
  label: MessageDescriptor;
  value: RollupAggregateOperation;
};

export const ROLLUP_AGGREGATE_OPERATION_SELECT_OPTIONS = [
  {
    label: msg`Count`,
    value: 'COUNT',
  },
  {
    label: msg`Sum`,
    value: 'SUM',
  },
  {
    label: msg`Average`,
    value: 'AVG',
  },
  {
    label: msg`Min`,
    value: 'MIN',
  },
  {
    label: msg`Max`,
    value: 'MAX',
  },
] as const satisfies Array<RollupAggregateOperationSelectOptions>;
