import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import bpmnIoPlugin from 'eslint-plugin-bpmn-io';

const files = {
  ignored: [
    'coverage',
    'dist',
    'node_modules'
  ],

  // the library, its tests and the example, all bundled for the browser
  browser: [
    'example/**/*.ts',
    'example/**/*.tsx',
    'src/**/*.ts',
    'src/**/*.tsx',
    'test/**/*.ts',
    'test/**/*.tsx'
  ],

  // build configuration and the example's dev server
  node: [
    '*.mjs',
    'vite.config.ts',
    'vite.lib.config.ts',
    'vite.test.config.ts',
    'example/server/**/*.ts'
  ],

  typescript: [
    '**/*.ts',
    '**/*.tsx'
  ],

  jsx: [
    '**/*.tsx'
  ]
};

export default [
  {
    ignores: files.ignored
  },

  ...bpmnIoPlugin.configs.browser.map(config => {
    return {
      ...config,
      files: files.browser
    };
  }),

  ...bpmnIoPlugin.configs.node.map(config => {
    return {
      ...config,
      files: files.node
    };
  }),

  ...bpmnIoPlugin.configs.jsx.map(config => {
    return {
      ...config,
      files: files.jsx
    };
  }),

  {
    files: files.jsx,
    settings: {
      react: { version: 'detect' }
    }
  },

  {
    files: files.typescript,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {

      // `npm run typecheck` reports undefined identifiers with full type
      // context; the core rules only see syntax and false-positive on
      // type-only references
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [ 'error', { argsIgnorePattern: '^_' } ]
    }
  }
];
