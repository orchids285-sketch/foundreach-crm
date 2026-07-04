import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  isDefined,
  parseFormulaExpressionOrThrow,
  type FormulaAstNode,
  type FormulaValue,
} from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldValue } from '@/object-metadata/utils/getLabelIdentifierFieldValue';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { computeFormulaRecordPreviewValue } from '@/settings/data-model/fields/forms/formula/utils/computeFormulaRecordPreviewValue';

const FORMULA_PREVIEW_RECORDS_LIMIT = 3;

const StyledPreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledPreviewTitle = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledPreviewRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledRecordLabel = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
`;

const StyledRecordValue = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: nowrap;
`;

const formatFormulaPreviewValue = (value: FormulaValue): string => {
  if (value === null) {
    return '—';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
};

const parseFormulaExpression = (expression: string): FormulaAstNode | null => {
  try {
    return parseFormulaExpressionOrThrow(expression);
  } catch {
    return null;
  }
};

type SettingsDataModelFieldFormulaPreviewProps = {
  objectNameSingular: string;
  expression: string;
};

export const SettingsDataModelFieldFormulaPreview = ({
  objectNameSingular,
  expression,
}: SettingsDataModelFieldFormulaPreviewProps) => {
  const { t } = useLingui();
  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });

  const formulaAstNode = parseFormulaExpression(expression);

  const { records } = useFindManyRecords({
    objectNameSingular,
    limit: FORMULA_PREVIEW_RECORDS_LIMIT,
    skip: !isDefined(formulaAstNode),
  });

  if (!isDefined(formulaAstNode)) {
    return null;
  }

  const labelIdentifierFieldMetadataItem =
    getLabelIdentifierFieldMetadataItem(objectMetadataItem);

  const previewRows = records.flatMap((record) => {
    const previewValue = computeFormulaRecordPreviewValue({
      formulaAstNode,
      fieldMetadataItems: objectMetadataItem.fields,
      record,
    });

    if (previewValue === undefined) {
      return [];
    }

    return [
      {
        recordId: record.id,
        recordLabel: getLabelIdentifierFieldValue(
          record,
          labelIdentifierFieldMetadataItem,
        ),
        formattedValue: formatFormulaPreviewValue(previewValue),
      },
    ];
  });

  if (previewRows.length === 0) {
    return null;
  }

  return (
    <StyledPreviewContainer>
      <StyledPreviewTitle>{t`Preview`}</StyledPreviewTitle>
      {previewRows.map((previewRow) => (
        <StyledPreviewRow key={previewRow.recordId}>
          <StyledRecordLabel>
            <OverflowingTextWithTooltip text={previewRow.recordLabel} />
          </StyledRecordLabel>
          <StyledRecordValue>{previewRow.formattedValue}</StyledRecordValue>
        </StyledPreviewRow>
      ))}
    </StyledPreviewContainer>
  );
};
