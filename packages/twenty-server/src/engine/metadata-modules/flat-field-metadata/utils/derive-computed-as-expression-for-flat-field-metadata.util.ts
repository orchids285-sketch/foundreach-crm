import {
  CustomError,
  getExpectedFormulaValueTypeForComputedFieldType,
  inferFormulaReturnTypeOrThrow,
  isComputableFieldMetadataType,
  parseFormulaExpressionOrThrow,
  transpileFormulaToPostgresExpressionOrThrow,
} from 'twenty-shared/utils';

import { buildFormulaFieldReferencesContext } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-formula-field-references-context.util';
import { getFlatFieldMetadataComputedExpression } from 'src/engine/metadata-modules/flat-field-metadata/utils/get-flat-field-metadata-computed-expression.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';

export const deriveComputedAsExpressionForFlatFieldMetadata = ({
  computedFlatFieldMetadata,
  siblingFlatFieldMetadatas,
}: {
  computedFlatFieldMetadata: FlatFieldMetadata;
  siblingFlatFieldMetadatas: FlatFieldMetadata[];
}): string => {
  const computedExpression = getFlatFieldMetadataComputedExpression(
    computedFlatFieldMetadata.settings,
  );

  if (computedExpression === null) {
    throw new CustomError(
      `Field ${computedFlatFieldMetadata.name} has no computed expression`,
      'COMPUTED_EXPRESSION_MISSING',
    );
  }

  if (!isComputableFieldMetadataType(computedFlatFieldMetadata.type)) {
    throw new CustomError(
      `Field type ${computedFlatFieldMetadata.type} does not support computed expressions`,
      'COMPUTED_EXPRESSION_UNSUPPORTED_TYPE',
    );
  }

  const formulaAstNode = parseFormulaExpressionOrThrow(computedExpression);
  const { fieldReferenceTypes, columnNameByFieldReferenceKey } =
    buildFormulaFieldReferencesContext({ siblingFlatFieldMetadatas });

  const inferredReturnType = inferFormulaReturnTypeOrThrow({
    node: formulaAstNode,
    fieldReferenceTypes,
  });

  const expectedReturnType = getExpectedFormulaValueTypeForComputedFieldType(
    computedFlatFieldMetadata.type,
  );

  if (
    inferredReturnType !== 'NULL' &&
    inferredReturnType !== expectedReturnType
  ) {
    throw new CustomError(
      `Expression returns ${inferredReturnType} but the field expects ${expectedReturnType}`,
      'COMPUTED_EXPRESSION_TYPE_ERROR',
    );
  }

  return transpileFormulaToPostgresExpressionOrThrow({
    node: formulaAstNode,
    fieldReferenceTypes,
    columnNameByFieldReferenceKey,
  });
};
