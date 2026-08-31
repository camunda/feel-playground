import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { clusterEvaluationProxy } from './example/server/clusterEvaluationProxy';

export default defineConfig({
  plugins: [
    react(),
    clusterEvaluationProxy()
  ]
});
