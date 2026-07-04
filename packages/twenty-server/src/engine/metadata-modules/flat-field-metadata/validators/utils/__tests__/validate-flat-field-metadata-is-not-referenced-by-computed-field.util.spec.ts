import { FieldMetadataType } from 'twenty-shared/types';

import { validateFlatFieldMetadataIsNotReferencedByComputedField } from 'src/engine/metadata-modules/flat-field-metadata/validators/utils/validate-flat-field-metadata-is-not-referenced-by-computed-field.util';
import { type UniversalFlatEntityMaps } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-entity-maps.type';
import { type UniversalFlatFieldMetadata } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-field-metadata.type';

const SOURCE_OBJECT_UNIVERSAL_IDENTIFIER = 'object-a';
const OTHER_OBJECT_UNIVERSAL_IDENTIFIER = 'object-b';

const sourceFlatFieldMetadata = {
  name: 'employees',
  universalIdentifier: 'field-employees',
  objectMetadataUniversalIdentifier: SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
} as UniversalFlatFieldMetadata;

const createFlatFieldMetadataMaps = (
  flatFieldMetadatas: UniversalFlatFieldMetadata[],
): UniversalFlatEntityMaps<UniversalFlatFieldMetadata> => ({
  byUniversalIdentifier: Object.fromEntries(
    flatFieldMetadatas.map((flatFieldMetadata) => [
      flatFieldMetadata.universalIdentifier,
      flatFieldMetadata,
    ]),
  ),
});

const createComputedFlatFieldMetadata = ({
  computedExpression,
  objectMetadataUniversalIdentifier = SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
}: {
  computedExpression: string;
  objectMetadataUniversalIdentifier?: string;
}): UniversalFlatFieldMetadata =>
  ({
    name: 'computedField',
    universalIdentifier: 'field-computed',
    objectMetadataUniversalIdentifier,
    type: FieldMetadataType.NUMBER,
    universalSettings: { computedExpression },
  }) as UniversalFlatFieldMetadata;

describe('validateFlatFieldMetadataIsNotReferencedByComputedField', () => {
  it('should return an error when a same-object formula references the field name', () => {
    const errors = validateFlatFieldMetadataIsNotReferencedByComputedField({
      flatFieldMetadataToMutate: sourceFlatFieldMetadata,
      flatFieldMetadataMaps: createFlatFieldMetadataMaps([
        createComputedFlatFieldMetadata({
          computedExpression: 'employees * 2',
        }),
      ]),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('computedField');
  });

  it('should return no error when the referencing formula lives on another object', () => {
    const errors = validateFlatFieldMetadataIsNotReferencedByComputedField({
      flatFieldMetadataToMutate: sourceFlatFieldMetadata,
      flatFieldMetadataMaps: createFlatFieldMetadataMaps([
        createComputedFlatFieldMetadata({
          computedExpression: 'employees * 2',
          objectMetadataUniversalIdentifier: OTHER_OBJECT_UNIVERSAL_IDENTIFIER,
        }),
      ]),
    });

    expect(errors).toEqual([]);
  });

  it('should return no error when formulas reference other field names', () => {
    const errors = validateFlatFieldMetadataIsNotReferencedByComputedField({
      flatFieldMetadataToMutate: sourceFlatFieldMetadata,
      flatFieldMetadataMaps: createFlatFieldMetadataMaps([
        createComputedFlatFieldMetadata({ computedExpression: 'revenue * 2' }),
      ]),
    });

    expect(errors).toEqual([]);
  });

  it('should return no error when the stored formula expression is unparsable', () => {
    const errors = validateFlatFieldMetadataIsNotReferencedByComputedField({
      flatFieldMetadataToMutate: sourceFlatFieldMetadata,
      flatFieldMetadataMaps: createFlatFieldMetadataMaps([
        createComputedFlatFieldMetadata({ computedExpression: 'employees +' }),
      ]),
    });

    expect(errors).toEqual([]);
  });

  it('should list every dependent computed field in one error', () => {
    const otherComputedFlatFieldMetadata = {
      ...createComputedFlatFieldMetadata({
        computedExpression: 'employees * 3',
      }),
      name: 'otherComputedField',
      universalIdentifier: 'field-other-computed',
    } as UniversalFlatFieldMetadata;

    const errors = validateFlatFieldMetadataIsNotReferencedByComputedField({
      flatFieldMetadataToMutate: sourceFlatFieldMetadata,
      flatFieldMetadataMaps: createFlatFieldMetadataMaps([
        createComputedFlatFieldMetadata({
          computedExpression: 'employees + 1',
        }),
        otherComputedFlatFieldMetadata,
      ]),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('computedField');
    expect(errors[0].message).toContain('otherComputedField');
  });
});
