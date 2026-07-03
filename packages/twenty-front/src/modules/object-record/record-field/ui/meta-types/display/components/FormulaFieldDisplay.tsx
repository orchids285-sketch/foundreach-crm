import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { useFormulaFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useFormulaFieldDisplay';
import { isFieldFormula } from '@/object-record/record-field/ui/types/guards/isFieldFormula';
import { BooleanDisplay } from '@/ui/field/display/components/BooleanDisplay';
import { DateTimeDisplay } from '@/ui/field/display/components/DateTimeDisplay';
import { NumberDisplay } from '@/ui/field/display/components/NumberDisplay';
import { TextDisplay } from '@/ui/field/display/components/TextDisplay';

export const FormulaFieldDisplay = () => {
  const { fieldValue, fieldDefinition } = useFormulaFieldDisplay();
  const { formatNumber } = useNumberFormat();

  const outputType = isFieldFormula(fieldDefinition)
    ? fieldDefinition.metadata.settings?.outputType
    : undefined;

  switch (outputType) {
    case 'NUMBER':
      return (
        <NumberDisplay
          value={
            typeof fieldValue === 'number' ? formatNumber(fieldValue) : null
          }
        />
      );
    case 'BOOLEAN':
      return (
        <BooleanDisplay
          value={typeof fieldValue === 'boolean' ? fieldValue : null}
        />
      );
    case 'DATE_TIME':
      return (
        <DateTimeDisplay
          value={typeof fieldValue === 'string' ? fieldValue : null}
        />
      );
    case 'TEXT':
      return (
        <TextDisplay text={typeof fieldValue === 'string' ? fieldValue : ''} />
      );
    default:
      return null;
  }
};
