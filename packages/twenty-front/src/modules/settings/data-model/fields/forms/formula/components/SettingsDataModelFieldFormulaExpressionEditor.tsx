import { type Monaco } from '@monaco-editor/react';
import { type editor } from 'monaco-editor';
import { useEffect, useState } from 'react';
import { isDefined, type FormulaValueType } from 'twenty-shared/utils';
import { CodeEditor } from 'twenty-ui/input';

import { TWENTY_FORMULA_LANGUAGE_ID } from '@/settings/data-model/fields/forms/formula/constants/TwentyFormulaLanguageId';
import {
  buildFormulaCompletionItems,
  type FormulaCompletionItemKind,
} from '@/settings/data-model/fields/forms/formula/utils/buildFormulaCompletionItems';
import { getFormulaExpressionMarkers } from '@/settings/data-model/fields/forms/formula/utils/getFormulaExpressionMarkers';
import { registerTwentyFormulaLanguage } from '@/settings/data-model/fields/forms/formula/utils/registerTwentyFormulaLanguage';

const FORMULA_EXPRESSION_EDITOR_HEIGHT = 120;

const getMonacoCompletionItemKind = (
  monaco: Monaco,
  kind: FormulaCompletionItemKind,
) => {
  switch (kind) {
    case 'field':
      return monaco.languages.CompletionItemKind.Field;
    case 'function':
      return monaco.languages.CompletionItemKind.Function;
    case 'keyword':
      return monaco.languages.CompletionItemKind.Keyword;
  }
};

type SettingsDataModelFieldFormulaExpressionEditorProps = {
  expression: string;
  expectedFormulaValueType: FormulaValueType;
  fieldReferenceTypes: Record<string, FormulaValueType>;
  onChange: (expression: string) => void;
  disabled?: boolean;
};

export const SettingsDataModelFieldFormulaExpressionEditor = ({
  expression,
  expectedFormulaValueType,
  fieldReferenceTypes,
  onChange,
  disabled,
}: SettingsDataModelFieldFormulaExpressionEditorProps) => {
  const [monacoInstance, setMonacoInstance] = useState<Monaco | undefined>(
    undefined,
  );
  const [editorInstance, setEditorInstance] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);

  useEffect(() => {
    if (!isDefined(monacoInstance)) {
      return;
    }

    const completionProviderDisposable =
      monacoInstance.languages.registerCompletionItemProvider(
        TWENTY_FORMULA_LANGUAGE_ID,
        {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            return {
              suggestions: buildFormulaCompletionItems({
                fieldReferenceTypes,
              }).map((completionItem) => ({
                label: completionItem.label,
                kind: getMonacoCompletionItemKind(
                  monacoInstance,
                  completionItem.kind,
                ),
                insertText: completionItem.insertText,
                insertTextRules:
                  completionItem.kind === 'function'
                    ? monacoInstance.languages.CompletionItemInsertTextRule
                        .InsertAsSnippet
                    : undefined,
                detail: completionItem.detail,
                range,
              })),
            };
          },
        },
      );

    return () => {
      completionProviderDisposable.dispose();
    };
  }, [monacoInstance, fieldReferenceTypes]);

  useEffect(() => {
    if (!isDefined(monacoInstance) || !isDefined(editorInstance)) {
      return;
    }

    const model = editorInstance.getModel();

    if (!isDefined(model)) {
      return;
    }

    monacoInstance.editor.setModelMarkers(
      model,
      TWENTY_FORMULA_LANGUAGE_ID,
      getFormulaExpressionMarkers({
        expression,
        expectedFormulaValueType,
        fieldReferenceTypes,
      }),
    );
  }, [
    monacoInstance,
    editorInstance,
    expression,
    expectedFormulaValueType,
    fieldReferenceTypes,
  ]);

  return (
    <CodeEditor
      value={expression}
      language={TWENTY_FORMULA_LANGUAGE_ID}
      height={FORMULA_EXPRESSION_EDITOR_HEIGHT}
      onChange={onChange}
      onMount={(mountedEditor, mountedMonaco) => {
        registerTwentyFormulaLanguage(mountedMonaco);
        setMonacoInstance(mountedMonaco);
        setEditorInstance(mountedEditor);
      }}
      options={{
        readOnly: disabled,
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        wordWrap: 'on',
        renderLineHighlight: 'none',
      }}
    />
  );
};
