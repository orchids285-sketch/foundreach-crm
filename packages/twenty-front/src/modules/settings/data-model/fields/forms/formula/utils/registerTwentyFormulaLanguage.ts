import { type Monaco } from '@monaco-editor/react';
import { FORMULA_FUNCTIONS } from 'twenty-shared/utils';

import { FORMULA_KEYWORDS } from '@/settings/data-model/fields/forms/formula/constants/FormulaKeywords';
import { TWENTY_FORMULA_LANGUAGE_ID } from '@/settings/data-model/fields/forms/formula/constants/TwentyFormulaLanguageId';

export const registerTwentyFormulaLanguage = (monaco: Monaco) => {
  const isAlreadyRegistered = monaco.languages
    .getLanguages()
    .some((language) => language.id === TWENTY_FORMULA_LANGUAGE_ID);

  if (isAlreadyRegistered) {
    return;
  }

  monaco.languages.register({ id: TWENTY_FORMULA_LANGUAGE_ID });

  monaco.languages.setLanguageConfiguration(TWENTY_FORMULA_LANGUAGE_ID, {
    brackets: [['(', ')']],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    wordPattern: /[a-zA-Z_][a-zA-Z0-9_.]*/,
  });

  monaco.languages.setMonarchTokensProvider(TWENTY_FORMULA_LANGUAGE_ID, {
    ignoreCase: true,
    keywords: [...FORMULA_KEYWORDS, ...Object.keys(FORMULA_FUNCTIONS)],
    tokenizer: {
      root: [
        [
          /[a-zA-Z_][a-zA-Z0-9_.]*/,
          { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
        ],
        [/\d+(\.\d+)?/, 'number'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/!=|>=|<=|[+\-*/%=><]/, 'operator'],
        [/[(),]/, 'delimiter'],
      ],
    },
  });
};
