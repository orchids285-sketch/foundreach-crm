import {
  COMPUTABLE_FIELD_METADATA_TYPES,
  type ComputableFieldMetadataType,
} from '@/types/ComputableFieldMetadataType';
import { type FieldMetadataType } from '@/types/FieldMetadataType';

export const isComputableFieldMetadataType = (
  fieldMetadataType: FieldMetadataType,
): fieldMetadataType is ComputableFieldMetadataType =>
  (COMPUTABLE_FIELD_METADATA_TYPES as readonly FieldMetadataType[]).includes(
    fieldMetadataType,
  );
