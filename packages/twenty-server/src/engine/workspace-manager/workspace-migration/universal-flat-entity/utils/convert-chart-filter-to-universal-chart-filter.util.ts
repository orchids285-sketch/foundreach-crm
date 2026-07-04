import {
  type ChartFilter,
  type UniversalChartFilter,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const convertChartFilterToUniversalChartFilter = ({
  filter,
  resolveFieldMetadataUniversalIdentifier,
}: {
  filter: ChartFilter | null | undefined;
  resolveFieldMetadataUniversalIdentifier: (
    fieldMetadataId: string,
  ) => string | null;
}): UniversalChartFilter | undefined => {
  if (!isDefined(filter)) {
    return undefined;
  }

  return {
    ...filter,
    recordFilters: filter.recordFilters?.map(
      ({ fieldMetadataId, ...rest }) => ({
        ...rest,
        fieldMetadataUniversalIdentifier:
          resolveFieldMetadataUniversalIdentifier(fieldMetadataId),
      }),
    ),
  };
};
