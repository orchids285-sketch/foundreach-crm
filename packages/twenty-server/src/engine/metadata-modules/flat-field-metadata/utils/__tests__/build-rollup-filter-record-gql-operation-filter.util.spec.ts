import { FieldMetadataType, type ChartFilter } from 'twenty-shared/types';

import { buildRollupFilterRecordGqlOperationFilter } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-rollup-filter-record-gql-operation-filter.util';
import { type MetadataFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/metadata-flat-entity-maps.type';

const STAGE_FIELD_METADATA_ID = 'field-stage';
const AMOUNT_FIELD_METADATA_ID = 'field-amount';

const stageFlatFieldMetadata = {
  id: STAGE_FIELD_METADATA_ID,
  universalIdentifier: 'universal-stage',
  name: 'stage',
  label: 'Stage',
  type: FieldMetadataType.SELECT,
  settings: null,
  options: [{ id: 'option-won', value: 'WON', label: 'Won', color: 'green' }],
};

const amountFlatFieldMetadata = {
  id: AMOUNT_FIELD_METADATA_ID,
  universalIdentifier: 'universal-amount',
  name: 'amount',
  label: 'Amount',
  type: FieldMetadataType.NUMBER,
  settings: null,
};

const flatFieldMetadataMaps = {
  byUniversalIdentifier: {
    'universal-stage': stageFlatFieldMetadata,
    'universal-amount': amountFlatFieldMetadata,
  },
  universalIdentifierById: {
    [STAGE_FIELD_METADATA_ID]: 'universal-stage',
    [AMOUNT_FIELD_METADATA_ID]: 'universal-amount',
  },
} as unknown as MetadataFlatEntityMaps<'fieldMetadata'>;

describe('buildRollupFilterRecordGqlOperationFilter', () => {
  it('should return null when the filter has no record filters', () => {
    const result = buildRollupFilterRecordGqlOperationFilter({
      rollupFilter: { recordFilters: [] },
      flatFieldMetadataMaps,
    });

    expect(result).toBeNull();
  });

  it('should build a gql operation filter keyed by field name', () => {
    const rollupFilter: ChartFilter = {
      recordFilters: [
        {
          fieldMetadataId: STAGE_FIELD_METADATA_ID,
          operand: 'IS',
          value: '["WON"]',
        },
      ],
    };

    const result = buildRollupFilterRecordGqlOperationFilter({
      rollupFilter,
      flatFieldMetadataMaps,
    });

    expect(result).toEqual({
      stage: { in: ['WON'] },
    });
  });

  it('should combine multiple ungrouped record filters with and semantics', () => {
    const rollupFilter: ChartFilter = {
      recordFilters: [
        {
          fieldMetadataId: STAGE_FIELD_METADATA_ID,
          operand: 'IS',
          value: '["WON"]',
        },
        {
          fieldMetadataId: AMOUNT_FIELD_METADATA_ID,
          operand: 'GREATER_THAN_OR_EQUAL',
          value: '1000',
        },
      ],
    };

    const result = buildRollupFilterRecordGqlOperationFilter({
      rollupFilter,
      flatFieldMetadataMaps,
    });

    expect(result).toEqual({
      and: [{ stage: { in: ['WON'] } }, { amount: { gte: 1000 } }],
    });
  });

  it('should throw when a filter references an unknown field', () => {
    const rollupFilter: ChartFilter = {
      recordFilters: [
        {
          fieldMetadataId: 'field-unknown',
          operand: 'IS',
          value: '["WON"]',
        },
      ],
    };

    expect(() =>
      buildRollupFilterRecordGqlOperationFilter({
        rollupFilter,
        flatFieldMetadataMaps,
      }),
    ).toThrow('Rollup filter field metadata not found');
  });
});
