import { FieldMetadataType } from 'twenty-shared/types';
import {
  CustomError,
  inferFormulaReturnTypeOrThrow,
  parseFormulaExpressionOrThrow,
  transpileFormulaToPostgresExpressionOrThrow,
} from 'twenty-shared/utils';

import { buildFormulaFieldReferencesContext } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';

export const deriveFormulaAsExpressionForFormulaField = ({
  formulaFlatFieldMetadata,
  siblingFlatFieldMetadatas,
}: {
  formulaFlatFieldMetadata: FlatFieldMetadata<FieldMetadataType.FORMULA>;
  siblingFlatFieldMetadatas: FlatFieldMetadata[];
}): string => {
  const { expression, outputType } = formulaFlatFieldMetadata.settings;

  const formulaAstNode = parseFormulaExpressionOrThrow(expression);
  const { fieldReferenceTypes, columnNameByFieldReferenceKey } =
    buildFormulaFieldReferencesContext({ siblingFlatFieldMetadatas });

  const inferredReturnType = inferFormulaReturnTypeOrThrow({
    node: formulaAstNode,
    fieldReferenceTypes,
  });

  if (inferredReturnType !== 'NULL' && inferredReturnType !== outputType) {
    throw new CustomError(
      `Formula returns ${inferredReturnType} but the field output type is ${outputType}`,
      'FORMULA_TYPE_ERROR',
    );
  }

  return transpileFormulaToPostgresExpressionOrThrow({
    node: formulaAstNode,
    fieldReferenceTypes,
    columnNameByFieldReferenceKey,
  });
};
