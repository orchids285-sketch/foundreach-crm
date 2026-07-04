import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { getFieldComputedExpression } from '@/object-metadata/utils/getFieldComputedExpression';
import { Separator } from '@/settings/components/Separator';
import { SettingsOptionCardContentSelect } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSelect';
import { SettingsDataModelFieldFormulaExpressionEditor } from '@/settings/data-model/fields/forms/formula/components/SettingsDataModelFieldFormulaExpressionEditor';
import { SettingsDataModelFieldFormulaPreview } from '@/settings/data-model/fields/forms/formula/components/SettingsDataModelFieldFormulaPreview';
import { FORMULA_DATA_MODEL_SELECT_OPTIONS } from '@/settings/data-model/fields/forms/formula/constants/FormulaDataModelSelectOptions';
import { buildFormulaFieldReferenceTypes } from '@/settings/data-model/fields/forms/formula/utils/buildFormulaFieldReferenceTypes';
import { Select } from '@/ui/input/components/Select';
import { useLingui } from '@lingui/react/macro';
import {
  FieldMetadataType,
  type ComputableFieldMetadataType,
} from 'twenty-shared/types';
import {
  getExpectedFormulaValueTypeForComputedFieldType,
  parseFormulaExpressionOrThrow,
} from 'twenty-shared/utils';
import { IconEye } from 'twenty-ui/icon';

export const settingsDataModelFieldFormulaFormSchema = z.object({
  settings: z.object({
    computedExpression: z
      .string()
      .min(1)
      .superRefine((computedExpression, ctx) => {
        try {
          parseFormulaExpressionOrThrow(computedExpression);
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
  }),
});

export type SettingsDataModelFieldFormulaFormValues = z.infer<
  typeof settingsDataModelFieldFormulaFormSchema
> & {
  type: ComputableFieldMetadataType;
};

type SettingsDataModelFieldFormulaFormProps = {
  disabled?: boolean;
  existingFieldMetadataId: string;
  objectNameSingular: string;
};

export const SettingsDataModelFieldFormulaForm = ({
  disabled,
  existingFieldMetadataId,
  objectNameSingular,
}: SettingsDataModelFieldFormulaFormProps) => {
  const { t } = useLingui();
  const { control, watch } =
    useFormContext<SettingsDataModelFieldFormulaFormValues>();

  const { fieldMetadataItem } = useFieldMetadataItemById(
    existingFieldMetadataId,
  );

  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });

  const fieldReferenceTypes = useMemo(
    () =>
      buildFormulaFieldReferenceTypes({
        fieldMetadataItems: objectMetadataItem.fields.filter(
          (siblingFieldMetadataItem) =>
            siblingFieldMetadataItem.id !== existingFieldMetadataId,
        ),
      }),
    [objectMetadataItem, existingFieldMetadataId],
  );

  const chosenFieldType = watch('type');
  const expectedFormulaValueType =
    getExpectedFormulaValueTypeForComputedFieldType(chosenFieldType);

  return (
    <>
      <Controller
        name="type"
        control={control}
        render={({ field: { onChange, value } }) => (
          <SettingsOptionCardContentSelect
            Icon={IconEye}
            title={t`Output type`}
            description={
              value === FieldMetadataType.CURRENCY
                ? t`Currency expressions compute the amount in micros`
                : t`Type of the value computed by the formula`
            }
          >
            <Select<ComputableFieldMetadataType>
              selectSizeVariant="small"
              dropdownId="formula-output-type"
              dropdownWidth={140}
              value={value}
              onChange={onChange}
              disabled={disabled}
              needIconCheck={false}
              options={FORMULA_DATA_MODEL_SELECT_OPTIONS.map((option) => ({
                ...option,
                label: t(option.label),
              }))}
            />
          </SettingsOptionCardContentSelect>
        )}
      />
      <Separator />
      <Controller
        name="settings"
        defaultValue={{
          computedExpression:
            getFieldComputedExpression(fieldMetadataItem?.settings) ?? '',
        }}
        control={control}
        render={({ field: { onChange, value } }) => {
          const computedExpression = value?.computedExpression ?? '';

          return (
            <>
              <SettingsDataModelFieldFormulaExpressionEditor
                expression={computedExpression}
                expectedFormulaValueType={expectedFormulaValueType}
                fieldReferenceTypes={fieldReferenceTypes}
                onChange={(newExpression) =>
                  onChange({ computedExpression: newExpression })
                }
                disabled={disabled}
              />
              <SettingsDataModelFieldFormulaPreview
                objectNameSingular={objectNameSingular}
                expression={computedExpression}
              />
            </>
          );
        }}
      />
    </>
  );
};
