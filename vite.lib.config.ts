import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      cssFileName: 'style',
      entry: resolve('src/index.ts'),
      fileName: 'index',
      formats: [ 'es' ]
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@bpmn-io/cm-theme',
        '@bpmn-io/feel-editor',
        '@camunda/design-system',
        '@codemirror/autocomplete',
        '@codemirror/lang-json',
        '@codemirror/lint',
        '@codemirror/state',
        '@codemirror/view',
        'codemirror',
        'react',
        'react-dom/client',
        'react/jsx-runtime'
      ]
    }
  },
  plugins: [
    react(),
    dts({
      include: [ 'src' ],
      outDir: 'dist',
      rollupTypes: true
    })
  ]
});
