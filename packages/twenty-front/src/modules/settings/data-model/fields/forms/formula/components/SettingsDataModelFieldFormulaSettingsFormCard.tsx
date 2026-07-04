import { t } from '@lingui/core/macro';
import { SettingsDataModelPreviewFormCard } from '@/settings/data-model/components/SettingsDataModelPreviewFormCard';
import { SettingsDataModelFieldFormulaForm } from '@/settings/data-model/fields/forms/formula/components/SettingsDataModelFieldFormulaForm';
import { SettingsDataModelFieldPreviewWidget } from '@/settings/data-model/fields/preview/components/SettingsDataModelFieldPreviewWidget';
import { useFormContext } from 'react-hook-form';
import { FieldMetadataType } from 'twenty-shared/types';

type SettingsDataModelFieldFormulaSettingsFormCardProps = {
  disabled?: boolean;
  existingFieldMetadataId: string;
  objectNameSingular: string;
};

export const SettingsDataModelFieldFormulaSettingsFormCard = ({
  disabled,
  existingFieldMetadataId,
  objectNameSingular,
}: SettingsDataModelFieldFormulaSettingsFormCardProps) => {
  const { watch } = useFormContext();

  return (
    <SettingsDataModelPreviewFormCard
      preview={
        <SettingsDataModelFieldPreviewWidget
          fieldMetadataItem={{
            icon: watch('icon'),
            label: watch('label') || t`New Field`,
            settings: watch('settings') || null,
            type: FieldMetadataType.FORMULA,
          }}
          objectNameSingular={objectNameSingular}
        />
      }
      form={
        <SettingsDataModelFieldFormulaForm
          disabled={disabled}
          existingFieldMetadataId={existingFieldMetadataId}
          objectNameSingular={objectNameSingular}
        />
      }
    />
  );
};
