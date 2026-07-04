import { computeOptimisticFormulaFieldValues } from '@/object-record/utils/computeOptimisticFormulaFieldValues';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import { getMockFieldMetadataItemOrThrow } from '~/testing/utils/getMockFieldMetadataItemOrThrow';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

const buildCompanyObjectMetadataItemWithComputedField = ({
  computedExpression,
  type = FieldMetadataType.NUMBER,
}: {
  computedExpression: string;
  type?: FieldMetadataType;
}) => {
  const companyObjectMetadataItem = getMockObjectMetadataItemOrThrow('company');
  const employeesFieldMetadataItem = getMockFieldMetadataItemOrThrow({
    objectMetadataItem: companyObjectMetadataItem,
    fieldName: 'employees',
  });

  return {
    ...companyObjectMetadataItem,
    fields: [
      ...companyObjectMetadataItem.fields,
      {
        ...employeesFieldMetadataItem,
        id: 'computed-field-id',
        name: 'computedValue',
        label: 'Computed Value',
        type,
        settings: { computedExpression },
      },
    ],
  };
};

describe('computeOptimisticFormulaFieldValues', () => {
  it('should evaluate a number formula against the edited field value', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'employees * 2',
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {
        employees: 21,
      },
    });

    expect(result).toEqual({
      computedValue: 42,
    });
  });

  it('should evaluate a formula referencing a composite subfield', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'annualRecurringRevenue.amountMicros / 1000000',
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {
        annualRecurringRevenue: {
          amountMicros: 5000000,
        },
      },
    });

    expect(result).toEqual({
      computedValue: 5,
    });
  });

  it('should convert DATE_TIME references and serialize Date results to ISO strings', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {
        createdAt: '2024-05-01T10:00:00.000Z',
      },
    });

    expect(result).toEqual({
      computedValue: '2024-05-01T10:00:00.000Z',
    });
  });

  it('should treat undefined referenced values as null', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'employees * 2',
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {},
    });

    expect(result).toEqual({
      computedValue: null,
    });
  });

  it('should skip a computed field when its expression fails to evaluate', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'employees *',
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {
        employees: 21,
      },
    });

    expect(result).toEqual({});
  });

  it('should skip computed CURRENCY fields', () => {
    const objectMetadataItem = buildCompanyObjectMetadataItemWithComputedField({
      computedExpression: 'employees * 2',
      type: FieldMetadataType.CURRENCY,
    });

    const result = computeOptimisticFormulaFieldValues({
      objectMetadataItem,
      optimisticRecord: {
        employees: 21,
      },
    });

    expect(result).toEqual({});
  });
});
