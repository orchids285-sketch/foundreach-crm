import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { Separator } from '@/settings/components/Separator';
import { SettingsOptionCardContentSelect } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSelect';
import { ROLLUP_AGGREGATE_OPERATION_SELECT_OPTIONS } from '@/settings/data-model/fields/forms/rollup/constants/RollupAggregateOperationSelectOptions';
import { Select } from '@/ui/input/components/Select';
import { useLingui } from '@lingui/react/macro';
import {
  ROLLUP_AGGREGATE_OPERATIONS,
  type RollupAggregateOperation,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconNumber9, IconRelationOneToMany, IconSum } from 'twenty-ui/icon';
import { FieldMetadataType, RelationType } from '~/generated-metadata/graphql';

export const settingsDataModelFieldRollupFormSchema = z.object({
  settings: z
    .object({
      relationFieldMetadataId: z.uuid(),
      aggregateOperation: z.enum(ROLLUP_AGGREGATE_OPERATIONS),
      targetFieldMetadataId: z.uuid().nullable(),
    })
    .superRefine((settings, ctx) => {
      if (
        settings.aggregateOperation === 'COUNT' &&
        settings.targetFieldMetadataId !== null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Count does not aggregate a target field',
        });
      }

      if (
        settings.aggregateOperation !== 'COUNT' &&
        settings.targetFieldMetadataId === null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A target field is required',
        });
      }
    }),
});

export type SettingsDataModelFieldRollupFormValues = z.infer<
  typeof settingsDataModelFieldRollupFormSchema
>;

type SettingsDataModelFieldRollupFormProps = {
  disabled?: boolean;
  existingFieldMetadataId: string;
  objectNameSingular: string;
};

export const SettingsDataModelFieldRollupForm = ({
  disabled,
  existingFieldMetadataId,
  objectNameSingular,
}: SettingsDataModelFieldRollupFormProps) => {
  const { t } = useLingui();
  const { control } = useFormContext<SettingsDataModelFieldRollupFormValues>();

  const { fieldMetadataItem } = useFieldMetadataItemById(
    existingFieldMetadataId,
  );

  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });
  const { findObjectMetadataItemById } = useFilteredObjectMetadataItems();

  const oneToManyRelationFieldMetadataItems = objectMetadataItem.fields.filter(
    (field) =>
      field.type === FieldMetadataType.RELATION &&
      field.relation?.type === RelationType.ONE_TO_MANY,
  );

  return (
    <Controller
      name="settings"
      defaultValue={{
        relationFieldMetadataId:
          fieldMetadataItem?.settings?.relationFieldMetadataId ?? '',
        aggregateOperation:
          fieldMetadataItem?.settings?.aggregateOperation ?? 'COUNT',
        targetFieldMetadataId:
          fieldMetadataItem?.settings?.targetFieldMetadataId ?? null,
      }}
      control={control}
      render={({ field: { onChange, value } }) => {
        const relationFieldMetadataId = value?.relationFieldMetadataId ?? '';
        const aggregateOperation = value?.aggregateOperation ?? 'COUNT';
        const targetFieldMetadataId = value?.targetFieldMetadataId ?? null;

        const selectedRelationFieldMetadataItem =
          oneToManyRelationFieldMetadataItems.find(
            (field) => field.id === relationFieldMetadataId,
          );

        const targetObjectMetadataItem = isDefined(
          selectedRelationFieldMetadataItem?.relation,
        )
          ? findObjectMetadataItemById(
              selectedRelationFieldMetadataItem.relation.targetObjectMetadata
                .id,
            )
          : undefined;

        const targetNumberFieldMetadataItems =
          targetObjectMetadataItem?.fields.filter(
            (field) => field.type === FieldMetadataType.NUMBER,
          ) ?? [];

        return (
          <>
            <SettingsOptionCardContentSelect
              Icon={IconRelationOneToMany}
              title={t`Relation`}
              description={t`One-to-many relation to aggregate`}
            >
              <Select<string>
                selectSizeVariant="small"
                dropdownId="rollup-relation-field"
                dropdownWidth={140}
                value={relationFieldMetadataId}
                onChange={(newRelationFieldMetadataId) =>
                  onChange({
                    relationFieldMetadataId: newRelationFieldMetadataId,
                    aggregateOperation,
                    targetFieldMetadataId: null,
                  })
                }
                disabled={disabled}
                needIconCheck={false}
                options={oneToManyRelationFieldMetadataItems.map((field) => ({
                  label: field.label,
                  value: field.id,
                }))}
              />
            </SettingsOptionCardContentSelect>
            <Separator />
            <SettingsOptionCardContentSelect
              Icon={IconSum}
              title={t`Operation`}
              description={t`Aggregate operation applied to related records`}
            >
              <Select<RollupAggregateOperation>
                selectSizeVariant="small"
                dropdownId="rollup-aggregate-operation"
                dropdownWidth={140}
                value={aggregateOperation}
                onChange={(newAggregateOperation) =>
                  onChange({
                    relationFieldMetadataId,
                    aggregateOperation: newAggregateOperation,
                    targetFieldMetadataId:
                      newAggregateOperation === 'COUNT'
                        ? null
                        : targetFieldMetadataId,
                  })
                }
                disabled={disabled}
                needIconCheck={false}
                options={ROLLUP_AGGREGATE_OPERATION_SELECT_OPTIONS.map(
                  (option) => ({
                    ...option,
                    label: t(option.label),
                  }),
                )}
              />
            </SettingsOptionCardContentSelect>
            {aggregateOperation !== 'COUNT' && (
              <>
                <Separator />
                <SettingsOptionCardContentSelect
                  Icon={IconNumber9}
                  title={t`Target field`}
                  description={t`Number field aggregated on the related object`}
                >
                  <Select<string>
                    selectSizeVariant="small"
                    dropdownId="rollup-target-field"
                    dropdownWidth={140}
                    value={targetFieldMetadataId ?? undefined}
                    onChange={(newTargetFieldMetadataId) =>
                      onChange({
                        relationFieldMetadataId,
                        aggregateOperation,
                        targetFieldMetadataId: newTargetFieldMetadataId,
                      })
                    }
                    disabled={disabled}
                    needIconCheck={false}
                    options={targetNumberFieldMetadataItems.map((field) => ({
                      label: field.label,
                      value: field.id,
                    }))}
                  />
                </SettingsOptionCardContentSelect>
              </>
            )}
          </>
        );
      }}
    />
  );
};
