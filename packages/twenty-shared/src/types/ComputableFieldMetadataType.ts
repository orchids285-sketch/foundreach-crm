import { FieldMetadataType } from '@/types/FieldMetadataType';

export const COMPUTABLE_FIELD_METADATA_TYPES = [
  FieldMetadataType.NUMBER,
  FieldMetadataType.TEXT,
  FieldMetadataType.BOOLEAN,
  FieldMetadataType.DATE_TIME,
  FieldMetadataType.CURRENCY,
] as const satisfies FieldMetadataType[];

export type ComputableFieldMetadataType =
  (typeof COMPUTABLE_FIELD_METADATA_TYPES)[number];
