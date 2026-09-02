import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@camunda/design-system/styles.css';

import { App } from './App';
import './styles.css';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Application container not found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
