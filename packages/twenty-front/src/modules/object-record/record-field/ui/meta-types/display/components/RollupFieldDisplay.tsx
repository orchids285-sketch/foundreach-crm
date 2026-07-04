import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { useRollupFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useRollupFieldDisplay';
import { NumberDisplay } from '@/ui/field/display/components/NumberDisplay';

export const RollupFieldDisplay = () => {
  const { fieldValue } = useRollupFieldDisplay();
  const { formatNumber } = useNumberFormat();

  return (
    <NumberDisplay
      value={typeof fieldValue === 'number' ? formatNumber(fieldValue) : null}
    />
  );
};
