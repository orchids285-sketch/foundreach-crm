import {
  type ChartFilter,
  type UniversalChartFilter,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const convertUniversalChartFilterToChartFilter = ({
  filter,
  resolveFieldMetadataId,
}: {
  filter: UniversalChartFilter | null | undefined;
  resolveFieldMetadataId: (
    fieldMetadataUniversalIdentifier: string | null,
  ) => string;
}): ChartFilter | undefined => {
  if (!isDefined(filter)) {
    return undefined;
  }

  return {
    ...filter,
    recordFilters: filter.recordFilters?.map(
      ({ fieldMetadataUniversalIdentifier, ...rest }) => ({
        ...rest,
        fieldMetadataId: resolveFieldMetadataId(
          fieldMetadataUniversalIdentifier,
        ),
      }),
    ),
  };
};
