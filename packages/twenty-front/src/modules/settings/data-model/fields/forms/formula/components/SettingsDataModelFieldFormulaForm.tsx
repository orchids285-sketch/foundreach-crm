import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { Separator } from '@/settings/components/Separator';
import { SettingsOptionCardContentSelect } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSelect';
import { FORMULA_DATA_MODEL_SELECT_OPTIONS } from '@/settings/data-model/fields/forms/formula/constants/FormulaDataModelSelectOptions';
import { Select } from '@/ui/input/components/Select';
import { TextArea } from '@/ui/input/components/TextArea';
import { useLingui } from '@lingui/react/macro';
import {
  FORMULA_OUTPUT_TYPES,
  type FormulaOutputType,
} from 'twenty-shared/types';
import { parseFormulaExpressionOrThrow } from 'twenty-shared/utils';
import { IconEye } from 'twenty-ui/icon';

export const settingsDataModelFieldFormulaFormSchema = z.object({
  settings: z.object({
    expression: z
      .string()
      .min(1)
      .superRefine((expression, ctx) => {
        try {
          parseFormulaExpressionOrThrow(expression);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              error instanceof Error
                ? error.message
                : 'Invalid formula expression',
          });
        }
      }),
    outputType: z.enum(FORMULA_OUTPUT_TYPES),
  }),
});

export type SettingsDataModelFieldFormulaFormValues = z.infer<
  typeof settingsDataModelFieldFormulaFormSchema
>;

type SettingsDataModelFieldFormulaFormProps = {
  disabled?: boolean;
  existingFieldMetadataId: string;
};

export const SettingsDataModelFieldFormulaForm = ({
  disabled,
  existingFieldMetadataId,
}: SettingsDataModelFieldFormulaFormProps) => {
  const { t } = useLingui();
  const { control } = useFormContext<SettingsDataModelFieldFormulaFormValues>();

  const { fieldMetadataItem } = useFieldMetadataItemById(
    existingFieldMetadataId,
  );

  return (
    <Controller
      name="settings"
      defaultValue={{
        expression: fieldMetadataItem?.settings?.expression ?? '',
        outputType: fieldMetadataItem?.settings?.outputType ?? 'NUMBER',
      }}
      control={control}
      render={({ field: { onChange, value } }) => {
        const expression = value?.expression ?? '';
        const outputType = value?.outputType ?? 'NUMBER';

        return (
          <>
            <SettingsOptionCardContentSelect
              Icon={IconEye}
              title={t`Output type`}
              description={t`Type of the value computed by the formula`}
            >
              <Select<FormulaOutputType>
                selectSizeVariant="small"
                dropdownId="formula-output-type"
                dropdownWidth={140}
                value={outputType}
                onChange={(value) =>
                  onChange({ expression, outputType: value })
                }
                disabled={disabled}
                needIconCheck={false}
                options={FORMULA_DATA_MODEL_SELECT_OPTIONS.map((option) => ({
                  ...option,
                  label: t(option.label),
                }))}
              />
            </SettingsOptionCardContentSelect>
            <Separator />
            <TextArea
              textAreaId="formula-expression"
              placeholder={t`E.g. amount * 0.88`}
              minRows={4}
              maxRows={8}
              value={expression}
              onChange={(value) => onChange({ expression: value, outputType })}
              disabled={disabled}
            />
          </>
        );
      }}
    />
  );
};
